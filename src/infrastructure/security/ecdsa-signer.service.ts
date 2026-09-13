import { Injectable, Logger } from '@nestjs/common';
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  createSign,
  createVerify,
  type KeyObject,
} from 'node:crypto';
import { AppConfigService } from '../../config/app-config.service.js';

export interface EcdsaSignatureResult {
  ecdsaSignatureHex: string;
  publicKeyFingerprint: string;
  offlineChecksum: string;
}

export interface PublicKeyInfo {
  publicKeyPem: string;
  fingerprint: string;
  algorithm: string;
}

/**
 * Signature asymetrique ECDSA (courbe P-256 / prime256v1, hachage SHA-256)
 * des payloads d'accreditation — permet aux postes de controle hors-ligne
 * de verifier l'integrite d'un badge SANS appel reseau (cahier §18) : toute
 * alteration d'un seul octet du payload invalide mathematiquement la
 * signature. La cle privee ne quitte jamais le serveur ; seule la cle
 * publique est distribuee aux postes de controle (`GET /access-control/public-key`).
 */
@Injectable()
export class EcdsaSignerService {
  private readonly logger = new Logger(EcdsaSignerService.name);
  private readonly privateKey: KeyObject;
  private readonly publicKey: KeyObject;
  private readonly fingerprint: string;

  constructor(private readonly config: AppConfigService) {
    this.privateKey = createPrivateKey(this.config.security.ecdsaPrivateKeyPem);
    this.publicKey = createPublicKey(this.privateKey);
    this.fingerprint = this.computeFingerprint(this.publicKey);
    this.logger.log(
      `Cle ECDSA chargee — empreinte publique : ${this.fingerprint}`,
    );
  }

  /** Signe un payload canonique (objet -> JSON a cles triees) pour un stockage stable. */
  sign(
    payload: Record<string, unknown>,
  ): EcdsaSignatureResult & { rawPayload: string } {
    const rawPayload = this.canonicalize(payload);
    const signer = createSign('SHA256');
    signer.update(rawPayload);
    signer.end();
    const ecdsaSignatureHex = signer.sign(this.privateKey).toString('hex');

    return {
      rawPayload,
      ecdsaSignatureHex,
      publicKeyFingerprint: this.fingerprint,
      offlineChecksum: createHash('sha256')
        .update(rawPayload)
        .digest('hex')
        .slice(0, 16)
        .toUpperCase(),
    };
  }

  /** Verifie une signature par rapport a la cle publique active du serveur. */
  verify(rawPayload: string, ecdsaSignatureHex: string): boolean {
    try {
      const verifier = createVerify('SHA256');
      verifier.update(rawPayload);
      verifier.end();
      return verifier.verify(
        this.publicKey,
        Buffer.from(ecdsaSignatureHex, 'hex'),
      );
    } catch {
      return false;
    }
  }

  getPublicKeyInfo(): PublicKeyInfo {
    return {
      publicKeyPem: this.publicKey
        .export({ type: 'spki', format: 'pem' })
        .toString(),
      fingerprint: this.fingerprint,
      algorithm: 'ECDSA P-256 (prime256v1) / SHA-256',
    };
  }

  private canonicalize(payload: Record<string, unknown>): string {
    const sortedKeys = Object.keys(payload).sort();
    const sorted: Record<string, unknown> = {};
    for (const key of sortedKeys) sorted[key] = payload[key];
    return JSON.stringify(sorted);
  }

  private computeFingerprint(publicKey: KeyObject): string {
    const der = publicKey.export({ type: 'spki', format: 'der' });
    const hash = createHash('sha256').update(der).digest('hex').toUpperCase();
    return `FSF-PUBKEY-SHA256:${hash.slice(0, 16)}`;
  }
}
