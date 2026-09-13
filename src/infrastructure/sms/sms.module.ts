import { Global, Module } from '@nestjs/common';
import { SMS_PORT } from '../../shared/kernel/ports/sms.port.js';
import { LogSmsAdapter } from './adapters/log-sms.adapter.js';

@Global()
@Module({
  providers: [{ provide: SMS_PORT, useClass: LogSmsAdapter }],
  exports: [SMS_PORT],
})
export class SmsModule {}
