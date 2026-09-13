import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MatchStatus, Prisma, type Match } from '@prisma/client';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service.js';
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
import { CompetitionsService } from './competitions.service.js';
import type { CreateMatchDto } from './dto/create-match.dto.js';
import type { UpdateMatchDto } from './dto/update-match.dto.js';
import type { ListMatchesDto } from './dto/list-matches.dto.js';
import {
  MatchRequestsClosedEvent,
  MatchUpdatedEvent,
} from './events/match.events.js';

/** Champs dont la modification impacte des demandes en cours (cahier §6). */
const IMPACTFUL_FIELDS = [
  'kickoffAt',
  'stadium',
  'city',
  'status',
  'requestsCloseAt',
] as const;

@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly competitions: CompetitionsService,
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
  ) {}

  async create(dto: CreateMatchDto): Promise<Match> {
    await this.competitions.get(dto.competitionId);
    return this.prisma.match.create({
      data: {
        ...dto,
        kickoffAt: new Date(dto.kickoffAt),
        requestsOpenAt: dto.requestsOpenAt
          ? new Date(dto.requestsOpenAt)
          : undefined,
        requestsCloseAt: dto.requestsCloseAt
          ? new Date(dto.requestsCloseAt)
          : undefined,
        operationalContacts: dto.operationalContacts as
          Prisma.InputJsonValue | undefined,
      },
    });
  }

  async get(id: string): Promise<Match> {
    const match = await this.prisma.match.findUnique({ where: { id } });
    if (!match) {
      throw new DomainError(
        ErrorCodes.MATCH_NOT_FOUND,
        'Match introuvable.',
        'NOT_FOUND',
      );
    }
    return match;
  }

  async update(id: string, dto: UpdateMatchDto): Promise<Match> {
    const existing = await this.get(id);
    const updated = await this.prisma.match.update({
      where: { id },
      data: {
        ...dto,
        kickoffAt: dto.kickoffAt ? new Date(dto.kickoffAt) : undefined,
        requestsOpenAt: dto.requestsOpenAt
          ? new Date(dto.requestsOpenAt)
          : undefined,
        requestsCloseAt: dto.requestsCloseAt
          ? new Date(dto.requestsCloseAt)
          : undefined,
        operationalContacts: dto.operationalContacts as
          Prisma.InputJsonValue | undefined,
      },
    });

    const changedFields = IMPACTFUL_FIELDS.filter(
      (field) =>
        dto[field] !== undefined &&
        String(existing[field]) !== String(updated[field]),
    );
    if (changedFields.length > 0) {
      this.eventBus.publish(new MatchUpdatedEvent(id, changedFields));
    }
    return updated;
  }

  async list(query: ListMatchesDto): Promise<PageResult<Match>> {
    const page = { page: query.page, pageSize: query.pageSize };
    const where = {
      ...(query.competitionId ? { competitionId: query.competitionId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.match.findMany({
        where,
        orderBy: { kickoffAt: 'asc' },
        ...toSkipTake(page),
      }),
      this.prisma.match.count({ where }),
    ]);
    return buildPageResult(items, total, page);
  }

  /** Verifie qu'un match accepte encore des demandes (cahier §9 : "empecher les demandes hors periode"). */
  assertAcceptingRequests(match: Match): void {
    const now = new Date();
    if (match.status !== MatchStatus.OPEN) {
      throw new DomainError(
        ErrorCodes.MATCH_REQUESTS_CLOSED,
        "Ce match n'accepte plus de demandes.",
        'CONFLICT',
      );
    }
    if (match.requestsOpenAt && now < match.requestsOpenAt) {
      throw new DomainError(
        ErrorCodes.MATCH_REQUESTS_CLOSED,
        "La periode de demandes n'est pas encore ouverte.",
        'CONFLICT',
      );
    }
    if (match.requestsCloseAt && now > match.requestsCloseAt) {
      throw new DomainError(
        ErrorCodes.MATCH_REQUESTS_CLOSED,
        'La periode de demandes est cloturee.',
        'CONFLICT',
      );
    }
  }

  /** Cloture automatique (cahier §6) : verifie chaque minute les matchs dont la periode de demandes vient d'expirer. */
  @Cron(CronExpression.EVERY_MINUTE)
  async closeExpiredMatches(): Promise<void> {
    const expired = await this.prisma.match.findMany({
      where: { status: MatchStatus.OPEN, requestsCloseAt: { lt: new Date() } },
      select: { id: true },
    });
    for (const { id } of expired) {
      await this.prisma.match.update({
        where: { id },
        data: { status: MatchStatus.CLOSED },
      });
      this.eventBus.publish(new MatchRequestsClosedEvent(id));
      this.logger.log(
        `Demandes cloturees automatiquement pour le match ${id}.`,
      );
    }
  }
}
