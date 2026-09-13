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
import { RequirePermissions } from '../../shared/decorators/permissions.decorator.js';
import { Permission } from '../../shared/kernel/permissions/permission-catalog.js';
import { UsersService } from './users.service.js';
import { CreateStaffUserDto } from './dto/create-staff-user.dto.js';
import { ListUsersDto } from './dto/list-users.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';

@ApiTags('Utilisateurs internes')
@ApiBearerAuth('access-token')
@Controller('admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermissions(Permission.USERS_MANAGE)
  @ApiOperation({ summary: 'Creer un compte interne (cahier §23)' })
  create(@Body() dto: CreateStaffUserDto) {
    return this.usersService.createStaffUser(dto);
  }

  @Get()
  @RequirePermissions(Permission.USERS_MANAGE)
  list(@Query() query: ListUsersDto) {
    return this.usersService.list(query);
  }

  @Patch(':id/status')
  @RequirePermissions(Permission.USERS_MANAGE)
  @ApiOperation({ summary: 'Activer/desactiver/suspendre un compte' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateStatus(id, dto.status);
  }
}
