import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { AppConfigService } from '../config/app-config.service.js';

export function setupSwagger(
  app: INestApplication,
  config: AppConfigService,
): void {
  // Jamais de documentation exposee en production (cahier §28 : reduire la
  // surface d'attaque). Le contrat est exporte en CI via `openapi:export`.
  if (config.app.isProduction) return;

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('FSF Accreditation — API')
      .setDescription(
        [
          "API backend de la plateforme de gestion des demandes d'accreditation des matchs de la",
          'Federation Senegalaise de Football (FSF).',
          '',
          '**Enveloppe de reponse** : `{ success, data | error, requestId, timestamp }`.',
          '',
          '**Cycle metier** : demande -> verification -> validation -> attribution -> ' +
            "notification -> controle d'acces -> reporting.",
        ].join('\n'),
      )
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .addTag('Auth', 'Authentification et compte demandeur')
      .addTag(
        'Utilisateurs internes',
        'Gestion des comptes FSF (admin, responsable, commission, controle, superviseur)',
      )
      .addTag('Medias', 'Referentiel des medias (cahier §7)')
      .addTag('Demandeurs', 'Profils des demandeurs/journalistes (cahier §8)')
      .addTag('Competitions', 'Gestion des competitions (cahier §5)')
      .addTag('Matchs', 'Gestion des matchs (cahier §6)')
      .addTag(
        'Categories accreditation',
        "Catalogue des types d'accreditation (cahier §10)",
      )
      .addTag('Zones', "Catalogue des zones d'acces (cahier §19)")
      .addTag('Quotas', 'Quotas par match/categorie (cahier §11)')
      .addTag(
        'Documents',
        'Depot et revue des pieces justificatives (cahier §12)',
      )
      .addTag(
        'Demandes',
        "Cycle de vie des demandes d'accreditation (cahier §9, §13, §14, §15)",
      )
      .addTag('Accreditations', 'Badges et QR Code (cahier §16, §17)')
      .addTag('Controle acces', 'Verification et scan (cahier §17, §18)')
      .addTag(
        'Tableau de bord',
        'Indicateurs et exports (cahier §21, §22, §26)',
      )
      .addTag('Audit', "Journal d'audit (cahier §24)")
      .addTag('Systeme', 'Sante et metriques')
      .build(),
    {
      operationIdFactory: (controllerKey, methodKey) =>
        `${controllerKey}_${methodKey}`,
    },
  );

  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true, tagsSorter: 'alpha' },
    jsonDocumentUrl: 'docs/openapi.json',
  });
}
