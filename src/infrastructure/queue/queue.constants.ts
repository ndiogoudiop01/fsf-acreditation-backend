export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  DOCUMENT_EXPORTS: 'document-exports',
  BADGE_GENERATION: 'badge-generation',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
