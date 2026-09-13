import { Injectable } from '@nestjs/common';
import type { Match } from '@prisma/client';
import { MatchesService } from './matches.service.js';

export const MATCHES_FACADE = Symbol('MATCHES_FACADE');

/** Point d'entree PUBLIC du module `competitions`, utilise par `requests` et `quotas`. */
export interface MatchesFacade {
  getMatch(id: string): Promise<Match>;
  assertAcceptingRequests(match: Match): void;
}

@Injectable()
export class CompetitionsFacade implements MatchesFacade {
  constructor(private readonly matchesService: MatchesService) {}

  getMatch(id: string): Promise<Match> {
    return this.matchesService.get(id);
  }

  assertAcceptingRequests(match: Match): void {
    this.matchesService.assertAcceptingRequests(match);
  }
}
