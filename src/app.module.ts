import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

// ─── Socle technique ────────────────────────────────────────────────────
import { AppConfigModule } from './config/config.module.js';
import { PrismaModule } from './infrastructure/persistence/prisma/prisma.module.js';
import { CacheModule } from './infrastructure/cache/cache.module.js';
import { QueueModule } from './infrastructure/queue/queue.module.js';
import { EventsModule } from './infrastructure/events/events.module.js';
import { StorageModule } from './infrastructure/storage/storage.module.js';
import { MailModule } from './infrastructure/mail/mail.module.js';
import { SmsModule } from './infrastructure/sms/sms.module.js';
import { SecurityModule } from './infrastructure/security/security.module.js';
import { ObservabilityModule } from './infrastructure/observability/observability.module.js';
import { AppConfigService } from './config/app-config.service.js';

// ─── Contextes metier ───────────────────────────────────────────────────
import { IamModule } from './modules/iam/iam.module.js';
import { MediaModule } from './modules/media/media.module.js';
import { MediaDeskModule } from './modules/media-desk/media-desk.module.js';
import { CompetitionsModule } from './modules/competitions/competitions.module.js';
import { AccreditationConfigModule } from './modules/accreditation-config/accreditation-config.module.js';
import { QuotasModule } from './modules/quotas/quotas.module.js';
import { DocumentsModule } from './modules/documents/documents.module.js';
import { RequestsModule } from './modules/requests/requests.module.js';
import { AccreditationsModule } from './modules/accreditations/accreditations.module.js';
import { AccessControlModule } from './modules/access-control/access-control.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { ReportingModule } from './modules/reporting/reporting.module.js';

// ─── Transverses HTTP ───────────────────────────────────────────────────
import { JwtAuthGuard } from './shared/guards/jwt-auth.guard.js';
import { PermissionsGuard } from './shared/guards/permissions.guard.js';
import { LoggingInterceptor } from './shared/interceptors/logging.interceptor.js';
import { AllExceptionsFilter } from './shared/filters/all-exceptions.filter.js';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  MONOLITHE MODULAIRE — architecture "microservices evolutive"
 * ═══════════════════════════════════════════════════════════════════════
 * Chaque module metier possede son domaine, ses ports et sa facade
 * publique (domain/ application/ infrastructure/ presentation/). Aucun
 * module n'accede aux entrailles d'un autre : la communication inter-
 * contextes passe par des evenements de domaine (`EventsModule`) ou par
 * l'import explicite d'une facade exportee. Le jour ou un module (ex:
 * `reporting`, `access-control`) doit devenir un service autonome, on
 * l'extrait en remplacant sa facade par un client HTTP — l'architecture
 * prepare la sortie sans en payer le cout des microservices aujourd'hui.
 * Voir docs/adr/0001-monolithe-modulaire.md.
 *
 * ORDRE DES GUARDS GLOBAUX (significatif) :
 *   1. ThrottlerGuard   — on rejette l'abus avant de depenser du CPU
 *   2. JwtAuthGuard      — qui es-tu ?
 *   3. PermissionsGuard  — as-tu le droit d'appeler cette route ?
 */
@Module({
  imports: [
    AppConfigModule,
    ObservabilityModule,
    PrismaModule,
    CacheModule,
    QueueModule,
    EventsModule,
    StorageModule,
    MailModule,
    SmsModule,
    SecurityModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => [
        {
          ttl: config.throttle.ttlSeconds * 1000,
          limit: config.throttle.limit,
        },
      ],
    }),

    IamModule,
    MediaModule,
    MediaDeskModule,
    CompetitionsModule,
    AccreditationConfigModule,
    QuotasModule,
    DocumentsModule,
    RequestsModule,
    AccreditationsModule,
    AccessControlModule,
    NotificationsModule,
    AuditModule,
    ReportingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
