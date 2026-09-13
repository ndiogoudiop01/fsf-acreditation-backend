import { Injectable } from '@nestjs/common';
import type {
  Document,
  DocumentSubjectType,
  DocumentType,
} from '@prisma/client';
import { DocumentsService, type UploadFileInput } from './documents.service.js';

export const DOCUMENTS_FACADE = Symbol('DOCUMENTS_FACADE');

/** Point d'entree PUBLIC du module `documents`, utilise par `requests` et `media`. */
export interface DocumentsFacade {
  upload(
    subjectType: DocumentSubjectType,
    subjectId: string,
    documentType: DocumentType,
    file: UploadFileInput,
    uploadedById: string,
  ): Promise<Document>;
  listForSubject(
    subjectType: DocumentSubjectType,
    subjectId: string,
  ): Promise<Document[]>;
  getDownloadUrl(id: string): Promise<string>;
}

@Injectable()
export class DocumentsFacadeImpl implements DocumentsFacade {
  constructor(private readonly documentsService: DocumentsService) {}

  upload(
    subjectType: DocumentSubjectType,
    subjectId: string,
    documentType: DocumentType,
    file: UploadFileInput,
    uploadedById: string,
  ): Promise<Document> {
    return this.documentsService.upload(
      subjectType,
      subjectId,
      documentType,
      file,
      uploadedById,
    );
  }

  listForSubject(
    subjectType: DocumentSubjectType,
    subjectId: string,
  ): Promise<Document[]> {
    return this.documentsService.listForSubject(subjectType, subjectId);
  }

  getDownloadUrl(id: string): Promise<string> {
    return this.documentsService.getDownloadUrl(id);
  }
}
