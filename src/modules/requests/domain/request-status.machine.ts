import { DomainError } from '../../../shared/kernel/errors/domain.error.js';
import {
  RequestStatusValues,
  type DomainRequestStatus,
} from './request-status.js';

/**
 * Machine a statuts explicite (cahier §14) : "les transitions autorisees et
 * roles habilites devront etre parametrables et documentes". Ce fichier est
 * la SEULE source de verite sur les transitions possibles — aucune
 * transition ne doit etre codee ailleurs dans le module.
 *
 * Ne depend ni de Nest ni de Prisma (regle `no-domain-depends-on-framework`),
 * pour rester une fonction pure testable independamment.
 */
export const REQUEST_TRANSITIONS: Record<
  DomainRequestStatus,
  DomainRequestStatus[]
> = {
  [RequestStatusValues.DRAFT]: [
    RequestStatusValues.SUBMITTED,
    RequestStatusValues.CANCELLED,
  ],
  [RequestStatusValues.SUBMITTED]: [
    RequestStatusValues.UNDER_REVIEW,
    RequestStatusValues.CANCELLED,
  ],
  [RequestStatusValues.UNDER_REVIEW]: [
    RequestStatusValues.INFO_REQUESTED,
    RequestStatusValues.COMPLETE,
    RequestStatusValues.REJECTED,
    RequestStatusValues.CANCELLED,
  ],
  [RequestStatusValues.INFO_REQUESTED]: [
    RequestStatusValues.UNDER_REVIEW,
    RequestStatusValues.CANCELLED,
  ],
  [RequestStatusValues.COMPLETE]: [
    RequestStatusValues.PENDING_VALIDATION,
    RequestStatusValues.VALIDATED,
    RequestStatusValues.REJECTED,
    RequestStatusValues.CANCELLED,
  ],
  [RequestStatusValues.PENDING_VALIDATION]: [
    RequestStatusValues.VALIDATED,
    RequestStatusValues.REJECTED,
    RequestStatusValues.CANCELLED,
  ],
  [RequestStatusValues.VALIDATED]: [
    RequestStatusValues.BADGE_GENERATED,
    RequestStatusValues.CANCELLED,
  ],
  [RequestStatusValues.BADGE_GENERATED]: [
    RequestStatusValues.ACCESS_USED,
    RequestStatusValues.CANCELLED,
  ],
  [RequestStatusValues.ACCESS_USED]: [],
  [RequestStatusValues.REJECTED]: [],
  [RequestStatusValues.CANCELLED]: [],
};

export function assertTransitionAllowed(
  from: DomainRequestStatus,
  to: DomainRequestStatus,
): void {
  const allowed = REQUEST_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new DomainError(
      'REQUEST_INVALID_TRANSITION',
      `Transition non autorisee : ${from} -> ${to}.`,
      'INVALID_TRANSITION',
      { from, to, allowed },
    );
  }
}
