import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service.js';
import { ZonesService } from './zones.service.js';
import {
  ACCREDITATION_CONFIG_FACADE,
  AccreditationConfigFacadeImpl,
} from './accreditation-config.facade.js';
import { CategoriesController } from './categories.controller.js';
import { AdminCategoriesController } from './admin-categories.controller.js';
import { ZonesController } from './zones.controller.js';
import { AdminZonesController } from './admin-zones.controller.js';

@Module({
  controllers: [
    CategoriesController,
    AdminCategoriesController,
    ZonesController,
    AdminZonesController,
  ],
  providers: [
    CategoriesService,
    ZonesService,
    AccreditationConfigFacadeImpl,
    {
      provide: ACCREDITATION_CONFIG_FACADE,
      useExisting: AccreditationConfigFacadeImpl,
    },
  ],
  exports: [ACCREDITATION_CONFIG_FACADE],
})
export class AccreditationConfigModule {}
