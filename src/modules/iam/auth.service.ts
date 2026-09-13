import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserStatus, type User } from '@prisma/client';
import { AppConfigService } from '../../config/app-config.service.js';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service.js';
import { PasswordHasherService } from '../../infrastructure/security/password-hasher.service.js';
import { TokenHasherService } from '../../infrastructure/security/token-hasher.service.js';
import { DomainError } from '../../shared/kernel/errors/domain.error.js';
import { ErrorCodes } from '../../shared/kernel/errors/error-catalog.js';
import { permissionsForRole } from '../../shared/kernel/permissions/permission-catalog.js';
import {
  EVENT_BUS_PORT,
  type EventBusPort,
} from '../../shared/kernel/ports/event-bus.port.js';
import type { AuthenticatedUser } from '../../shared/kernel/types/authenticated-user.js';
import {
  REQUESTER_PROFILES_FACADE,
  type RequesterProfilesFacade,
} from '../media/media.facade.js';
import {
  UserLoginFailedEvent,
  UserLoginSucceededEvent,
} from './events/user.events.js';
import { UsersService } from './users.service.js';

export interface LoginContext {
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwtService: JwtService,
    private readonly passwordHasher: PasswordHasherService,
    private readonly tokenHasher: TokenHasherService,
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    @Inject(REQUESTER_PROFILES_FACADE)
    private readonly requesterProfiles: RequesterProfilesFacade,
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
  ) {}

  async login(
    email: string,
    password: string,
    context: LoginContext = {},
  ): Promise<AuthTokens & { user: AuthenticatedUser }> {
    const user = await this.users.findByEmail(email);

    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      this.eventBus.publish(
        new UserLoginFailedEvent(
          email,
          'ACCOUNT_LOCKED',
          context.ipAddress,
          context.userAgent,
          user.id,
        ),
      );
      throw new DomainError(
        ErrorCodes.ACCOUNT_LOCKED,
        `Compte temporairement verrouille suite a plusieurs echecs de connexion. Reessayez apres ${user.lockedUntil.toISOString()}.`,
        'FORBIDDEN',
      );
    }

    const passwordValid =
      !!user && (await this.passwordHasher.verify(user.passwordHash, password));
    if (!user || !passwordValid) {
      if (user) await this.users.recordFailedLogin(user.id);
      this.eventBus.publish(
        new UserLoginFailedEvent(
          email,
          'INVALID_CREDENTIALS',
          context.ipAddress,
          context.userAgent,
          user?.id,
        ),
      );
      throw new DomainError(
        ErrorCodes.INVALID_CREDENTIALS,
        'Identifiants invalides.',
        'UNAUTHORIZED',
      );
    }
    if (user.status !== UserStatus.ACTIVE) {
      this.eventBus.publish(
        new UserLoginFailedEvent(
          email,
          'ACCOUNT_INACTIVE',
          context.ipAddress,
          context.userAgent,
          user.id,
        ),
      );
      throw new DomainError(
        ErrorCodes.INVALID_CREDENTIALS,
        "Ce compte n'est pas actif.",
        'FORBIDDEN',
      );
    }

    await this.users.recordSuccessfulLogin(user.id);
    this.eventBus.publish(
      new UserLoginSucceededEvent(
        user.id,
        user.email,
        user.id,
        context.ipAddress,
        context.userAgent,
      ),
    );
    const tokens = await this.issueTokens(user, context);
    return { ...tokens, user: await this.toAuthenticatedUser(user) };
  }

  async refresh(
    refreshToken: string,
    context: LoginContext = {},
  ): Promise<AuthTokens> {
    const tokenHash = this.tokenHasher.hash(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException(
        'Jeton de rafraichissement invalide ou expire.',
      );
    }
    const user = await this.users.findById(stored.userId);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Compte introuvable ou inactif.');
    }
    // Rotation : l'ancien jeton est revoque des qu'il sert, pour detecter un rejeu.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(user, context);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.tokenHasher.hash(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async toAuthenticatedUser(user: User): Promise<AuthenticatedUser> {
    const requesterProfile =
      user.kind === 'REQUESTER'
        ? await this.requesterProfiles.findByUserId(user.id)
        : null;
    return {
      id: user.id,
      email: user.email,
      kind: user.kind,
      role: user.role,
      requesterProfileId: requesterProfile?.id,
      permissions: permissionsForRole(user.role),
    };
  }

  private async issueTokens(
    user: User,
    context: LoginContext = {},
  ): Promise<AuthTokens> {
    const { accessSecret, accessTtl, refreshTtl } = this.config.auth;

    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, kind: user.kind, role: user.role },
      // `expiresIn` accepte "15m"/"30d" au format string au runtime (librairie
      // `jsonwebtoken`) ; le typage `StringValue` de `@types/jsonwebtoken` est
      // plus strict que notre `AppConfigService.auth.accessTtl` (string valide
      // par Zod), d'ou l'assertion ciblee.
      { secret: accessSecret, expiresIn: accessTtl as unknown as number },
    );

    const refreshToken = this.tokenHasher.generateOpaqueToken();
    const tokenHash = this.tokenHasher.hash(refreshToken);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: addDuration(new Date(), refreshTtl),
        createdByIp: context.ipAddress,
        userAgent: context.userAgent,
      },
    });

    return { accessToken, refreshToken, expiresIn: accessTtl };
  }
}

/** Ajoute une duree exprimee comme "15m", "30d", "1h" a une date. */
function addDuration(base: Date, duration: string): Date {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());
  if (!match) return new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
  const value = Number(match[1]);
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[
    match[2] as 's' | 'm' | 'h' | 'd'
  ];
  return new Date(base.getTime() + value * unitMs);
}
