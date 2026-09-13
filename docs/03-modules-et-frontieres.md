# Modules et frontières

## Deux styles de module, un seul principe

Tous les modules vivent sous `src/modules/<nom>/` et respectent la même règle absolue : **aucun
module n'importe le dossier `domain/`, `application/` ou `infrastructure/` d'un AUTRE module**
(vérifié par `npm run arch:check`, cf. `.dependency-cruiser.cjs`). La communication
inter-modules passe par :

1. un événement de domaine (`EVENT_BUS_PORT`), écouté via `@OnEvent(...)` — cas normal ;
2. une façade explicitement exportée (`<module>.facade.ts`, à la racine du module, donc hors de
   la règle de frontière) — pour les rares appels synchrones inter-contextes (ex : `iam` doit
   créer un `RequesterProfile` dans `media` au moment de l'inscription).

Au-delà de cette règle commune, deux niveaux de ceremonie selon la complexité métier réelle du
module (éviter l'abstraction prématurée sur du CRUD pur) :

### Style "référentiel" (CRUD simple, peu de règles métier)

`media`, `competitions`, `accreditation-config` (catégories/zones), `notifications` (gabarits) :

```
src/modules/<nom>/
  <nom>.module.ts
  <nom>.service.ts        # logique + acces Prisma direct
  <nom>.facade.ts          # uniquement si un autre module en a besoin
  dto/*.dto.ts
  <nom>.controller.ts (+ admin-<nom>.controller.ts si des routes admin existent)
```

### Style "hexagonal complet" (invariants metier reels)

`requests` (machine a statuts), `accreditations` (emission/revocation de badge, jeton QR),
`access-control` (verification de scan), `quotas` (verrou transactionnel, politique de
depassement) :

```
src/modules/<nom>/
  domain/{entities,errors,services,value-objects}
  application/{commands,queries,policies}
  infrastructure/{persistence,jobs}
  presentation/http/{*.controller.ts, dto/*.dto.ts}
  <nom>.module.ts
  <nom>.facade.ts (si necessaire)
```

Le passage d'un module "referentiel" a "hexagonal" est une refactorisation locale (deplacer des
fichiers), jamais un changement d'API externe — elle peut se faire plus tard si les regles
metier d'un referentiel se complexifient (ex: workflow de validation des medias).

## Carte des modules

| Module | Style | Sections cahier |
|---|---|---|
| `iam` | référentiel + auth | §4, §23 |
| `media` | référentiel | §7, §8 |
| `competitions` | référentiel | §5, §6 |
| `accreditation-config` | référentiel | §10, §19 |
| `quotas` | hexagonal | §11 |
| `documents` | référentiel + stockage | §12 |
| `requests` | hexagonal | §9, §13, §14, §15 |
| `accreditations` | hexagonal | §16, §17 |
| `access-control` | hexagonal | §17, §18, §22 |
| `notifications` | référentiel + listeners | §20 |
| `audit` | référentiel + listener global | §24 |
| `reporting` | requêtes de lecture uniquement | §21, §22, §25, §26 |
