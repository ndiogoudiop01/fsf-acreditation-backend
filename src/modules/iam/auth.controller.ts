import { Body, Controller, Inject, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../shared/decorators/public.decorator.js';
import { CurrentUser } from '../../shared/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../shared/kernel/types/authenticated-user.js';
import {
  REQUESTER_PROFILES_FACADE,
  type RequesterProfilesFacade,
} from '../media/media.facade.js';
import { AuthService } from './auth.service.js';
import { UsersService } from './users.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { RegisterRequesterDto } from './dto/register-requester.dto.js';
import { UpdateDisplayNameDto } from './dto/update-display-name.dto.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    @Inject(REQUESTER_PROFILES_FACADE)
    private readonly requesterProfiles: RequesterProfilesFacade,
  ) {}

  @Post('register')
  @Public()
  @ApiOperation({
    summary: 'Creation de compte demandeur + profil (cahier §4.4, §8)',
  })
  async registerRequester(@Body() dto: RegisterRequesterDto) {
    const user = await this.usersService.createRequesterAccount(
      dto.email,
      dto.password,
    );
    await this.requesterProfiles.createProfile(user.id, dto);
    return this.authService.login(dto.email, dto.password);
  }

  @Post('login')
  @Public()
  @ApiOperation({ summary: 'Connexion (compte interne ou demandeur)' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('refresh')
  @Public()
  @ApiOperation({ summary: 'Rafraichir la session (rotation du jeton)' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @Public()
  @ApiOperation({ summary: 'Revoquer la session courante' })
  async logout(@Body() dto: RefreshTokenDto): Promise<{ success: true }> {
    await this.authService.logout(dto.refreshToken);
    return { success: true };
  }

  @Post('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "Informations sur l'utilisateur connecte" })
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  @Patch('me/display-name')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Personnaliser mon nom affiche (ex. sur les journaux de scan)',
  })
  updateDisplayName(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateDisplayNameDto,
  ) {
    return this.usersService.updateOwnDisplayName(user.id, dto.displayName);
  }
}
