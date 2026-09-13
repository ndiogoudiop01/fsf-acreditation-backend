import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { NotificationEvent } from '@prisma/client';
import { RequirePermissions } from '../../shared/decorators/permissions.decorator.js';
import { Permission } from '../../shared/kernel/permissions/permission-catalog.js';
import { NotificationTemplatesService } from './notification-templates.service.js';
import { UpsertTemplateDto } from './dto/upsert-template.dto.js';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@Controller('admin/notification-templates')
export class AdminNotificationTemplatesController {
  constructor(private readonly templates: NotificationTemplatesService) {}

  @Get()
  @RequirePermissions(Permission.USERS_MANAGE)
  @ApiOperation({
    summary:
      'Gabarits de notification effectifs (personnalises ou par defaut), cahier §20',
  })
  list() {
    return this.templates.listEffective();
  }

  @Put(':event')
  @RequirePermissions(Permission.USERS_MANAGE)
  @ApiOperation({ summary: 'Personnaliser le gabarit email pour un evenement' })
  upsert(
    @Param('event') event: NotificationEvent,
    @Body() dto: UpsertTemplateDto,
  ) {
    return this.templates.upsert(event, dto);
  }
}
