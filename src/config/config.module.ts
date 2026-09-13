import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { buildConfiguration } from './configuration.js';
import { validateEnv } from './env.schema.js';
import { AppConfigService } from './app-config.service.js';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // La validation Zod et la projection en namespaces types se font en un
      // seul passage : `load` est la seule source de verite lue par
      // `AppConfigService`, `process.env` n'est plus consulte ailleurs.
      load: [() => buildConfiguration(validateEnv(process.env))],
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
