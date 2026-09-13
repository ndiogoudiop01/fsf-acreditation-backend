import { Injectable, Logger } from '@nestjs/common';
import type {
  SendSmsInput,
  SmsPort,
} from '../../../shared/kernel/ports/sms.port.js';

/**
 * Adaptateur par defaut : aucun fournisseur SMS/WhatsApp n'a ete valide par
 * la FSF (cahier §20). On journalise l'intention d'envoi pour ne rien
 * perdre, en attendant une decision et un adaptateur reel (meme port).
 */
@Injectable()
export class LogSmsAdapter implements SmsPort {
  private readonly logger = new Logger('SmsAdapter(disabled)');

  async send(input: SendSmsInput): Promise<{ providerResponse?: string }> {
    this.logger.log(
      `[SMS non active] destinataire=${input.to} corps="${input.body}"`,
    );
    return { providerResponse: 'logged-only' };
  }
}
