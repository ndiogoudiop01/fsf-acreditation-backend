import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';
import PDFDocument from 'pdfkit';

export interface BadgeData {
  number: string;
  requesterName: string;
  mediaName: string;
  function: string;
  categoryLabel: string;
  matchLabel: string;
  matchDate: string;
  stadium: string;
  zoneLabels: string[];
  issuedAt: string;
  expiresAt: string;
}

@Injectable()
export class BadgeRendererService {
  /** Encode le jeton opaque (jamais de donnee personnelle lisible, cahier §17). */
  async renderQrCode(rawToken: string): Promise<Buffer> {
    return QRCode.toBuffer(rawToken, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 300,
    });
  }

  /**
   * Badge numerique imprimable (cahier §16). Rendu texte simple + QR — la
   * mise en page graphique complete (logo, photo du demandeur) est une
   * amelioration Phase 2, cf. docs/06-qr-code-et-controle-acces.md.
   */
  async renderBadgePdf(data: BadgeData, qrPng: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A6', margin: 24 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc
        .fontSize(14)
        .text('FEDERATION SENEGALAISE DE FOOTBALL', { align: 'center' });
      doc
        .moveDown(0.5)
        .fontSize(10)
        .text('ACCREDITATION MATCH', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(data.requesterName, { align: 'center' });
      doc
        .fontSize(9)
        .text(`${data.mediaName} — ${data.function}`, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(9).text(`Categorie : ${data.categoryLabel}`);
      doc.text(`Match : ${data.matchLabel}`);
      doc.text(`Date : ${data.matchDate}`);
      doc.text(`Stade : ${data.stadium}`);
      doc.text(`Zones : ${data.zoneLabels.join(', ')}`);
      doc.moveDown(0.5);
      doc.image(qrPng, { fit: [140, 140], align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(8).text(`N° ${data.number}`, { align: 'center' });
      doc.text(`Emis le ${data.issuedAt} — Expire le ${data.expiresAt}`, {
        align: 'center',
      });

      doc.end();
    });
  }
}
