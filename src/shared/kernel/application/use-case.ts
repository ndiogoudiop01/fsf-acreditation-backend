/** Contrat commun a toutes les commandes/queries applicatives (`*.usecase.ts`, `*.query.ts`). */
export interface UseCase<Input, Output> {
  execute(input: Input): Promise<Output>;
}
