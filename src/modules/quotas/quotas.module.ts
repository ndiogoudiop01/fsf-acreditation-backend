import { Module } from '@nestjs/common';
import { CompetitionsModule } from '../competitions/competitions.module.js';
import { AccreditationConfigModule } from '../accreditation-config/accreditation-config.module.js';
import { QuotasService } from './quotas.service.js';
import { QUOTAS_FACADE, QuotasFacadeImpl } from './quotas.facade.js';
import { QuotasController } from './quotas.controller.js';
import { AdminQuotasController } from './admin-quotas.controller.js';

@Module({
  imports: [CompetitionsModule, AccreditationConfigModule],
  controllers: [QuotasController, AdminQuotasController],
  providers: [
    QuotasService,
    QuotasFacadeImpl,
    { provide: QUOTAS_FACADE, useExisting: QuotasFacadeImpl },
  ],
  exports: [QUOTAS_FACADE],
})
export class QuotasModule {}
