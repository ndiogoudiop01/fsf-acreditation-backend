import { DomainEvent } from '../../../shared/kernel/domain/domain-event.js';
import type { DocumentSubjectType } from '@prisma/client';

export class DocumentUploadedEvent extends DomainEvent {
  readonly eventName = 'document.uploaded';
  constructor(
    public readonly documentId: string,
    public readonly subjectType: DocumentSubjectType,
    public readonly subjectId: string,
  ) {
    super();
  }
}

export class DocumentReviewedEvent extends DomainEvent {
  readonly eventName = 'document.reviewed';
  constructor(
    public readonly documentId: string,
    public readonly subjectType: DocumentSubjectType,
    public readonly subjectId: string,
    public readonly status: 'VALIDATED' | 'REJECTED',
    public readonly reason?: string,
  ) {
    super();
  }
}
