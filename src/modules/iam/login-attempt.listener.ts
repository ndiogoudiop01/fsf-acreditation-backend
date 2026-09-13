import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service.js';
import {
  UserLoginFailedEvent,
  UserLoginSucceededEvent,
} from './events/user.events.js';

/**
 * Alimente la table `LoginAttempt` (historique par utilisateur, comptage des
 * echecs) a partir des evenements publies par `AuthService`. Decouple la
 * persistance de l'historique de la logique synchrone de verrouillage
 * (celle-ci reste dans `UsersService`, qui doit lire le compteur avant
 * d'autoriser la connexion suivante).
 */
@Injectable()
export class LoginAttemptListener {
  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('user.login_succeeded')
  async onLoginSucceeded(event: UserLoginSucceededEvent): Promise<void> {
    await this.prisma.loginAttempt.create({
      data: {
        email: event.email,
        userId: event.userId,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        succeeded: true,
      },
    });
  }

  @OnEvent('user.login_failed')
  async onLoginFailed(event: UserLoginFailedEvent): Promise<void> {
    await this.prisma.loginAttempt.create({
      data: {
        email: event.email,
        userId: event.userId,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        succeeded: false,
        reason: event.reason,
      },
    });
  }
}
