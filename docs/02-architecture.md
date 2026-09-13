# Architecture

## Vue en couches

```
Client (portail demandeur, back-office FSF, appareils de controle)
        │  HTTPS (TLS termine par le reverse proxy en prod)
        ▼
NestJS API — monolithe modulaire (cf. 03-modules-et-frontieres.md)
  ├─ shared/       kernel de domaine (ports, erreurs, decorateurs, guards)
  ├─ config/       validation d'environnement (Zod) + AppConfigService type
  ├─ infrastructure/  Prisma, Redis, BullMQ, S3, SMTP, evenements, observabilite
  └─ modules/      13 contextes metier (iam, media, competitions, requests, ...)
        │
        ▼
PostgreSQL (donnees relationnelles) · Redis (cache + files BullMQ) · S3/MinIO (documents, badges)
```

## Choix structurants

- **Monolithe modulaire** plutôt que microservices dès le départ — voir
  `adr/0001-monolithe-modulaire.md`. Chaque module a des frontières strictes, vérifiées
  automatiquement par `dependency-cruiser` (`npm run arch:check`).
- **Prisma + PostgreSQL** pour un développement rapide avec migrations versionnées et un client
  entièrement typé — voir `adr/0002-prisma-orm.md`.
- **ESM natif** (`"type": "module"`, TypeScript `nodenext`) : tous les imports relatifs portent
  l'extension `.js`. Pas d'alias de chemin (`@shared/*`...) pour éviter un mécanisme de
  résolution différent entre `tsc`/`node` en production et les tests — les imports sont
  relatifs partout, ce qui reste explicite et fonctionne à l'identique en dev/build/test.
- **Enveloppe de réponse uniforme** : `{ success, data | error, requestId, timestamp }`
  (`ResponseEnvelopeInterceptor` + `AllExceptionsFilter`), sauf sur les routes marquées
  `@RawResponse()` (health, metrics, exports binaires).
- **RBAC par rôle statique** (`Permission` + `ROLE_PERMISSIONS`) plutôt que CASL : suffisant pour
  la matrice de droits du cahier des charges §23, plus rapide à auditer.
- **Événements de domaine en mémoire** (`@nestjs/event-emitter`, mode wildcard) pour la
  communication inter-modules asynchrone (notifications, audit), et **façades** exportées à la
  racine de chaque module pour les rares appels synchrones inter-contextes (ex : `requests` →
  `quotas` → `accreditations` au moment de la validation).
- **BullMQ** enregistré mais les processeurs tournent dans le même process que l'API pour le
  MVP (pas de `worker.main.ts` séparé) — le volume visé ne justifie pas encore un processus
  dédié. Extraire un worker plus tard ne demande qu'un nouveau point d'entrée Nest important
  les mêmes modules de jobs.

## Modules de "référentiel" vs modules "hexagonaux"

Voir `03-modules-et-frontieres.md` pour le détail. En résumé : les modules avec de vraies règles
métier (`requests`, `accreditations`, `access-control`, `quotas`) ont une couche `domain/`
indépendante de Nest et de Prisma ; les modules de type CRUD (`media`, `competitions`,
`accreditation-config`, `notifications`) restent volontairement plus plats.

## Lecture transverse assumée

`notifications`, `audit` et `reporting` lisent directement via Prisma à travers plusieurs
"tables d'autres modules" pour agréger (résoudre un email à partir d'un id de profil, calculer
des indicateurs globaux, exporter une liste). C'est une exception documentée et volontaire à la
règle de frontières : ces modules n'écrivent JAMAIS dans les tables d'un autre module, ils les
lisent uniquement pour construire une vue agrégée — exactement le rôle qu'on attend d'eux.
