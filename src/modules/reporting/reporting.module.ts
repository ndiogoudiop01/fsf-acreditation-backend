import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import { SearchService } from './search.service.js';
import { ExportsService } from './exports.service.js';
import { ReportingController } from './reporting.controller.js';
import { ExportsController } from './exports.controller.js';

@Module({
  controllers: [ReportingController, ExportsController],
  providers: [DashboardService, SearchService, ExportsService],
})
export class ReportingModule {}
