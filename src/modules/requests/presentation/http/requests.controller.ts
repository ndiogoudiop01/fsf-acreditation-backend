import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
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
import { DocumentType } from '@prisma/client';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator.js';
import { Public } from '../../../../shared/decorators/public.decorator.js';
import { DomainError } from '../../../../shared/kernel/errors/domain.error.js';
import type { AuthenticatedUser } from '../../../../shared/kernel/types/authenticated-user.js';
import {
  DOCUMENTS_FACADE,
  type DocumentsFacade,
} from '../../../documents/documents.facade.js';
import { SaveDraftRequestUseCase } from '../../application/commands/save-draft-request.usecase.js';
import { SubmitRequestUseCase } from '../../application/commands/submit-request.usecase.js';
import { ResolveComplementUseCase } from '../../application/commands/resolve-complement.usecase.js';
import { CancelRequestUseCase } from '../../application/commands/cancel-request.usecase.js';
import { GetRequestQuery } from '../../application/queries/get-request.query.js';
import { ListRequestsQuery } from '../../application/queries/list-requests.query.js';
import { TrackRequestQuery } from '../../application/queries/track-request.query.js';
import { CreateDraftRequestDto } from '../../dto/create-draft-request.dto.js';
import { ListRequestsDto } from '../../dto/list-requests.dto.js';
import { TrackRequestDto } from '../../dto/track-request.dto.js';

const memoryUpload = FileInterceptor('file', { storage: memoryStorage() });

function requireProfile(user: AuthenticatedUser): string {
  if (!user.requesterProfileId) {
    throw new ForbiddenException("Ce compte n'a pas de profil demandeur.");
  }
  return user.requesterProfileId;
}

/** Parcours demandeur (cahier §9). Toute action verifie la propriete du dossier. */
@ApiTags('Demandes')
@ApiBearerAuth('access-token')
@Controller('requests')
export class RequestsController {
  constructor(
    private readonly saveDraft: SaveDraftRequestUseCase,
    private readonly submitRequest: SubmitRequestUseCase,
    private readonly resolveComplement: ResolveComplementUseCase,
    private readonly cancelRequest: CancelRequestUseCase,
    private readonly getRequest: GetRequestQuery,
    private readonly listRequests: ListRequestsQuery,
    private readonly trackRequest: TrackRequestQuery,
    @Inject(DOCUMENTS_FACADE) private readonly documents: DocumentsFacade,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Creer ou mettre a jour le brouillon (cahier §9 etape 1-4)',
  })
  create(
    @Body() dto: CreateDraftRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.saveDraft.execute({
      requesterId: requireProfile(user),
      ...dto,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Mes demandes' })
  list(
    @Query() query: ListRequestsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.listRequests.execute(query, requireProfile(user));
  }

  @Get('track')
  @Public()
  @ApiOperation({
    summary:
      'Suivi public par numero de dossier + email (cahier §9, portail public)',
  })
  track(@Query() query: TrackRequestDto) {
    return this.trackRequest.execute(query.reference, query.email);
  }

  @Get(':id')
  async get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const request = await this.getRequest.execute(id);
    if (request.requesterId !== requireProfile(user)) {
      throw new ForbiddenException('Ce dossier ne vous appartient pas.');
    }
    return request;
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Soumettre la demande (cahier §9 etape 6)' })
  submit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.submitRequest.execute({
      requestId: id,
      requesterId: requireProfile(user),
      actorUserId: user.id,
    });
  }

  @Post(':id/documents')
  @UseInterceptors(memoryUpload)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Deposer une piece justificative pour cette demande (cahier §12)',
  })
  async uploadDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('documentType') documentType: DocumentType,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const request = await this.getRequest.execute(id);
    if (request.requesterId !== requireProfile(user)) {
      throw new ForbiddenException('Ce dossier ne vous appartient pas.');
    }
    if (!Object.values(DocumentType).includes(documentType)) {
      throw new DomainError(
        'DOCUMENT_TYPE_INVALID',
        'Type de document invalide.',
        'VALIDATION',
      );
    }
    return this.documents.upload('REQUEST', id, documentType, file, user.id);
  }

  @Post(':id/complements/:complementId/resolve')
  @ApiOperation({
    summary: 'Signaler que le complement demande a ete fourni (cahier §15)',
  })
  resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('complementId', ParseUUIDPipe) complementId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.resolveComplement.execute({
      requestId: id,
      complementId,
      requesterId: requireProfile(user),
    });
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Annuler ma demande' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cancelRequest.execute({
      requestId: id,
      actorId: user.id,
      requesterId: requireProfile(user),
    });
  }
}
