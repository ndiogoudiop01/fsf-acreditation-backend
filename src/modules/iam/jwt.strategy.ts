import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserStatus } from '@prisma/client';
import { AppConfigService } from '../../config/app-config.service.js';
import type { AuthenticatedUser } from '../../shared/kernel/types/authenticated-user.js';
import { AuthService } from './auth.service.js';
import { UsersService } from './users.service.js';

interface JwtPayload {
  sub: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: AppConfigService,
    private readonly users: UsersService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.auth.accessSecret,
    });
  }

  // Le statut est revalide a CHAQUE requete (pas seulement au login) : un
  // compte suspendu perd l'acces immediatement, meme avec un access token
  // encore valide — exigence §23 "revocation de sessions et appareils".
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.users.findById(payload.sub);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Session invalide.');
    }
    return this.authService.toAuthenticatedUser(user);
  }
}
