import { Inject, Injectable } from '@nestjs/common';
import { type User, UserKind, UserStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service.js';
import { PasswordHasherService } from '../../infrastructure/security/password-hasher.service.js';
import { DomainError } from '../../shared/kernel/errors/domain.error.js';
import { ErrorCodes } from '../../shared/kernel/errors/error-catalog.js';
import {
  buildPageResult,
  toSkipTake,
  type PageResult,
} from '../../shared/kernel/application/pagination.js';
import {
  EVENT_BUS_PORT,
  type EventBusPort,
} from '../../shared/kernel/ports/event-bus.port.js';
import { UserAccountCreatedEvent } from './events/user.events.js';
import type { CreateStaffUserDto } from './dto/create-staff-user.dto.js';
import type { ListUsersDto } from './dto/list-users.dto.js';

export type SafeUser = Omit<User, 'passwordHash'>;

/** Jamais de `passwordHash` (meme le hash) au-dela de cette couche de service — cahier §28. */
const SAFE_USER_SELECT = {
  id: true,
  email: true,
  kind: true,
  role: true,
  status: true,
  mfaEnabled: true,
  displayName: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHasher: PasswordHasherService,
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
  ) {}

  /** Reserve a l'authentification (verification de mot de passe) — ne jamais exposer via l'API. */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async createRequesterAccount(email: string, password: string): Promise<User> {
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new DomainError(
        ErrorCodes.USER_EMAIL_ALREADY_USED,
        'Cette adresse e-mail est deja utilisee.',
        'CONFLICT',
      );
    }
    const passwordHash = await this.passwordHasher.hash(password);
    const user = await this.prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        kind: UserKind.REQUESTER,
        status: UserStatus.ACTIVE,
      },
    });
    this.eventBus.publish(
      new UserAccountCreatedEvent(user.id, user.email, user.kind),
    );
    return user;
  }

  async createStaffUser(dto: CreateStaffUserDto): Promise<SafeUser> {
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new DomainError(
        ErrorCodes.USER_EMAIL_ALREADY_USED,
        'Cette adresse e-mail est deja utilisee.',
        'CONFLICT',
      );
    }
    const passwordHash = await this.passwordHasher.hash(dto.temporaryPassword);
    return this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        kind: UserKind.STAFF,
        role: dto.role,
        status: UserStatus.ACTIVE,
        displayName: dto.displayName,
      },
      select: SAFE_USER_SELECT,
    });
  }

  /** Permet a un agent de personnaliser son nom affiche (ex. sur les journaux de scan). */
  async updateOwnDisplayName(
    id: string,
    displayName: string,
  ): Promise<SafeUser> {
    return this.prisma.user.update({
      where: { id },
      data: { displayName },
      select: SAFE_USER_SELECT,
    });
  }

  async updateStatus(id: string, status: UserStatus): Promise<SafeUser> {
    const user = await this.findById(id);
    if (!user) {
      throw new DomainError(
        ErrorCodes.USER_NOT_FOUND,
        'Utilisateur introuvable.',
        'NOT_FOUND',
      );
    }
    return this.prisma.user.update({
      where: { id },
      data: { status },
      select: SAFE_USER_SELECT,
    });
  }

  async touchLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  async list(query: ListUsersDto): Promise<PageResult<SafeUser>> {
    const page = { page: query.page, pageSize: query.pageSize };
    const where = {
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: SAFE_USER_SELECT,
        ...toSkipTake(page),
      }),
      this.prisma.user.count({ where }),
    ]);
    return buildPageResult(items, total, page);
  }
}
