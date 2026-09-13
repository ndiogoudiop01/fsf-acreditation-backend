import { Inject, Injectable } from '@nestjs/common';
import {
  DocumentStatus,
  type Document,
  type DocumentSubjectType,
  type DocumentType,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import { AppConfigService } from '../../config/app-config.service.js';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service.js';
import { buildDocumentStorageKey } from '../../infrastructure/storage/storage-key.factory.js';
import { DomainError } from '../../shared/kernel/errors/domain.error.js';
import { ErrorCodes } from '../../shared/kernel/errors/error-catalog.js';
import {
  EVENT_BUS_PORT,
  type EventBusPort,
} from '../../shared/kernel/ports/event-bus.port.js';
import {
  STORAGE_PORT,
  type StoragePort,
} from '../../shared/kernel/ports/storage.port.js';
import {
  DocumentReviewedEvent,
  DocumentUploadedEvent,
} from './events/document.events.js';

export interface UploadFileInput {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
  ) {}

  async upload(
    subjectType: DocumentSubjectType,
    subjectId: string,
    documentType: DocumentType,
    file: UploadFileInput,
    uploadedById: string,
  ): Promise<Document> {
    this.assertValidFile(file);

    const previous = await this.prisma.document.findFirst({
      where: {
        subjectType,
        subjectId,
        documentType,
        status: { not: DocumentStatus.SUPERSEDED },
      },
      orderBy: { version: 'desc' },
    });

    const storageKey = buildDocumentStorageKey(
      subjectType,
      subjectId,
      file.originalname,
    );
    await this.storage.putObject({
      key: storageKey,
      body: file.buffer,
      contentType: file.mimetype,
    });

    const created = await this.prisma.$transaction(async (tx) => {
      if (previous) {
        await tx.document.update({
          where: { id: previous.id },
          data: { status: DocumentStatus.SUPERSEDED },
        });
      }
      return tx.document.create({
        data: {
          subjectType,
          subjectId,
          documentType,
          version: (previous?.version ?? 0) + 1,
          status: DocumentStatus.PENDING,
          storageKey,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          checksum: createHash('sha256').update(file.buffer).digest('hex'),
          uploadedById,
        },
      });
    });

    this.eventBus.publish(
      new DocumentUploadedEvent(created.id, subjectType, subjectId),
    );
    return created;
  }

  async review(
    documentId: string,
    status: typeof DocumentStatus.VALIDATED | typeof DocumentStatus.REJECTED,
    reviewedById: string,
    rejectionReason?: string,
  ): Promise<Document> {
    const document = await this.get(documentId);
    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: { status, rejectionReason, reviewedById, reviewedAt: new Date() },
    });
    this.eventBus.publish(
      new DocumentReviewedEvent(
        document.id,
        document.subjectType,
        document.subjectId,
        status,
        rejectionReason,
      ),
    );
    return updated;
  }

  async get(id: string): Promise<Document> {
    const document = await this.prisma.document.findUnique({ where: { id } });
    if (!document) {
      throw new DomainError(
        'DOCUMENT_NOT_FOUND',
        'Document introuvable.',
        'NOT_FOUND',
      );
    }
    return document;
  }

  listForSubject(
    subjectType: DocumentSubjectType,
    subjectId: string,
  ): Promise<Document[]> {
    return this.prisma.document.findMany({
      where: { subjectType, subjectId },
      orderBy: [{ documentType: 'asc' }, { version: 'desc' }],
    });
  }

  async getDownloadUrl(id: string): Promise<string> {
    const document = await this.get(id);
    return this.storage.getSignedDownloadUrl(document.storageKey);
  }

  private assertValidFile(file: UploadFileInput): void {
    const { maxFileSizeBytes, allowedMimeTypes } = this.config.storage;
    if (file.size > maxFileSizeBytes) {
      throw new DomainError(
        ErrorCodes.DOCUMENT_TOO_LARGE,
        `Le fichier depasse la taille maximale autorisee (${Math.round(maxFileSizeBytes / (1024 * 1024))} Mo).`,
        'VALIDATION',
      );
    }
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new DomainError(
        ErrorCodes.DOCUMENT_INVALID_FORMAT,
        `Format non autorise : ${file.mimetype}.`,
        'VALIDATION',
      );
    }
  }
}
