import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { AppConfigService } from '../../../config/app-config.service.js';
import type {
  MailerPort,
  SendMailInput,
} from '../../../shared/kernel/ports/mailer.port.js';

@Injectable()
export class SmtpMailerAdapter implements MailerPort {
  private readonly logger = new Logger(SmtpMailerAdapter.name);
  private readonly transporter: Transporter;

  constructor(private readonly config: AppConfigService) {
    const { smtp } = this.config.mail;
    this.transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
    });
  }

  async send(input: SendMailInput): Promise<{ providerResponse?: string }> {
    try {
      const info = await this.transporter.sendMail({
        from: this.config.mail.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });
      return { providerResponse: info.messageId };
    } catch (error) {
      this.logger.error(
        `Echec d'envoi d'email a ${input.to}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
