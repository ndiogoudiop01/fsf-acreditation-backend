import {
  RequestStatus,
  type AccreditationRequest,
  type RequestComplement,
} from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../../../infrastructure/persistence/prisma/prisma.service.js';
import { ResolveComplementUseCase } from './resolve-complement.usecase.js';

function buildRequest(
  overrides: Partial<AccreditationRequest> = {},
): AccreditationRequest {
  return {
    id: 'req-1',
    status: RequestStatus.INFO_REQUESTED,
    requesterId: 'requester-1',
    ...overrides,
  } as AccreditationRequest;
}

function buildComplement(
  overrides: Partial<RequestComplement> = {},
): RequestComplement {
  return {
    id: 'complement-1',
    requestId: 'req-1',
    resolvedAt: null,
    ...overrides,
  } as RequestComplement;
}

describe('ResolveComplementUseCase', () => {
  let prisma: {
    accreditationRequest: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    requestComplement: {
      findUnique: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let useCase: ResolveComplementUseCase;

  beforeEach(() => {
    prisma = {
      accreditationRequest: { findUnique: vi.fn(), update: vi.fn() },
      requestComplement: {
        findUnique: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn((ops: unknown[]) =>
        Promise.all(ops as Promise<unknown>[]),
      ),
    };
    useCase = new ResolveComplementUseCase(prisma as unknown as PrismaService);
  });

  it('leve REQUEST_NOT_FOUND quand la demande appartient a un autre demandeur', async () => {
    prisma.accreditationRequest.findUnique.mockResolvedValue(
      buildRequest({ requesterId: 'someone-else' }),
    );

    await expect(
      useCase.execute({
        requestId: 'req-1',
        complementId: 'complement-1',
        requesterId: 'requester-1',
      }),
    ).rejects.toMatchObject({ code: 'REQUEST_NOT_FOUND' });
  });

  it('leve COMPLEMENT_NOT_FOUND quand le complement ne correspond pas a la demande', async () => {
    prisma.accreditationRequest.findUnique.mockResolvedValue(buildRequest());
    prisma.requestComplement.findUnique.mockResolvedValue(
      buildComplement({ requestId: 'autre-demande' }),
    );

    await expect(
      useCase.execute({
        requestId: 'req-1',
        complementId: 'complement-1',
        requesterId: 'requester-1',
      }),
    ).rejects.toMatchObject({ code: 'COMPLEMENT_NOT_FOUND' });
  });

  it('repasse la demande en UNDER_REVIEW quand tous les complements sont resolus', async () => {
    prisma.accreditationRequest.findUnique.mockResolvedValue(buildRequest());
    prisma.requestComplement.findUnique.mockResolvedValue(buildComplement());
    prisma.requestComplement.update.mockResolvedValue(
      buildComplement({ resolvedAt: new Date() }),
    );
    prisma.requestComplement.count.mockResolvedValue(0);
    prisma.accreditationRequest.update.mockResolvedValue({});

    await useCase.execute({
      requestId: 'req-1',
      complementId: 'complement-1',
      requesterId: 'requester-1',
    });

    expect(prisma.accreditationRequest.update).toHaveBeenCalledWith({
      where: { id: 'req-1' },
      data: { status: RequestStatus.UNDER_REVIEW },
    });
  });

  it("laisse la demande en INFO_REQUESTED s'il reste des complements ouverts", async () => {
    prisma.accreditationRequest.findUnique.mockResolvedValue(buildRequest());
    prisma.requestComplement.findUnique.mockResolvedValue(buildComplement());
    prisma.requestComplement.update.mockResolvedValue(
      buildComplement({ resolvedAt: new Date() }),
    );
    prisma.requestComplement.count.mockResolvedValue(1);

    await useCase.execute({
      requestId: 'req-1',
      complementId: 'complement-1',
      requesterId: 'requester-1',
    });

    expect(prisma.accreditationRequest.update).not.toHaveBeenCalled();
  });
});
