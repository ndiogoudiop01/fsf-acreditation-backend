import { Global, Module } from '@nestjs/common';
import { PasswordHasherService } from './password-hasher.service.js';
import { TokenHasherService } from './token-hasher.service.js';
import { EcdsaSignerService } from './ecdsa-signer.service.js';

@Global()
@Module({
  providers: [PasswordHasherService, TokenHasherService, EcdsaSignerService],
  exports: [PasswordHasherService, TokenHasherService, EcdsaSignerService],
})
export class SecurityModule {}
