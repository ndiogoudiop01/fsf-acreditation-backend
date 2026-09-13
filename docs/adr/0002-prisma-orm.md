# ADR 0002 — Prisma comme ORM

**Statut** : Accepté

## Contexte

Le backend a besoin d'un accès typé à PostgreSQL, de migrations versionnées et d'une vélocité de
développement élevée pour tenir un planning MVP de quelques semaines.

## Décision

Utiliser Prisma (`@prisma/client` + CLI `prisma`) plutôt que TypeORM ou une requête SQL brute.

## Justification

- Client entièrement typé généré à partir du schéma — erreurs de champ détectées à la
  compilation, pas en production.
- Migrations déclaratives et versionnées (`prisma/migrations/`), faciles à relire en revue de
  code.
- Le projet de référence de l'utilisateur (`sooba-impact-backend`) utilise déjà Prisma avec
  succès dans une architecture comparable (monolithe modulaire).

## Conséquences

- Les modules "hexagonaux" (`requests`, `accreditations`, `access-control`, `quotas`) évitent
  volontairement de faire fuir Prisma dans leur couche `domain/` — voir la règle
  `no-domain-depends-on-framework` de `.dependency-cruiser.cjs` et son application concrète dans
  `src/modules/requests/domain/request-status.ts` (vocabulaire de statuts indépendant de l'enum
  Prisma généré).
- Les modules "référentiel" (CRUD simple) injectent `PrismaService` directement — pas de couche
  de repository supplémentaire, jugée disproportionnée pour du CRUD sans invariant métier.

## Piège rencontré (à documenter pour la suite)

Le CLI `dependency-cruiser` (16.x) ne supportait pas TypeScript 6.x et échouait **silencieusement**
(0 module analysé, "aucune violation" trompeur) au lieu d'émettre une erreur claire. Corrigé en
mettant à jour vers `dependency-cruiser@^18`. Vérifier systématiquement que
`npm run arch:check` rapporte un nombre de modules cohérent (`> 0`) avant de faire confiance à
son résultat "vert".
