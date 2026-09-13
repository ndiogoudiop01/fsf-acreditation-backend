export abstract class Entity<Id> {
  protected constructor(public readonly id: Id) {}

  equals(other?: Entity<Id>): boolean {
    if (!other) return false;
    if (other === this) return true;
    return other.id === this.id;
  }
}
