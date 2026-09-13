import {
  AccreditationStatus,
  ScanResult,
  ScanSource,
  type Accreditation,
} from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service.js';
import type { TokenHasherService } from '../../infrastructure/security/token-hasher.service.js';
import type { AccreditationsFacade } from '../accreditations/accreditations.facade.js';
import { AccessControlService } from './access-control.service.js';

function buildDetail(overrides: Record<string, unknown> = {}) {
  return {
    id: 'accred-1',
    status: AccreditationStatus.ACTIVE,
    revocationReason: null,
    expiresAt: new Date(Date.now() + 60_000),
    zones: [{ zoneId: 'zone-1', zone: { label: 'Tribune presse' } }],
    request: {
      matchId: 'match-1',
      categoryRequested: { label: 'MEDIA' },
      requester: {
        firstName: 'Aminata',
        lastName: 'Diallo',
        media: { name: 'RTS' },
      },
    },
    ...overrides,
  };
}

describe('AccessControlService', () => {
  let prisma: {
    accreditation: {
      findUniqueOrThrow: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
    };
    scanLog: {
      count: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
    };
  };
  let tokenHasher: TokenHasherService;
  let accreditations: AccreditationsFacade;
  let service: AccessControlService;

  beforeEach(() => {
    prisma = {
      accreditation: { findUniqueOrThrow: vi.fn(), findUnique: vi.fn() },
      scanLog: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue({}),
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    };
    tokenHasher = {
      hash: vi.fn().mockReturnValue('hashed-token'),
    } as unknown as TokenHasherService;
    accreditations = {
      generateAccreditation: vi.fn(),
      findByRawToken: vi.fn(),
    };
    service = new AccessControlService(
      prisma as unknown as PrismaService,
      tokenHasher,
      accreditations,
    );
  });

  it('renvoie INVALID et journalise sans accreditation quand le jeton est inconnu', async () => {
    (
      accreditations.findByRawToken as ReturnType<typeof vi.fn>
    ).mockResolvedValue(null);

    const verdict = await service.verifyScan(
      { token: 'bogus', matchId: 'match-1', deviceId: 'device-1' },
      'agent-1',
    );

    expect(verdict.result).toBe(ScanResult.INVALID);
    expect(prisma.scanLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          accreditationId: null,
          result: ScanResult.INVALID,
          source: ScanSource.ONLINE,
        }),
      }),
    );
  });

  it('renvoie VALID avec les details de badge pour une accreditation active et dans le perimetre', async () => {
    (
      accreditations.findByRawToken as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: 'accred-1',
    } as Accreditation);
    prisma.accreditation.findUniqueOrThrow.mockResolvedValue(buildDetail());

    const verdict = await service.verifyScan(
      {
        token: 'good-token',
        matchId: 'match-1',
        zoneId: 'zone-1',
        deviceId: 'device-1',
      },
      'agent-1',
    );

    expect(verdict.result).toBe(ScanResult.VALID);
    expect(verdict.accreditation).toEqual({
      requesterName: 'Aminata Diallo',
      mediaName: 'RTS',
      categoryLabel: 'MEDIA',
      zones: ['Tribune presse'],
      expiresAt: expect.any(String),
    });
  });

  it('renvoie REVOKED avec le motif de revocation', async () => {
    (
      accreditations.findByRawToken as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: 'accred-1',
    } as Accreditation);
    prisma.accreditation.findUniqueOrThrow.mockResolvedValue(
      buildDetail({
        status: AccreditationStatus.REVOKED,
        revocationReason: 'Carte de presse invalide',
      }),
    );

    const verdict = await service.verifyScan(
      { token: 'good-token', matchId: 'match-1', deviceId: 'device-1' },
      'agent-1',
    );

    expect(verdict).toMatchObject({
      result: ScanResult.REVOKED,
      reason: 'Carte de presse invalide',
    });
  });

  it("renvoie EXPIRED quand la date d'expiration est depassee, meme si le statut est ACTIVE", async () => {
    (
      accreditations.findByRawToken as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: 'accred-1',
    } as Accreditation);
    prisma.accreditation.findUniqueOrThrow.mockResolvedValue(
      buildDetail({ expiresAt: new Date(Date.now() - 1000) }),
    );

    const verdict = await service.verifyScan(
      { token: 'good-token', matchId: 'match-1', deviceId: 'device-1' },
      'agent-1',
    );

    expect(verdict.result).toBe(ScanResult.EXPIRED);
  });

  it("renvoie OUT_OF_SCOPE quand l'accreditation concerne un autre match", async () => {
    (
      accreditations.findByRawToken as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: 'accred-1',
    } as Accreditation);
    prisma.accreditation.findUniqueOrThrow.mockResolvedValue(buildDetail());

    const verdict = await service.verifyScan(
      { token: 'good-token', matchId: 'autre-match', deviceId: 'device-1' },
      'agent-1',
    );

    expect(verdict.result).toBe(ScanResult.OUT_OF_SCOPE);
  });

  it("renvoie OUT_OF_SCOPE quand la zone scannee n'est pas couverte par le badge", async () => {
    (
      accreditations.findByRawToken as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: 'accred-1',
    } as Accreditation);
    prisma.accreditation.findUniqueOrThrow.mockResolvedValue(buildDetail());

    const verdict = await service.verifyScan(
      {
        token: 'good-token',
        matchId: 'match-1',
        zoneId: 'autre-zone',
        deviceId: 'device-1',
      },
      'agent-1',
    );

    expect(verdict.result).toBe(ScanResult.OUT_OF_SCOPE);
  });

  it('renvoie ALREADY_USED quand un scan VALID existe deja pour cette zone', async () => {
    (
      accreditations.findByRawToken as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: 'accred-1',
    } as Accreditation);
    prisma.accreditation.findUniqueOrThrow.mockResolvedValue(buildDetail());
    prisma.scanLog.count.mockResolvedValue(1);

    const verdict = await service.verifyScan(
      {
        token: 'good-token',
        matchId: 'match-1',
        zoneId: 'zone-1',
        deviceId: 'device-1',
      },
      'agent-1',
    );

    expect(verdict.result).toBe(ScanResult.ALREADY_USED);
    expect(verdict.accreditation).toBeUndefined();
  });

  describe('syncOfflineScans', () => {
    it('ignore les scans deja synchronises (idempotence) et insere les nouveaux', async () => {
      prisma.scanLog.findFirst
        .mockResolvedValueOnce({ id: 'existing-scan' })
        .mockResolvedValueOnce(null);
      prisma.accreditation.findUnique.mockResolvedValue({
        qrTokenHash: 'hash-1',
      });

      const result = await service.syncOfflineScans(
        [
          {
            accreditationId: 'a1',
            deviceId: 'device-1',
            matchId: 'match-1',
            zoneId: 'zone-1',
            result: ScanResult.VALID,
            scannedAt: new Date().toISOString(),
            gate: undefined,
          },
          {
            accreditationId: 'a2',
            deviceId: 'device-1',
            matchId: 'match-1',
            zoneId: 'zone-1',
            result: ScanResult.VALID,
            scannedAt: new Date().toISOString(),
            gate: undefined,
          },
        ],
        'agent-1',
      );

      expect(result).toEqual({ inserted: 1, skipped: 1 });
      expect(prisma.scanLog.create).toHaveBeenCalledTimes(1);
    });
  });
});
