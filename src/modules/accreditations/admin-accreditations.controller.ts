import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../shared/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../shared/decorators/permissions.decorator.js';
import { Permission } from '../../shared/kernel/permissions/permission-catalog.js';
import type { AuthenticatedUser } from '../../shared/kernel/types/authenticated-user.js';
import { AccreditationsService } from './accreditations.service.js';
import { RevokeAccreditationDto } from './dto/revoke-accreditation.dto.js';
import { UpdateAssignmentsDto } from './dto/update-assignments.dto.js';

@ApiTags('Accreditations')
@ApiBearerAuth('access-token')
@Controller('admin/accreditations')
export class AdminAccreditationsController {
  constructor(private readonly accreditations: AccreditationsService) {}

  @Get('by-request/:requestId')
  @RequirePermissions(Permission.REQUESTS_READ_ANY)
  @ApiOperation({
    summary:
      "Accreditation d'une demande (back-office : impression par lots, inspecteur crypto)",
  })
  getByRequest(@Param('requestId', ParseUUIDPipe) requestId: string) {
    return this.accreditations.getForRequest(requestId);
  }

  @Get('by-request/:requestId/qr-url')
  @RequirePermissions(Permission.REQUESTS_READ_ANY)
  @ApiOperation({ summary: 'URL signee du QR Code (back-office)' })
  async getQrUrlByRequest(
    @Param('requestId', ParseUUIDPipe) requestId: string,
  ) {
    const accreditation = await this.accreditations.getForRequest(requestId);
    return { url: await this.accreditations.getQrCodeUrl(accreditation.id) };
  }

  @Post(':id/revoke')
  @RequirePermissions(Permission.ACCREDITATIONS_REVOKE)
  @ApiOperation({
    summary:
      'Revoquer un badge (cahier §16 : identifiable immediatement au controle)',
  })
  revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RevokeAccreditationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.accreditations.revoke(id, dto.reason, user.id);
  }

  @Patch(':id/assignments')
  @RequirePermissions(Permission.ACCREDITATIONS_GENERATE)
  @ApiOperation({
    summary:
      'Attribuer une cabine commentateur / un sas flash-interview (Phase 2 diffuseurs)',
  })
  updateAssignments(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssignmentsDto,
  ) {
    return this.accreditations.updateAssignments(id, dto);
  }
}
