# Déploiement

## Local (développement)

```bash
docker compose up -d postgres redis minio mailpit
npm install
npm run db:migrate
npm run db:seed
npm run start:dev
```

> Le port hôte Postgres est **5433** (pas 5432) dans `docker-compose.yml`, pour éviter tout
> conflit avec une instance PostgreSQL déjà installée nativement sur le poste — situation
> rencontrée et diagnostiquée pendant le développement de ce projet (voir l'historique de
> `docker-compose.yml`).

## Docker (image applicative)

`docker/Dockerfile` — build multi-stage : compilation TypeScript dans un stage `builder`, image
finale minimale avec uniquement `dist/`, les dépendances de production et le client Prisma
généré. `docker-compose.yml` inclut un service `api` prêt à l'emploi pour un test local complet
en conteneur.

```bash
docker build -f docker/Dockerfile -t fsf-accreditation-backend .
docker compose up -d   # demarre postgres, redis, minio, mailpit et l'API
```

`docker/entrypoint.sh` exécute `prisma migrate deploy` avant de démarrer l'application — voir
`docs/13-deploiement-dokploy.md` pour la procédure complète de déploiement sur un VPS via
[Dokploy](https://dokploy.com/) (variables d'environnement, domaine/HTTPS, health check).

## Variables d'environnement obligatoires en production

Toutes celles listées dans `.env.example`, en particulier :

- `DATABASE_URL`, `REDIS_URL` — infrastructures managées recommandées (RDS/managed Postgres,
  ElastiCache/managed Redis ou équivalent).
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `QR_TOKEN_SECRET` — secrets forts et **distincts**
  (`openssl rand -base64 48`), jamais commités, injectés via le gestionnaire de secrets de la
  plateforme d'hébergement.
- `STORAGE_*` — pointer vers un vrai bucket S3 (ou compatible) provisionné par l'infrastructure
  (Terraform/IaC), **pas** par l'application (`S3StorageAdapter` ne tente la création
  automatique du bucket qu'en dehors de `NODE_ENV=production`).
- `SMTP_*` — fournisseur SMTP réel validé par la FSF.
- `NODE_ENV=production` — désactive Swagger et active les réglages de sécurité stricts
  (HSTS, CSP par défaut du framework).

## Étapes de mise en production

1. Provisionner Postgres, Redis, le bucket S3 et le fournisseur SMTP (hors de ce dépôt).
2. Injecter les variables d'environnement via le gestionnaire de secrets de la plateforme.
3. `npm run db:migrate:deploy` (jamais `db:migrate` en production — pas de génération
   interactive de migration).
4. Démarrer l'image avec `NODE_ENV=production`.
5. Vérifier `/health/ready` et `/metrics` depuis l'infrastructure de supervision.
6. **Ne jamais exécuter `npm run db:seed` en production** (crée un compte admin avec un mot de
   passe public dans le code source).

## Sauvegardes et reprise

Hors périmètre applicatif — la stratégie de sauvegarde/restauration (RPO/RTO) de PostgreSQL et
du bucket documentaire est une décision d'infrastructure à valider avec l'hébergeur retenu
(cahier §29 : "sauvegardes testées" figure dans les critères de recette §34).

## Observabilité en production

- Logs structurés JSON (Pino) sur stdout — à brancher sur l'agrégateur de logs de la plateforme.
- `/metrics` (Prometheus) — à scraper par l'infrastructure de supervision.
- `/health/ready` vérifie Postgres et Redis — à utiliser comme *readiness probe* (Kubernetes,
  ECS, etc.) ; `/health/live` comme *liveness probe* (ne dépend d'aucune ressource externe).
