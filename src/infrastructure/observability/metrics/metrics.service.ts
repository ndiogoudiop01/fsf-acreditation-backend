import { Injectable } from '@nestjs/common';
import { collectDefaultMetrics, Counter, Registry } from 'prom-client';

@Injectable()
export class MetricsService {
  readonly registry = new Registry();

  readonly httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Nombre total de requetes HTTP traitees',
    labelNames: ['method', 'route', 'status'],
    registers: [this.registry],
  });

  readonly scansTotal = new Counter({
    name: 'access_control_scans_total',
    help: "Nombre total de scans de controle d'acces, par resultat",
    labelNames: ['result'],
    registers: [this.registry],
  });

  constructor() {
    collectDefaultMetrics({ register: this.registry });
  }
}
