import { Injectable } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { AppConfigService } from '../../config/app-config.service.js';

/**
 * Hachage des jetons opaques (rafraichissement de session, QR Code
 * d'accreditation). Contrairement aux mots de passe (argon2, volontairement
 * lent et sale), ces jetons doivent etre RETROUVES par egalite exacte en
 * base (recherche au scan, en < 3s d'apres l'annexe A du cahier des
 * charges) : on utilise donc un HMAC-SHA256 deterministe avec un secret
 * serveur, jamais le jeton en clair n'est persiste.
 */
@Injectable()
export class TokenHasherService {
  constructor(private readonly config: AppConfigService) {}

  generateOpaqueToken(): string {
    return randomBytes(32).toString('base64url');
  }

  hash(token: string, secret: string = this.config.qrCode.tokenSecret): string {
    return createHmac('sha256', secret).update(token).digest('hex');
  }

  verify(token: string, expectedHash: string, secret?: string): boolean {
    const computed = Buffer.from(this.hash(token, secret), 'hex');
    const expected = Buffer.from(expectedHash, 'hex');
    if (computed.length !== expected.length) return false;
    return timingSafeEqual(computed, expected);
  }
}
