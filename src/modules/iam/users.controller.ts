import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../shared/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../shared/decorators/permissions.decorator.js';
import { Permission } from '../../shared/kernel/permissions/permission-catalog.js';
import type { AuthenticatedUser } from '../../shared/kernel/types/authenticated-user.js';
import { UsersService } from './users.service.js';
import { CreateStaffUserDto } from './dto/create-staff-user.dto.js';
import { ListUsersDto } from './dto/list-users.dto.js';
import { ResetStaffPasswordDto } from './dto/reset-staff-password.dto.js';
import { UpdateStaffUserDto } from './dto/update-staff-user.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { ListLoginAttemptsDto } from './dto/list-login-attempts.dto.js';

@ApiTags('Utilisateurs internes')
@ApiBearerAuth('access-token')
@Controller('admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermissions(Permission.USERS_MANAGE)
  @ApiOperation({ summary: 'Creer un compte interne (cahier §23)' })
  create(
    @Body() dto: CreateStaffUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.createStaffUser(dto, actor.id);
  }

  @Get()
  @RequirePermissions(Permission.USERS_MANAGE)
  list(@Query() query: ListUsersDto) {
    return this.usersService.list(query);
  }

  // Doit rester declare AVANT `:id` : sinon Nest tente de matcher
  // "login-attempts" contre `ParseUUIDPipe` et echoue avec une 400.
  @Get('login-attempts')
  @RequirePermissions(Permission.AUDIT_READ)
  @ApiOperation({
    summary:
      'Traçabilite transversale des connexions : IP, appareil, succes/echec (cahier §24)',
  })
  listLoginAttempts(@Query() query: ListLoginAttemptsDto) {
    return this.usersService.listLoginAttempts(query);
  }

  @Get(':id')
  @RequirePermissions(Permission.USERS_MANAGE)
  @ApiOperation({ summary: "Detail d'un compte interne" })
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getById(id);
  }

  @Get(':id/login-history')
  @RequirePermissions(Permission.USERS_MANAGE)
  @ApiOperation({
    summary: 'Historique de connexion de cet utilisateur (cahier §24)',
  })
  getLoginHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListLoginAttemptsDto,
  ) {
    return this.usersService.listLoginAttemptsForUser(id, query);
  }

  @Patch(':id')
  @RequirePermissions(Permission.USERS_MANAGE)
  @ApiOperation({
    summary: "Modifier le role (droits d'acces) et/ou le nom affiche",
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.updateStaffUser(id, dto, actor.id);
  }

  @Patch(':id/password')
  @RequirePermissions(Permission.USERS_MANAGE)
  @ApiOperation({
    summary:
      "Reinitialiser le mot de passe d'un compte interne (cahier §23) — revoque aussi ses sessions actives",
  })
  async resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetStaffPasswordDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<{ success: true }> {
    await this.usersService.resetPassword(
      id,
      dto.newTemporaryPassword,
      actor.id,
    );
    return { success: true };
  }

  @Patch(':id/status')
  @RequirePermissions(Permission.USERS_MANAGE)
  @ApiOperation({ summary: 'Activer/desactiver/suspendre un compte' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.updateStatus(id, dto.status, actor.id);
  }

  @Delete(':id')
  @RequirePermissions(Permission.USERS_MANAGE)
  @ApiOperation({
    summary:
      'Supprimer definitivement un compte sans historique (sinon, desactivez-le)',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<{ success: true }> {
    await this.usersService.deleteStaffUser(id, actor.id);
    return { success: true };
  }
}
