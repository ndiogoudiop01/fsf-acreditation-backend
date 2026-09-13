import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AppConfigService } from '../../config/app-config.service.js';
import { QUEUE_NAMES } from './queue.constants.js';

/**
 * Connexion BullMQ partagee. Pour le MVP, les processeurs tournent dans le
 * meme process que l'API (pas de `worker.main.ts` separe) : le volume vise
 * (annexe A du cahier des charges) ne le justifie pas encore. Extraire un
 * worker dedie plus tard ne demande qu'un nouveau point d'entree Nest qui
 * importe les memes modules de jobs — cf. docs/12-deploiement.md.
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        connection: { url: config.redis.url },
        prefix: `${config.redis.keyPrefix}bullmq`,
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.NOTIFICATIONS },
      { name: QUEUE_NAMES.DOCUMENT_EXPORTS },
      { name: QUEUE_NAMES.BADGE_GENERATION },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
