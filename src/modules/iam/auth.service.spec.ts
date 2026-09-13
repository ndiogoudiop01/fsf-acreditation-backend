import type { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { StaffRole, UserKind, UserStatus, type User } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppConfigService } from '../../config/app-config.service.js';
import type { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service.js';
import type { PasswordHasherService } from '../../infrastructure/security/password-hasher.service.js';
import type { TokenHasherService } from '../../infrastructure/security/token-hasher.service.js';
import type { EventBusPort } from '../../shared/kernel/ports/event-bus.port.js';
import type { RequesterProfilesFacade } from '../media/media.facade.js';
import { AuthService } from './auth.service.js';
import type { UsersService } from './users.service.js';

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'agent@fsf.sn',
    passwordHash: 'hashed',
    kind: UserKind.STAFF,
    role: StaffRole.AGENT_CONTROLE,
    status: UserStatus.ACTIVE,
    mfaEnabled: false,
    displayName: null,
    lastLoginAt: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

describe('AuthService.login', () => {
  let users: {
    findByEmail: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    recordFailedLogin: ReturnType<typeof vi.fn>;
    recordSuccessfulLogin: ReturnType<typeof vi.fn>;
  };
  let passwordHasher: PasswordHasherService;
  let jwtService: JwtService;
  let tokenHasher: TokenHasherService;
  let prisma: { refreshToken: { create: ReturnType<typeof vi.fn> } };
  let config: AppConfigService;
  let requesterProfiles: RequesterProfilesFacade;
  let eventBus: EventBusPort;
  let service: AuthService;

  beforeEach(() => {
    users = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      recordFailedLogin: vi.fn().mockResolvedValue({ locked: false }),
      recordSuccessfulLogin: vi.fn().mockResolvedValue(undefined),
    };
    passwordHasher = {
      hash: vi.fn(),
      verify: vi.fn(),
    } as unknown as PasswordHasherService;
    jwtService = {
      signAsync: vi.fn().mockResolvedValue('signed-jwt'),
    } as unknown as JwtService;
    tokenHasher = {
      generateOpaqueToken: vi.fn().mockReturnValue('opaque-refresh-token'),
      hash: vi.fn().mockReturnValue('hashed-token'),
      verify: vi.fn(),
    } as unknown as TokenHasherService;
    prisma = { refreshToken: { create: vi.fn().mockResolvedValue({}) } };
    config = {
      auth: {
        accessSecret: 'secret',
        accessTtl: '15m',
        refreshTtl: '30d',
      },
    } as unknown as AppConfigService;
    requesterProfiles = {
      createProfile: vi.fn(),
      findByUserId: vi.fn().mockResolvedValue(null),
      listByMediaId: vi.fn(),
    };
    eventBus = { publish: vi.fn(), publishAll: vi.fn() };

    service = new AuthService(
      users as unknown as UsersService,
      jwtService,
      passwordHasher,
      tokenHasher,
      prisma as unknown as PrismaService,
      config,
      requesterProfiles,
      eventBus,
    );
  });

  it('refuse la connexion et journalise un echec quand le compte est verrouille', async () => {
    const lockedUntil = new Date(Date.now() + 60_000);
    users.findByEmail.mockResolvedValue(buildUser({ lockedUntil }));

    await expect(
      service.login('agent@fsf.sn', 'whatever', { ipAddress: '1.2.3.4' }),
    ).rejects.toMatchObject({ code: 'ACCOUNT_LOCKED' });
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(users.recordFailedLogin).not.toHaveBeenCalled();
  });

  it('laisse passer une connexion apres expiration du verrouillage', async () => {
    const lockedUntil = new Date(Date.now() - 60_000);
    const user = buildUser({ lockedUntil });
    users.findByEmail.mockResolvedValue(user);
    (passwordHasher.verify as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const result = await service.login('agent@fsf.sn', 'correct-password');

    expect(result.accessToken).toBe('signed-jwt');
    expect(users.recordSuccessfulLogin).toHaveBeenCalledWith('user-1');
  });

  it("incremente le compteur d'echecs sur mot de passe invalide", async () => {
    const user = buildUser();
    users.findByEmail.mockResolvedValue(user);
    (passwordHasher.verify as ReturnType<typeof vi.fn>).mockResolvedValue(
      false,
    );

    await expect(
      service.login('agent@fsf.sn', 'wrong-password'),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(users.recordFailedLogin).toHaveBeenCalledWith('user-1');
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
  });

  it("ne tente pas d'incrementer un compteur pour un email inconnu", async () => {
    users.findByEmail.mockResolvedValue(null);

    await expect(
      service.login('inconnu@fsf.sn', 'whatever'),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(users.recordFailedLogin).not.toHaveBeenCalled();
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
  });

  it("refuse la connexion pour un compte inactif sans toucher au compteur d'echecs", async () => {
    const user = buildUser({ status: UserStatus.SUSPENDED });
    users.findByEmail.mockResolvedValue(user);
    (passwordHasher.verify as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    await expect(
      service.login('agent@fsf.sn', 'correct-password'),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(users.recordFailedLogin).not.toHaveBeenCalled();
    expect(users.recordSuccessfulLogin).not.toHaveBeenCalled();
  });

  it('connecte avec succes, reinitialise le compteur et journalise IP/appareil du refresh token', async () => {
    const user = buildUser();
    users.findByEmail.mockResolvedValue(user);
    (passwordHasher.verify as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    await service.login('agent@fsf.sn', 'correct-password', {
      ipAddress: '10.0.0.1',
      userAgent: 'TestAgent/1.0',
    });

    expect(users.recordSuccessfulLogin).toHaveBeenCalledWith('user-1');
    expect(prisma.refreshToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        createdByIp: '10.0.0.1',
        userAgent: 'TestAgent/1.0',
      }),
    });
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
  });
});

describe('AuthService.refresh', () => {
  it('rejette un jeton de rafraichissement inconnu', async () => {
    const users = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      recordFailedLogin: vi.fn(),
      recordSuccessfulLogin: vi.fn(),
    };
    const tokenHasher = {
      generateOpaqueToken: vi.fn(),
      hash: vi.fn().mockReturnValue('hashed'),
      verify: vi.fn(),
    } as unknown as TokenHasherService;
    const prisma = {
      refreshToken: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
      },
    };
    const service = new AuthService(
      users as unknown as UsersService,
      { signAsync: vi.fn() } as unknown as JwtService,
      { hash: vi.fn(), verify: vi.fn() } as unknown as PasswordHasherService,
      tokenHasher,
      prisma as unknown as PrismaService,
      { auth: {} } as unknown as AppConfigService,
      { createProfile: vi.fn(), findByUserId: vi.fn(), listByMediaId: vi.fn() },
      { publish: vi.fn(), publishAll: vi.fn() },
    );

    await expect(service.refresh('bogus-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
