import { Injectable } from '@nestjs/common';
import {
  NotificationChannel,
  type NotificationTemplate,
  type NotificationEvent,
} from '@prisma/client';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service.js';
import { DEFAULT_TEMPLATES } from './default-templates.js';
import type { UpsertTemplateDto } from './dto/upsert-template.dto.js';

/** CRUD des gabarits (cahier §20 : "modeles personnalisables"). */
@Injectable()
export class NotificationTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<NotificationTemplate[]> {
    return this.prisma.notificationTemplate.findMany({
      orderBy: { event: 'asc' },
    });
  }

  /** Fusionne les gabarits personnalises avec les valeurs par defaut pour un affichage complet. */
  async listEffective() {
    const customized = await this.list();
    const byEvent = new Map(customized.map((t) => [t.event, t]));
    return Object.entries(DEFAULT_TEMPLATES).map(([event, fallback]) => {
      const custom = byEvent.get(event as NotificationEvent);
      return {
        event,
        subject: custom?.subject ?? fallback.subject,
        bodyTemplate: custom?.bodyTemplate ?? fallback.body,
        customized: Boolean(custom),
        active: custom?.active ?? true,
      };
    });
  }

  upsert(
    event: NotificationEvent,
    dto: UpsertTemplateDto,
  ): Promise<NotificationTemplate> {
    return this.prisma.notificationTemplate.upsert({
      where: {
        event_channel_locale: {
          event,
          channel: NotificationChannel.EMAIL,
          locale: 'fr',
        },
      },
      create: {
        event,
        channel: NotificationChannel.EMAIL,
        locale: 'fr',
        ...dto,
      },
      update: dto,
    });
  }
}
