# Vue d'ensemble

Backend NestJS de la plateforme de gestion des demandes d'accréditation des matchs de la
Fédération Sénégalaise de Football (FSF), couvrant le cycle complet du cahier des charges :
**demande → vérification → validation → attribution → notification → contrôle d'accès →
reporting**.

## Démarrage rapide

```bash
cp .env.example .env          # ajuster les secrets si besoin
docker compose up -d postgres redis minio mailpit
npm install
npm run db:migrate            # applique les migrations Prisma
npm run db:seed               # comptes de démo + référentiels (voir sortie console)
npm run start:dev
```

- API : http://localhost:3000/api/v1
- Swagger : http://localhost:3000/docs (désactivé en production)
- Health : http://localhost:3000/health/ready
- Métriques Prometheus : http://localhost:3000/metrics
- MinIO console : http://localhost:9001 (minioadmin / minioadmin)
- Mailpit (emails de dev) : http://localhost:8025

Comptes de démonstration créés par `npm run db:seed` : `admin@fsf.sn` / `Admin123!` (et un compte
par rôle interne — voir la sortie console du seed pour les mots de passe).

## Où trouver quoi

| Sujet | Document |
|---|---|
| Fonctionnalités livrées / backlog | `01-fonctionnalites.md` |
| Décisions d'architecture | `02-architecture.md`, `adr/*.md` |
| Frontières entre modules | `03-modules-et-frontieres.md` |
| Modèle de données | `04-modele-de-donnees.md` |
| Cycle de vie d'une demande | `05-workflow-demandes.md` |
| QR Code et contrôle d'accès | `06-qr-code-et-controle-acces.md` |
| Catégories, zones, quotas | `07-quotas-et-categories.md` |
| Sécurité et conformité | `08-securite-et-conformite.md` |
| Notifications | `09-notifications.md` |
| API / Swagger | `10-api-swagger.md` |
| Hooks qualité | `11-hooks-qualite.md` |
| Déploiement | `12-deploiement.md` |
