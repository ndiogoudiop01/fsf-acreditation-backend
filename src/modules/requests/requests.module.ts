import { Module } from '@nestjs/common';
import { CompetitionsModule } from '../competitions/competitions.module.js';
import { AccreditationConfigModule } from '../accreditation-config/accreditation-config.module.js';
import { QuotasModule } from '../quotas/quotas.module.js';
import { DocumentsModule } from '../documents/documents.module.js';
import { AccreditationsModule } from '../accreditations/accreditations.module.js';
import { SaveDraftRequestUseCase } from './application/commands/save-draft-request.usecase.js';
import { SubmitRequestUseCase } from './application/commands/submit-request.usecase.js';
import { RequestComplementUseCase } from './application/commands/request-complement.usecase.js';
import { ResolveComplementUseCase } from './application/commands/resolve-complement.usecase.js';
import { TransitionRequestStatusUseCase } from './application/commands/transition-request-status.usecase.js';
import { DecideRequestUseCase } from './application/commands/decide-request.usecase.js';
import { CancelRequestUseCase } from './application/commands/cancel-request.usecase.js';
import { GetRequestQuery } from './application/queries/get-request.query.js';
import { ListRequestsQuery } from './application/queries/list-requests.query.js';
import { TrackRequestQuery } from './application/queries/track-request.query.js';
import { RequestsController } from './presentation/http/requests.controller.js';
import { AdminRequestsController } from './presentation/http/admin-requests.controller.js';

@Module({
  imports: [
    CompetitionsModule,
    AccreditationConfigModule,
    QuotasModule,
    DocumentsModule,
    AccreditationsModule,
  ],
  controllers: [RequestsController, AdminRequestsController],
  providers: [
    SaveDraftRequestUseCase,
    SubmitRequestUseCase,
    RequestComplementUseCase,
    ResolveComplementUseCase,
    TransitionRequestStatusUseCase,
    DecideRequestUseCase,
    CancelRequestUseCase,
    GetRequestQuery,
    ListRequestsQuery,
    TrackRequestQuery,
  ],
})
export class RequestsModule {}
