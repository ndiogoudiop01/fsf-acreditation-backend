import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../shared/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../shared/decorators/permissions.decorator.js';
import { Permission } from '../../shared/kernel/permissions/permission-catalog.js';
import type { AuthenticatedUser } from '../../shared/kernel/types/authenticated-user.js';
import { AccessControlService } from './access-control.service.js';
import { SyncOfflineScansDto } from './dto/sync-offline-scans.dto.js';

@ApiTags('Controle acces')
@ApiBearerAuth('access-token')
@Controller('admin')
export class AdminAccessControlController {
  constructor(private readonly accessControl: AccessControlService) {}

  @Get('matches/:matchId/scans')
  @RequirePermissions(Permission.SCAN_READ)
  @ApiOperation({
    summary:
      'Journal des scans pour un match (cahier §22 : tableau de bord jour de match)',
  })
  listForMatch(@Param('matchId', ParseUUIDPipe) matchId: string) {
    return this.accessControl.listForMatch(matchId);
  }

  @Get('matches/:matchId/offline-export')
  @RequirePermissions(Permission.SCAN_READ)
  @ApiOperation({
    summary: 'Export pour appareil de controle hors-connexion (cahier §18)',
  })
  exportOffline(@Param('matchId', ParseUUIDPipe) matchId: string) {
    return this.accessControl.exportForOfflineUse(matchId);
  }

  @Post('scans/sync-offline')
  @RequirePermissions(Permission.SCAN_PERFORM)
  @ApiOperation({
    summary: 'Synchroniser les scans effectues hors-connexion (cahier §18)',
  })
  syncOffline(
    @Body() dto: SyncOfflineScansDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.accessControl.syncOfflineScans(dto.scans, user.id);
  }
}
