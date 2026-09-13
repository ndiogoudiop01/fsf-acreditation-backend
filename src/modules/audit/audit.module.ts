import { Module } from '@nestjs/common';
import { AuditService } from './audit.service.js';
import { AuditListener } from './audit.listener.js';
import { AdminAuditController } from './admin-audit.controller.js';

@Module({
  controllers: [AdminAuditController],
  providers: [AuditService, AuditListener],
})
export class AuditModule {}
