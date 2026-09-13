import { Module } from '@nestjs/common';
import { AccreditationsModule } from '../accreditations/accreditations.module.js';
import { AccessControlService } from './access-control.service.js';
import { AccessControlController } from './access-control.controller.js';
import { AdminAccessControlController } from './admin-access-control.controller.js';

@Module({
  imports: [AccreditationsModule],
  controllers: [AccessControlController, AdminAccessControlController],
  providers: [AccessControlService],
})
export class AccessControlModule {}
