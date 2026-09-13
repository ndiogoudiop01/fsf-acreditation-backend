/** Evenement de domaine emis par un agregat, consomme par `notifications` et `audit`. */
export abstract class DomainEvent {
  public readonly occurredAt: Date = new Date();

  abstract get eventName(): string;
}
