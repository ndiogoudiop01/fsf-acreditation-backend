/**
 * Vocabulaire du domaine, independant de Prisma (cahier §14). Les valeurs
 * sont volontairement identiques a l'enum Prisma `RequestStatus` : la
 * couche domaine ne doit dependre d'aucun framework ni ORM (regle
 * `no-domain-depends-on-framework` de `.dependency-cruiser.cjs`), donc ce
 * type est la source de verite du domaine, et non un import direct.
 */
export const RequestStatusValues = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  INFO_REQUESTED: 'INFO_REQUESTED',
  COMPLETE: 'COMPLETE',
  PENDING_VALIDATION: 'PENDING_VALIDATION',
  VALIDATED: 'VALIDATED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  BADGE_GENERATED: 'BADGE_GENERATED',
  ACCESS_USED: 'ACCESS_USED',
} as const;

export type DomainRequestStatus =
  (typeof RequestStatusValues)[keyof typeof RequestStatusValues];
