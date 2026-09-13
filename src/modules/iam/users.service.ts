import { Inject, Injectable } from '@nestjs/common';
import { Prisma, type User, UserKind, UserStatus } from '@prisma/client';
import { AppConfigService } from '../../config/app-config.service.js';
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
import {
  UserAccountCreatedEvent,
  UserDeletedEvent,
  UserRoleUpdatedEvent,
  UserStatusUpdatedEvent,
} from './events/user.events.js';
import type { CreateStaffUserDto } from './dto/create-staff-user.dto.js';
import type { ListUsersDto } from './dto/list-users.dto.js';
import type { UpdateStaffUserDto } from './dto/update-staff-user.dto.js';
import type { ListLoginAttemptsDto } from './dto/list-login-attempts.dto.js';

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
  failedLoginAttempts: true,
  lockedUntil: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHasher: PasswordHasherService,
    private readonly config: AppConfigService,
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

  async getById(id: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: SAFE_USER_SELECT,
    });
    if (!user) {
      throw new DomainError(
        ErrorCodes.USER_NOT_FOUND,
        'Utilisateur introuvable.',
        'NOT_FOUND',
      );
    }
    return user;
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

  async createStaffUser(
    dto: CreateStaffUserDto,
    actorId: string,
  ): Promise<SafeUser> {
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new DomainError(
        ErrorCodes.USER_EMAIL_ALREADY_USED,
        'Cette adresse e-mail est deja utilisee.',
        'CONFLICT',
      );
    }
    const passwordHash = await this.passwordHasher.hash(dto.temporaryPassword);
    const user = await this.prisma.user.create({
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
    this.eventBus.publish(
      new UserAccountCreatedEvent(
        user.id,
        user.email,
        user.kind,
        user.role,
        actorId,
      ),
    );
    return user;
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

  /** Modification par un administrateur : role (droits d'acces) et/ou nom affiche (cahier §23). */
  async updateStaffUser(
    id: string,
    dto: UpdateStaffUserDto,
    actorId: string,
  ): Promise<SafeUser> {
    const user = await this.findById(id);
    if (!user) {
      throw new DomainError(
        ErrorCodes.USER_NOT_FOUND,
        'Utilisateur introuvable.',
        'NOT_FOUND',
      );
    }
    if (dto.role && user.kind !== UserKind.STAFF) {
      throw new DomainError(
        'USER_ROLE_REQUIRES_STAFF_KIND',
        'Seul un compte interne (STAFF) peut se voir attribuer un role.',
        'VALIDATION',
      );
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.role ? { role: dto.role } : {}),
        ...(dto.displayName !== undefined
          ? { displayName: dto.displayName }
          : {}),
      },
      select: SAFE_USER_SELECT,
    });

    if (dto.role && dto.role !== user.role) {
      this.eventBus.publish(
        new UserRoleUpdatedEvent(id, user.role, dto.role, actorId),
      );
    }
    return updated;
  }

  async updateStatus(
    id: string,
    status: UserStatus,
    actorId: string,
  ): Promise<SafeUser> {
    const user = await this.findById(id);
    if (!user) {
      throw new DomainError(
        ErrorCodes.USER_NOT_FOUND,
        'Utilisateur introuvable.',
        'NOT_FOUND',
      );
    }
    if (id === actorId) {
      throw new DomainError(
        ErrorCodes.USER_CANNOT_MODIFY_SELF,
        'Vous ne pouvez pas modifier le statut de votre propre compte.',
        'FORBIDDEN',
      );
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        status,
        // Une reactivation leve aussi un eventuel verrouillage residuel :
        // sinon un compte reactive resterait bloque jusqu'a expiration du
        // compteur d'echecs precedent.
        ...(status === UserStatus.ACTIVE
          ? { failedLoginAttempts: 0, lockedUntil: null }
          : {}),
      },
      select: SAFE_USER_SELECT,
    });

    this.eventBus.publish(
      new UserStatusUpdatedEvent(id, user.status, status, actorId),
    );
    return updated;
  }

  /**
   * Suppression definitive, reservee aux comptes sans historique (jamais
   * connectes, aucune action journalisee) : les contraintes de cle etrangere
   * (documents traites, decisions, scans...) protegent naturellement contre
   * la perte d'un historique d'audit. Dans tous les autres cas, desactiver
   * le compte (`updateStatus`) est le chemin attendu.
   */
  async deleteStaffUser(id: string, actorId: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new DomainError(
        ErrorCodes.USER_NOT_FOUND,
        'Utilisateur introuvable.',
        'NOT_FOUND',
      );
    }
    if (id === actorId) {
      throw new DomainError(
        ErrorCodes.USER_CANNOT_MODIFY_SELF,
        'Vous ne pouvez pas supprimer votre propre compte.',
        'FORBIDDEN',
      );
    }

    try {
      await this.prisma.user.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new DomainError(
          ErrorCodes.USER_HAS_HISTORY,
          "Cet utilisateur a un historique d'activite (documents, decisions, scans...) et ne peut pas etre supprime — desactivez-le plutot.",
          'CONFLICT',
        );
      }
      throw error;
    }

    this.eventBus.publish(new UserDeletedEvent(id, user.email, actorId));
  }

  /** Reinitialise le compteur d'echecs a chaque connexion reussie (cahier §24). */
  async recordSuccessfulLogin(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });
  }

  /**
   * Incremente le compteur d'echecs et verrouille temporairement le compte
   * au-dela du seuil configure (cahier §24, protection brute force).
   */
  async recordFailedLogin(
    id: string,
  ): Promise<{ locked: boolean; lockedUntil?: Date }> {
    const { maxFailedLoginAttempts, lockoutDurationMinutes } = this.config.auth;
    const user = await this.prisma.user.update({
      where: { id },
      data: { failedLoginAttempts: { increment: 1 } },
    });

    if (user.failedLoginAttempts < maxFailedLoginAttempts) {
      return { locked: false };
    }

    const lockedUntil = new Date(Date.now() + lockoutDurationMinutes * 60_000);
    await this.prisma.user.update({
      where: { id },
      data: { lockedUntil },
    });
    return { locked: true, lockedUntil };
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

  /** Traçabilite des connexions pour un utilisateur donne (cahier §24). */
  async listLoginAttemptsForUser(userId: string, query: ListLoginAttemptsDto) {
    const page = { page: query.page, pageSize: query.pageSize };
    const where = { userId };
    const [items, total] = await Promise.all([
      this.prisma.loginAttempt.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...toSkipTake(page),
      }),
      this.prisma.loginAttempt.count({ where }),
    ]);
    return buildPageResult(items, total, page);
  }

  /** Vue transversale (tous utilisateurs) pour la supervision securite. */
  async listLoginAttempts(query: ListLoginAttemptsDto) {
    const page = { page: query.page, pageSize: query.pageSize };
    const where = {
      ...(query.email ? { email: query.email.toLowerCase() } : {}),
      ...(query.succeeded !== undefined ? { succeeded: query.succeeded } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.loginAttempt.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...toSkipTake(page),
      }),
      this.prisma.loginAttempt.count({ where }),
    ]);
    return buildPageResult(items, total, page);
  }
}
