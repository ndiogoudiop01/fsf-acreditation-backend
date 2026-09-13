import { Injectable } from '@nestjs/common';
import type { AuditLog } from '@prisma/client';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service.js';
import {
  buildPageResult,
  toSkipTake,
  type PageResult,
} from '../../shared/kernel/application/pagination.js';

export interface RecordAuditInput {
  actorId?: string;
  actorRole?: string;
  action: string;
  objectType: string;
  objectId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  deviceInfo?: string;
  result?: string;
  reason?: string;
}

export interface ListAuditDto {
  page: number;
  pageSize: number;
  objectType?: string;
  objectId?: string;
}

/** Journal d'audit transversal (cahier §24). Ecriture uniquement via evenements de domaine. */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordAuditInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        actorRole: input.actorRole,
        action: input.action,
        objectType: input.objectType,
        objectId: input.objectId,
        oldValue: toJson(input.oldValue),
        newValue: toJson(input.newValue),
        deviceInfo: input.deviceInfo,
        result: input.result,
        reason: input.reason,
      },
    });
  }

  async list(query: ListAuditDto): Promise<PageResult<AuditLog>> {
    const page = { page: query.page, pageSize: query.pageSize };
    const where = {
      ...(query.objectType ? { objectType: query.objectType } : {}),
      ...(query.objectId ? { objectId: query.objectId } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...toSkipTake(page),
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return buildPageResult(items, total, page);
  }
}

function toJson(value: unknown): object | undefined {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(JSON.stringify(value)) as object;
}
