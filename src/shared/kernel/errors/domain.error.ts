export type DomainErrorKind =
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'FORBIDDEN'
  | 'QUOTA_EXCEEDED'
  | 'INVALID_TRANSITION'
  | 'UNAUTHORIZED';

/**
 * Erreur metier portee par le domaine, independante du transport HTTP.
 * `AllExceptionsFilter` la traduit vers le bon code HTTP via `ERROR_KIND_HTTP_STATUS`.
 */
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly kind: DomainErrorKind = 'VALIDATION',
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
