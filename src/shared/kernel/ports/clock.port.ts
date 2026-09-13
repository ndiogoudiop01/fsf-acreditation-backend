export const CLOCK_PORT = Symbol('CLOCK_PORT');

/** Abstraction du temps : jamais de `new Date()` dans le domaine/application, pour rester testable. */
export interface ClockPort {
  now(): Date;
}
