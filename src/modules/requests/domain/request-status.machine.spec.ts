import { describe, expect, it } from 'vitest';
import { DomainError } from '../../../shared/kernel/errors/domain.error.js';
import {
  REQUEST_TRANSITIONS,
  assertTransitionAllowed,
} from './request-status.machine.js';
import { RequestStatusValues } from './request-status.js';

describe('assertTransitionAllowed', () => {
  it("n'echoue pas pour chaque transition declaree comme autorisee", () => {
    for (const [from, targets] of Object.entries(REQUEST_TRANSITIONS)) {
      for (const to of targets) {
        expect(() =>
          assertTransitionAllowed(from as keyof typeof REQUEST_TRANSITIONS, to),
        ).not.toThrow();
      }
    }
  });

  it('rejette une transition non declaree avec un DomainError INVALID_TRANSITION', () => {
    expect(() =>
      assertTransitionAllowed(
        RequestStatusValues.DRAFT,
        RequestStatusValues.VALIDATED,
      ),
    ).toThrow(DomainError);

    try {
      assertTransitionAllowed(
        RequestStatusValues.DRAFT,
        RequestStatusValues.VALIDATED,
      );
      expect.unreachable('devrait avoir leve une DomainError');
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      const domainError = error as DomainError;
      expect(domainError.code).toBe('REQUEST_INVALID_TRANSITION');
      expect(domainError.kind).toBe('INVALID_TRANSITION');
      expect(domainError.details).toEqual({
        from: RequestStatusValues.DRAFT,
        to: RequestStatusValues.VALIDATED,
        allowed: [RequestStatusValues.SUBMITTED, RequestStatusValues.CANCELLED],
      });
    }
  });

  it('ne permet aucune transition depuis un statut terminal', () => {
    for (const terminal of [
      RequestStatusValues.ACCESS_USED,
      RequestStatusValues.REJECTED,
      RequestStatusValues.CANCELLED,
    ]) {
      expect(REQUEST_TRANSITIONS[terminal]).toEqual([]);
    }
  });

  it('permet le rejet depuis UNDER_REVIEW, COMPLETE et PENDING_VALIDATION mais pas depuis DRAFT', () => {
    expect(() =>
      assertTransitionAllowed(
        RequestStatusValues.UNDER_REVIEW,
        RequestStatusValues.REJECTED,
      ),
    ).not.toThrow();
    expect(() =>
      assertTransitionAllowed(
        RequestStatusValues.DRAFT,
        RequestStatusValues.REJECTED,
      ),
    ).toThrow(DomainError);
  });
});
