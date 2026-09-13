import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationEvent } from '@prisma/client';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service.js';
import {
  RequestSubmittedEvent,
  RequestComplementRequestedEvent,
  RequestDecidedEvent,
} from '../requests/events/request.events.js';
import {
  AccreditationGeneratedEvent,
  AccreditationRevokedEvent,
} from '../accreditations/events/accreditation.events.js';
import { MatchUpdatedEvent } from '../competitions/events/match.events.js';
import { UserAccountCreatedEvent } from '../iam/events/user.events.js';
import { NotificationsService } from './notifications.service.js';

/**
 * Traduit les evenements de domaine en notifications email (cahier §20).
 * Lit directement via Prisma pour resoudre le destinataire (email) a partir
 * d'un id de profil demandeur — exception documentee pour les modules
 * transverses (cf. docs/03-modules-et-frontieres.md), qui n'ecrivent jamais
 * dans les tables d'un autre module, seulement les lisent pour agreger.
 */
@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @OnEvent('user.account_created')
  async onAccountCreated(event: UserAccountCreatedEvent): Promise<void> {
    await this.notifications.send({
      event: NotificationEvent.ACCOUNT_CREATED,
      recipientEmail: event.email,
      recipientUserId: event.userId,
    });
  }

  @OnEvent('request.submitted')
  async onRequestSubmitted(event: RequestSubmittedEvent): Promise<void> {
    const recipient = await this.resolveRequesterRecipient(event.requesterId);
    if (!recipient) return;
    const request = await this.prisma.accreditationRequest.findUnique({
      where: { id: event.requestId },
    });
    await this.notifications.send({
      event: NotificationEvent.REQUEST_RECEIVED,
      recipientEmail: recipient.email,
      recipientUserId: recipient.userId,
      variables: { reference: request?.uniqueReference },
    });
  }

  @OnEvent('request.complement_requested')
  async onComplementRequested(
    event: RequestComplementRequestedEvent,
  ): Promise<void> {
    const recipient = await this.resolveRequesterRecipient(event.requesterId);
    if (!recipient) return;
    const request = await this.prisma.accreditationRequest.findUnique({
      where: { id: event.requestId },
    });
    await this.notifications.send({
      event: NotificationEvent.COMPLEMENT_REQUESTED,
      recipientEmail: recipient.email,
      recipientUserId: recipient.userId,
      variables: {
        reference: request?.uniqueReference,
        missingItem: event.missingItem,
      },
    });
  }

  @OnEvent('request.decided')
  async onRequestDecided(event: RequestDecidedEvent): Promise<void> {
    const recipient = await this.resolveRequesterRecipient(event.requesterId);
    if (!recipient) return;
    const request = await this.prisma.accreditationRequest.findUnique({
      where: { id: event.requestId },
    });
    await this.notifications.send({
      event:
        event.decision === 'VALIDATED'
          ? NotificationEvent.REQUEST_VALIDATED
          : NotificationEvent.REQUEST_REJECTED,
      recipientEmail: recipient.email,
      recipientUserId: recipient.userId,
      variables: { reference: request?.uniqueReference, reason: event.reason },
    });
  }

  @OnEvent('accreditation.generated')
  async onAccreditationGenerated(
    event: AccreditationGeneratedEvent,
  ): Promise<void> {
    const recipient = await this.resolveRequesterRecipient(event.requesterId);
    if (!recipient) return;
    await this.notifications.send({
      event: NotificationEvent.BADGE_AVAILABLE,
      recipientEmail: recipient.email,
      recipientUserId: recipient.userId,
    });
  }

  @OnEvent('accreditation.revoked')
  async onAccreditationRevoked(
    event: AccreditationRevokedEvent,
  ): Promise<void> {
    const accreditation = await this.prisma.accreditation.findUnique({
      where: { id: event.accreditationId },
      include: { request: true },
    });
    if (!accreditation) return;
    const recipient = await this.resolveRequesterRecipient(
      accreditation.request.requesterId,
    );
    if (!recipient) return;
    await this.notifications.send({
      event: NotificationEvent.ACCREDITATION_REVOKED,
      recipientEmail: recipient.email,
      recipientUserId: recipient.userId,
      variables: { reference: accreditation.number, reason: event.reason },
    });
  }

  @OnEvent('match.updated')
  async onMatchUpdated(event: MatchUpdatedEvent): Promise<void> {
    const match = await this.prisma.match.findUnique({
      where: { id: event.matchId },
    });
    if (!match) return;
    const requesters = await this.prisma.accreditationRequest.findMany({
      where: {
        matchId: event.matchId,
        status: { notIn: ['REJECTED', 'CANCELLED'] },
      },
      distinct: ['requesterId'],
      select: { requesterId: true },
    });
    const matchLabel = `${match.homeTeam} vs ${match.awayTeam}`;
    for (const { requesterId } of requesters) {
      const recipient = await this.resolveRequesterRecipient(requesterId);
      if (!recipient) continue;
      await this.notifications.send({
        event: NotificationEvent.MATCH_UPDATED,
        recipientEmail: recipient.email,
        recipientUserId: recipient.userId,
        variables: {
          matchLabel,
          changedFields: event.changedFields.join(', '),
        },
      });
    }
    this.logger.log(
      `Notification de modification envoyee a ${requesters.length} demandeur(s) pour le match ${event.matchId}.`,
    );
  }

  private async resolveRequesterRecipient(
    requesterProfileId: string,
  ): Promise<{ email: string; userId: string } | null> {
    const profile = await this.prisma.requesterProfile.findUnique({
      where: { id: requesterProfileId },
      include: { user: true },
    });
    return profile
      ? { email: profile.user.email, userId: profile.userId }
      : null;
  }
}
