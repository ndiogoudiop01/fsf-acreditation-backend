import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { DocumentStatus, type DocumentSubjectType } from '@prisma/client';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../shared/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../shared/decorators/permissions.decorator.js';
import { Permission } from '../../shared/kernel/permissions/permission-catalog.js';
import type { AuthenticatedUser } from '../../shared/kernel/types/authenticated-user.js';
import { DocumentsService } from './documents.service.js';
import { UploadDocumentDto } from './dto/upload-document.dto.js';
import { ReviewDocumentDto } from './dto/review-document.dto.js';

const memoryUpload = FileInterceptor('file', { storage: memoryStorage() });

/**
 * Endpoints staff pour la revue documentaire transverse et le depot de
 * pieces administratives (ex : documents d'un media). Le depot cote
 * demandeur passe par `requests` (`POST /requests/:id/documents`), qui
 * verifie la propriete du dossier avant d'appeler `DocumentsFacade`.
 */
@ApiTags('Documents')
@ApiBearerAuth('access-token')
@Controller('admin/documents')
export class AdminDocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Post()
  @RequirePermissions(Permission.MEDIA_MANAGE)
  @UseInterceptors(memoryUpload)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Deposer un document administratif (cahier §12)' })
  upload(
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documents.upload(
      dto.subjectType,
      dto.subjectId,
      dto.documentType,
      file,
      user.id,
    );
  }

  @Get()
  @RequirePermissions(Permission.MEDIA_READ)
  @ApiOperation({
    summary: 'Documents rattaches a un sujet (media, demandeur ou demande)',
  })
  listForSubject(
    @Query('subjectType') subjectType: DocumentSubjectType,
    @Query('subjectId', ParseUUIDPipe) subjectId: string,
  ) {
    return this.documents.listForSubject(subjectType, subjectId);
  }

  @Get(':id/download-url')
  @RequirePermissions(Permission.MEDIA_READ)
  @ApiOperation({
    summary: 'URL de telechargement temporaire signee (cahier §12)',
  })
  async downloadUrl(@Param('id', ParseUUIDPipe) id: string) {
    return { url: await this.documents.getDownloadUrl(id) };
  }

  @Patch(':id/review')
  @RequirePermissions(Permission.REQUESTS_VALIDATE)
  @ApiOperation({
    summary: 'Valider ou rejeter un document (motif obligatoire au rejet)',
  })
  review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documents.review(
      id,
      dto.status as
        typeof DocumentStatus.VALIDATED | typeof DocumentStatus.REJECTED,
      user.id,
      dto.rejectionReason,
    );
  }
}
