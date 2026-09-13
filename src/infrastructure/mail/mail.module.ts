import { Global, Module } from '@nestjs/common';
import { MAILER_PORT } from '../../shared/kernel/ports/mailer.port.js';
import { SmtpMailerAdapter } from './adapters/smtp-mailer.adapter.js';
import { TemplateRendererService } from './template-renderer.service.js';

@Global()
@Module({
  providers: [
    { provide: MAILER_PORT, useClass: SmtpMailerAdapter },
    TemplateRendererService,
  ],
  exports: [MAILER_PORT, TemplateRendererService],
})
export class MailModule {}
