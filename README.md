# FSF — Plateforme d'accréditation des matchs (backend)

Backend NestJS de la plateforme de gestion des demandes d'accréditation des matchs de la
Fédération Sénégalaise de Football (FSF), construit à partir du cahier des charges
`cahier_charges_accreditations_fsf.pdf`.

Couvre le cycle complet : **demande → vérification → validation → attribution → notification →
contrôle d'accès → reporting**, en architecture monolithe modulaire "microservices-ready"
(chaque module a des frontières strictes, vérifiées automatiquement, prêt à être extrait en
service autonome le jour où le besoin le justifie).

## Démarrage rapide

```bash
cp .env.example .env
docker compose up -d postgres redis minio mailpit
npm install
npm run db:migrate
npm run db:seed
npm run start:dev
```

- API : http://localhost:3000/api/v1
- Swagger : http://localhost:3000/docs
- Compte admin de démo : `admin@fsf.sn` / `Admin123!` (voir `npm run db:seed` pour les autres
  rôles).

## Documentation

Toute la documentation fonctionnelle et technique est dans [`docs/`](./docs/00-overview.md) :
liste des fonctionnalités livrées, architecture, modèle de données, workflow des demandes,
sécurité, déploiement, hooks qualité, etc.

## Scripts utiles

| Commande | Rôle |
|---|---|
| `npm run start:dev` | Démarrage en mode watch |
| `npm run build` | Compilation TypeScript stricte |
| `npm test` | Tests unitaires (Vitest) |
| `npm run lint` | Lint (oxlint) |
| `npm run arch:check` | Vérifie les frontières entre modules (dependency-cruiser) |
| `npm run verify` | lint + arch:check + test + build (identique à la CI) |
| `npm run db:migrate` | Nouvelle migration Prisma (dev) |
| `npm run db:seed` | Données de démonstration |
| `npm run openapi:export` | Génère `openapi.json` sans démarrer de serveur |

## Stack

NestJS 11 · TypeScript (ESM strict) · PostgreSQL (Prisma) · Redis (cache + BullMQ) · S3/MinIO
(documents et badges) · JWT + argon2 · Swagger · Vitest · Husky.

## Licence

Usage interne FSF — non destiné à une distribution publique.
