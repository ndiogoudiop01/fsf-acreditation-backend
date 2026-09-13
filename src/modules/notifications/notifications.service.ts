import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationEvent,
  NotificationStatus,
} from '@prisma/client';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service.js';
import { TemplateRendererService } from '../../infrastructure/mail/template-renderer.service.js';
import {
  MAILER_PORT,
  type MailerPort,
} from '../../shared/kernel/ports/mailer.port.js';
import { DEFAULT_TEMPLATES } from './default-templates.js';

export interface SendNotificationInput {
  event: NotificationEvent;
  recipientEmail: string;
  recipientUserId?: string;
  variables?: Record<string, string | number | undefined>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly renderer: TemplateRendererService,
    @Inject(MAILER_PORT) private readonly mailer: MailerPort,
  ) {}

  async send(input: SendNotificationInput): Promise<void> {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: {
        event_channel_locale: {
          event: input.event,
          channel: NotificationChannel.EMAIL,
          locale: 'fr',
        },
      },
    });
    const source =
      template?.active && template.subject
        ? { subject: template.subject, body: template.bodyTemplate }
        : DEFAULT_TEMPLATES[input.event];
    const subject = this.renderer.render(source.subject, input.variables ?? {});
    const html = this.renderer.render(source.body, input.variables ?? {});

    const log = await this.prisma.notificationLog.create({
      data: {
        event: input.event,
        channel: NotificationChannel.EMAIL,
        recipientUserId: input.recipientUserId,
        recipientAddress: input.recipientEmail,
        status: NotificationStatus.PENDING,
      },
    });

    try {
      const { providerResponse } = await this.mailer.send({
        to: input.recipientEmail,
        subject,
        html,
      });
      await this.prisma.notificationLog.update({
        where: { id: log.id },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
          providerResponse,
        },
      });
    } catch (error) {
      this.logger.error(
        `Echec d'envoi de notification (${input.event}) a ${input.recipientEmail}`,
        error as Error,
      );
      await this.prisma.notificationLog.update({
        where: { id: log.id },
        data: {
          status: NotificationStatus.FAILED,
          providerResponse: (error as Error).message,
        },
      });
    }
  }
}
