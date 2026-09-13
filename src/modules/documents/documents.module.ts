import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service.js';
import { DOCUMENTS_FACADE, DocumentsFacadeImpl } from './documents.facade.js';
import { AdminDocumentsController } from './admin-documents.controller.js';

@Module({
  controllers: [AdminDocumentsController],
  providers: [
    DocumentsService,
    DocumentsFacadeImpl,
    { provide: DOCUMENTS_FACADE, useExisting: DocumentsFacadeImpl },
  ],
  exports: [DOCUMENTS_FACADE],
})
export class DocumentsModule {}
