import {
  Prisma,
  StaffRole,
  UserKind,
  UserStatus,
  type User,
} from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppConfigService } from '../../config/app-config.service.js';
import type { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service.js';
import type { PasswordHasherService } from '../../infrastructure/security/password-hasher.service.js';
import type { EventBusPort } from '../../shared/kernel/ports/event-bus.port.js';
import { UsersService } from './users.service.js';

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'agent@fsf.sn',
    passwordHash: 'hash',
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

describe('UsersService', () => {
  let prisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    loginAttempt: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    refreshToken: {
      updateMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let passwordHasher: PasswordHasherService;
  let config: AppConfigService;
  let eventBus: EventBusPort;
  let service: UsersService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      loginAttempt: { findMany: vi.fn(), count: vi.fn() },
      refreshToken: { updateMany: vi.fn() },
      $transaction: vi.fn((ops: unknown[]) =>
        Promise.all(ops as Promise<unknown>[]),
      ),
    };
    passwordHasher = {
      hash: vi.fn().mockResolvedValue('new-hash'),
      verify: vi.fn(),
    } as unknown as PasswordHasherService;
    config = {
      auth: { maxFailedLoginAttempts: 5, lockoutDurationMinutes: 15 },
    } as unknown as AppConfigService;
    eventBus = { publish: vi.fn(), publishAll: vi.fn() };
    service = new UsersService(
      prisma as unknown as PrismaService,
      passwordHasher,
      config,
      eventBus,
    );
  });

  describe('updateStatus', () => {
    it("refuse qu'un administrateur modifie le statut de son propre compte", async () => {
      prisma.user.findUnique.mockResolvedValue(buildUser());

      await expect(
        service.updateStatus('user-1', UserStatus.SUSPENDED, 'user-1'),
      ).rejects.toMatchObject({ code: 'USER_CANNOT_MODIFY_SELF' });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('leve USER_NOT_FOUND si le compte cible est introuvable', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('missing', UserStatus.SUSPENDED, 'admin-1'),
      ).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
    });

    it('leve un verrouillage residuel lors de la reactivation', async () => {
      prisma.user.findUnique.mockResolvedValue(
        buildUser({ status: UserStatus.SUSPENDED }),
      );
      prisma.user.update.mockResolvedValue(
        buildUser({ status: UserStatus.ACTIVE }),
      );

      await service.updateStatus('user-1', UserStatus.ACTIVE, 'admin-1');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: UserStatus.ACTIVE,
            failedLoginAttempts: 0,
            lockedUntil: null,
          }),
        }),
      );
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateStaffUser', () => {
    it("refuse d'attribuer un role a un compte demandeur (kind REQUESTER)", async () => {
      prisma.user.findUnique.mockResolvedValue(
        buildUser({ kind: UserKind.REQUESTER, role: null }),
      );

      await expect(
        service.updateStaffUser(
          'user-1',
          { role: StaffRole.SUPERVISEUR },
          'admin-1',
        ),
      ).rejects.toMatchObject({ code: 'USER_ROLE_REQUIRES_STAFF_KIND' });
    });

    it('publie UserRoleUpdatedEvent uniquement si le role change reellement', async () => {
      const current = buildUser({ role: StaffRole.AGENT_CONTROLE });
      prisma.user.findUnique.mockResolvedValue(current);
      prisma.user.update.mockResolvedValue({
        ...current,
        role: StaffRole.SUPERVISEUR,
      });

      await service.updateStaffUser(
        'user-1',
        { role: StaffRole.SUPERVISEUR },
        'admin-1',
      );

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('ne publie rien si le role fourni est identique au role actuel', async () => {
      const current = buildUser({ role: StaffRole.AGENT_CONTROLE });
      prisma.user.findUnique.mockResolvedValue(current);
      prisma.user.update.mockResolvedValue(current);

      await service.updateStaffUser(
        'user-1',
        { role: StaffRole.AGENT_CONTROLE },
        'admin-1',
      );

      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('deleteStaffUser', () => {
    it('refuse la suppression de son propre compte', async () => {
      prisma.user.findUnique.mockResolvedValue(buildUser());

      await expect(
        service.deleteStaffUser('user-1', 'user-1'),
      ).rejects.toMatchObject({ code: 'USER_CANNOT_MODIFY_SELF' });
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it('traduit une violation de cle etrangere en USER_HAS_HISTORY', async () => {
      prisma.user.findUnique.mockResolvedValue(buildUser());
      prisma.user.delete.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('FK violation', {
          code: 'P2003',
          clientVersion: '6.19.3',
        }),
      );

      await expect(
        service.deleteStaffUser('user-1', 'admin-1'),
      ).rejects.toMatchObject({ code: 'USER_HAS_HISTORY' });
    });

    it('supprime et publie UserDeletedEvent quand aucun historique ne bloque', async () => {
      prisma.user.findUnique.mockResolvedValue(buildUser());
      prisma.user.delete.mockResolvedValue(buildUser());

      await service.deleteStaffUser('user-1', 'admin-1');

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('propage une erreur inattendue sans la transformer', async () => {
      prisma.user.findUnique.mockResolvedValue(buildUser());
      prisma.user.delete.mockRejectedValue(new Error('boom'));

      await expect(
        service.deleteStaffUser('user-1', 'admin-1'),
      ).rejects.toThrow('boom');
    });
  });

  describe('resetPassword', () => {
    it('leve USER_NOT_FOUND si le compte cible est introuvable', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.resetPassword('missing', 'NewPass123!', 'admin-1'),
      ).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('met a jour le hash, leve le verrouillage et revoque les sessions actives', async () => {
      prisma.user.findUnique.mockResolvedValue(buildUser());
      prisma.user.update.mockResolvedValue(buildUser());
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      await service.resetPassword('user-1', 'NewPass123!', 'admin-1');

      expect(passwordHasher.hash).toHaveBeenCalledWith('NewPass123!');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          passwordHash: 'new-hash',
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });
  });

  describe('recordFailedLogin', () => {
    it("n'atteint pas le verrouillage tant que le seuil n'est pas franchi", async () => {
      prisma.user.update.mockResolvedValue(
        buildUser({ failedLoginAttempts: 3 }),
      );

      const result = await service.recordFailedLogin('user-1');

      expect(result).toEqual({ locked: false });
      expect(prisma.user.update).toHaveBeenCalledTimes(1);
    });

    it('verrouille le compte des que le seuil configure est atteint', async () => {
      prisma.user.update
        .mockResolvedValueOnce(buildUser({ failedLoginAttempts: 5 }))
        .mockResolvedValueOnce(buildUser({ failedLoginAttempts: 5 }));

      const result = await service.recordFailedLogin('user-1');

      expect(result.locked).toBe(true);
      expect(result.lockedUntil).toBeInstanceOf(Date);
      expect(prisma.user.update).toHaveBeenCalledTimes(2);
      expect(prisma.user.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'user-1' },
        data: { lockedUntil: expect.any(Date) },
      });
    });
  });

  describe('recordSuccessfulLogin', () => {
    it('reinitialise le compteur et le verrouillage', async () => {
      prisma.user.update.mockResolvedValue(buildUser());

      await service.recordSuccessfulLogin('user-1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: expect.any(Date),
        },
      });
    });
  });
});
