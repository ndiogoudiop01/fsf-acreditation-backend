export abstract class ValueObject<Props extends Record<string, unknown>> {
  protected constructor(protected readonly props: Props) {}

  equals(other?: ValueObject<Props>): boolean {
    if (!other) return false;
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
