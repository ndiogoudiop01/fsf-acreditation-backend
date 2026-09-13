import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../shared/decorators/permissions.decorator.js';
import { Permission } from '../../shared/kernel/permissions/permission-catalog.js';
import { AuditService } from './audit.service.js';
import { ListAuditQueryDto } from './dto/list-audit.dto.js';

@ApiTags('Audit')
@ApiBearerAuth('access-token')
@Controller('admin/audit')
export class AdminAuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @RequirePermissions(Permission.AUDIT_READ)
  @ApiOperation({ summary: "Journal d'audit transversal (cahier §24)" })
  list(@Query() query: ListAuditQueryDto) {
    return this.audit.list(query);
  }
}
