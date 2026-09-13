import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AppConfigService } from '../../config/app-config.service.js';

@Injectable()
export class PasswordHasherService {
  constructor(private readonly config: AppConfigService) {}

  hash(plain: string): Promise<string> {
    const { memoryCost, timeCost } = this.config.auth.argon2;
    return argon2.hash(plain, { type: argon2.argon2id, memoryCost, timeCost });
  }

  verify(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }
}
