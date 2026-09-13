import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequestStatus, StaffRole } from '@prisma/client';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../../../shared/decorators/permissions.decorator.js';
import { Permission } from '../../../../shared/kernel/permissions/permission-catalog.js';
import type { AuthenticatedUser } from '../../../../shared/kernel/types/authenticated-user.js';
import { RequestComplementUseCase } from '../../application/commands/request-complement.usecase.js';
import { TransitionRequestStatusUseCase } from '../../application/commands/transition-request-status.usecase.js';
import { DecideRequestUseCase } from '../../application/commands/decide-request.usecase.js';
import { CancelRequestUseCase } from '../../application/commands/cancel-request.usecase.js';
import { GetRequestQuery } from '../../application/queries/get-request.query.js';
import { ListRequestsQuery } from '../../application/queries/list-requests.query.js';
import { ListRequestsDto } from '../../dto/list-requests.dto.js';
import { RequestComplementDto } from '../../dto/request-complement.dto.js';
import { DecideRequestDto } from '../../dto/decide-request.dto.js';

@ApiTags('Demandes')
@ApiBearerAuth('access-token')
@Controller('admin/requests')
export class AdminRequestsController {
  constructor(
    private readonly listRequests: ListRequestsQuery,
    private readonly getRequest: GetRequestQuery,
    private readonly requestComplement: RequestComplementUseCase,
    private readonly transitionStatus: TransitionRequestStatusUseCase,
    private readonly decideRequest: DecideRequestUseCase,
    private readonly cancelRequest: CancelRequestUseCase,
  ) {}

  @Get()
  @RequirePermissions(Permission.REQUESTS_READ_ANY)
  @ApiOperation({ summary: 'Recherche multi-criteres (cahier §25)' })
  list(@Query() query: ListRequestsDto) {
    return this.listRequests.execute(query);
  }

  @Get(':id')
  @RequirePermissions(Permission.REQUESTS_READ_ANY)
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.getRequest.execute(id);
  }

  @Post(':id/complement')
  @RequirePermissions(Permission.REQUESTS_COMPLEMENT_REQUEST)
  @ApiOperation({ summary: 'Demander un complement (cahier §15)' })
  complement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequestComplementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.requestComplement.execute({
      requestId: id,
      requestedById: user.id,
      ...dto,
    });
  }

  @Patch(':id/status')
  @RequirePermissions(Permission.REQUESTS_VALIDATE)
  @ApiOperation({
    summary:
      'Transition sans effet de bord (ex : marquer complete, cahier §13 etape 6)',
  })
  transition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('toStatus') toStatus: RequestStatus,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transitionStatus.execute({
      requestId: id,
      toStatus,
      actorId: user.id,
    });
  }

  @Post(':id/decide')
  @RequirePermissions(Permission.REQUESTS_VALIDATE)
  @ApiOperation({
    summary: 'Valider ou refuser la demande (cahier §13 etape 7, §14)',
  })
  decide(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.decideRequest.execute({
      requestId: id,
      actorId: user.id,
      actorIsAdmin: user.role === StaffRole.ADMIN,
      status: dto.status,
      reason: dto.reason,
      zoneIds: dto.zoneIds,
      overrideQuota: dto.overrideQuota,
      assignedBoothNumber: dto.assignedBoothNumber,
      assignedFlashSlot: dto.assignedFlashSlot,
    });
  }

  @Post(':id/cancel')
  @RequirePermissions(Permission.REQUESTS_VALIDATE)
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cancelRequest.execute({ requestId: id, actorId: user.id });
  }
}
