import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EVENT_BUS_PORT } from '../../shared/kernel/ports/event-bus.port.js';
import { DomainEventBusService } from './domain-event-bus.service.js';

@Global()
@Module({
  // wildcard:true permet a `audit` d'ecouter TOUS les evenements ('**') sans
  // devoir enumerer chaque nom au fur et a mesure qu'on en ajoute.
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
    }),
  ],
  providers: [{ provide: EVENT_BUS_PORT, useClass: DomainEventBusService }],
  exports: [EVENT_BUS_PORT],
})
export class EventsModule {}
