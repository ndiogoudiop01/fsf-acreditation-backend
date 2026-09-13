import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EcdsaSignerService } from '../../infrastructure/security/ecdsa-signer.service.js';
import { CurrentUser } from '../../shared/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../shared/decorators/permissions.decorator.js';
import { Permission } from '../../shared/kernel/permissions/permission-catalog.js';
import type { AuthenticatedUser } from '../../shared/kernel/types/authenticated-user.js';
import { AccessControlService } from './access-control.service.js';
import { VerifyScanDto } from './dto/verify-scan.dto.js';

@ApiTags('Controle acces')
@ApiBearerAuth('access-token')
@Controller('access-control')
export class AccessControlController {
  constructor(
    private readonly accessControl: AccessControlService,
    private readonly ecdsaSigner: EcdsaSignerService,
  ) {}

  @Post('scan')
  @RequirePermissions(Permission.SCAN_PERFORM)
  @ApiOperation({
    summary:
      'Scanner un QR Code (cahier §17) : VALID/INVALID/EXPIRED/REVOKED/ALREADY_USED/OUT_OF_SCOPE',
  })
  scan(@Body() dto: VerifyScanDto, @CurrentUser() user: AuthenticatedUser) {
    return this.accessControl.verifyScan(dto, user.id);
  }

  @Get('public-key')
  @RequirePermissions(Permission.SCAN_READ)
  @ApiOperation({
    summary:
      'Cle publique ECDSA pour provisionner un poste de controle hors-ligne (cahier §18)',
  })
  publicKey() {
    return this.ecdsaSigner.getPublicKeyInfo();
  }
}
