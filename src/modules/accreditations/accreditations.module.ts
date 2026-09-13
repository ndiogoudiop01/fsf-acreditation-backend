import { Module } from '@nestjs/common';
import { AccreditationsService } from './accreditations.service.js';
import { BadgeRendererService } from './badge-renderer.service.js';
import {
  ACCREDITATIONS_FACADE,
  AccreditationsFacadeImpl,
} from './accreditations.facade.js';
import { AccreditationsController } from './accreditations.controller.js';
import { AdminAccreditationsController } from './admin-accreditations.controller.js';

@Module({
  controllers: [AccreditationsController, AdminAccreditationsController],
  providers: [
    AccreditationsService,
    BadgeRendererService,
    AccreditationsFacadeImpl,
    { provide: ACCREDITATIONS_FACADE, useExisting: AccreditationsFacadeImpl },
  ],
  exports: [ACCREDITATIONS_FACADE],
})
export class AccreditationsModule {}
