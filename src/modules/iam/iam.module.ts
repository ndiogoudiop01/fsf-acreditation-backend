import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MediaModule } from '../media/media.module.js';
import { AuthService } from './auth.service.js';
import { UsersService } from './users.service.js';
import { JwtStrategy } from './jwt.strategy.js';
import { LoginAttemptListener } from './login-attempt.listener.js';
import { AuthController } from './auth.controller.js';
import { UsersController } from './users.controller.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    MediaModule,
  ],
  controllers: [AuthController, UsersController],
  providers: [AuthService, UsersService, JwtStrategy, LoginAttemptListener],
  exports: [UsersService, AuthService],
})
export class IamModule {}
