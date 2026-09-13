import { Module } from '@nestjs/common';
import { CompetitionsService } from './competitions.service.js';
import { MatchesService } from './matches.service.js';
import { CompetitionsFacade, MATCHES_FACADE } from './competitions.facade.js';
import { CompetitionsController } from './competitions.controller.js';
import { AdminCompetitionsController } from './admin-competitions.controller.js';
import { MatchesController } from './matches.controller.js';
import { AdminMatchesController } from './admin-matches.controller.js';

@Module({
  controllers: [
    CompetitionsController,
    AdminCompetitionsController,
    MatchesController,
    AdminMatchesController,
  ],
  providers: [
    CompetitionsService,
    MatchesService,
    CompetitionsFacade,
    { provide: MATCHES_FACADE, useExisting: CompetitionsFacade },
  ],
  exports: [MATCHES_FACADE],
})
export class CompetitionsModule {}
