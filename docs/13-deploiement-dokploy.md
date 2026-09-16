# Déploiement sur Dokploy (VPS)

Complète `docs/12-deploiement.md` avec les étapes spécifiques à [Dokploy](https://dokploy.com/).

Infrastructure retenue :

- **Postgres** et **Redis** : déployés sur le même VPS, comme ressources "Database" natives
  de Dokploy (sauvegardes et volumes gérés par Dokploy).
- **Stockage documentaire (S3)** et **SMTP** : services managés externes (pas auto-hébergés).
- **Domaine** : `api.fsf.sn` (à adapter), certificat HTTPS Let's Encrypt géré par le
  Traefik intégré à Dokploy.

## 0. Prérequis

- Dokploy installé sur le VPS et accessible.
- Un enregistrement DNS `A` pour `api.fsf.sn` pointant vers l'IP du VPS.
- Un bucket S3 (ou compatible) déjà provisionné (AWS S3, Cloudflare R2, Scaleway Object
  Storage, etc.) — cette application ne crée jamais son bucket en production
  (`S3StorageAdapter` ne le fait qu'en dehors de `NODE_ENV=production`).
- Un compte SMTP transactionnel (Resend, SendGrid, Mailgun, ou le SMTP officiel FSF).

## 1. Créer la base Postgres (ressource Dokploy)

Dans Dokploy : **Project → Create Service → Database → PostgreSQL**.

- Nom : `fsf-postgres` (exemple)
- Database : `fsf_accreditation`
- User / Password : générés ou définis par vous
- Notez le **nom de service interne** que Dokploy attribue (ex. `fsf-postgres`) : les autres
  services du même projet Dokploy peuvent le joindre par ce nom sur le réseau Docker interne,
  sans exposer le port 5432 publiquement.

## 2. Créer Redis (ressource Dokploy)

**Project → Create Service → Database → Redis**, dans le même projet Dokploy que Postgres,
pour qu'ils partagent le même réseau interne. Notez le nom de service interne (ex. `fsf-redis`).

## 3. Créer l'application (API)

**Project → Create Service → Application**, dans le même projet Dokploy.

- **Source** : votre dépôt Git (GitHub/GitLab/Gitea ou upload manuel).
- **Build type** : `Dockerfile`
- **Dockerfile path** : `docker/Dockerfile`
- **Build context** : `.` (racine du dépôt)
- **Port** exposé par le conteneur : `3000`

## 4. Variables d'environnement

Dans l'onglet **Environment** de l'application, coller (en adaptant les valeurs marquées
`__A_REMPLACER__`) :

```env
NODE_ENV=production
APP_NAME="FSF Accreditation"
APP_PORT=3000
APP_GLOBAL_PREFIX=api
APP_DEFAULT_API_VERSION=1
APP_PUBLIC_URL=https://api.fsf.sn
FRONTEND_URL=__A_REMPLACER__ (ex: https://accreditation.fsf.sn)
CORS_ORIGINS=__A_REMPLACER__ (ex: https://accreditation.fsf.sn)

# --- Base de donnees (nom de service Dokploy du service Postgres cree a l'etape 1) ---
# Remplacer __IDENTIFIANTS_POSTGRES__ par "utilisateur:mot_de_passe" (affiches
# par Dokploy sur la ressource Postgres creee a l'etape 1).
DATABASE_URL=postgresql://__IDENTIFIANTS_POSTGRES__@fsf-postgres:5432/fsf_accreditation?schema=public
DATABASE_LOG_QUERIES=false

# --- Redis (nom de service Dokploy du service Redis cree a l'etape 2) ---
REDIS_URL=redis://fsf-redis:6379
REDIS_KEY_PREFIX=fsf:
CACHE_DEFAULT_TTL_SECONDS=60

# --- Authentification (openssl rand -base64 48 pour chaque secret, tous distincts) ---
JWT_ACCESS_SECRET=__A_REMPLACER__
JWT_ACCESS_TTL=15m
JWT_REFRESH_SECRET=__A_REMPLACER__
JWT_REFRESH_TTL=30d
ARGON2_MEMORY_COST=19456
ARGON2_TIME_COST=2
AUTH_MAX_FAILED_LOGIN_ATTEMPTS=5
AUTH_LOCKOUT_DURATION_MINUTES=15

QR_TOKEN_SECRET=__A_REMPLACER__

# Sortie complete de `openssl ecparam -name prime256v1 -genkey -noout` (en-tete
# et pied PEM standards inclus), retours a la ligne echappes en "\n" sur une
# seule ligne :
ECDSA_PRIVATE_KEY_PEM=__A_REMPLACER__

# --- Stockage S3 manage (bucket deja cree, voir prerequis) ---
STORAGE_ENDPOINT=__A_REMPLACER__ (ex: https://s3.eu-west-3.amazonaws.com)
STORAGE_REGION=__A_REMPLACER__
STORAGE_BUCKET=__A_REMPLACER__
STORAGE_ACCESS_KEY=__A_REMPLACER__
STORAGE_SECRET_KEY=__A_REMPLACER__
# false pour AWS S3 "vrai" (style virtual-hosted) ; true pour certains
# fournisseurs S3-compatibles (MinIO, certains R2/self-hosted) - a verifier
# aupres du fournisseur retenu.
STORAGE_FORCE_PATH_STYLE=false
STORAGE_PRESIGN_TTL_SECONDS=300
STORAGE_MAX_FILE_SIZE_MB=10
STORAGE_ALLOWED_MIME=application/pdf,image/jpeg,image/png,image/webp

# --- SMTP manage externe ---
MAIL_FROM="FSF Accreditation <no-reply@fsf.sn>"
SMTP_HOST=__A_REMPLACER__
SMTP_PORT=__A_REMPLACER__ (587 ou 465 selon le fournisseur)
SMTP_USER=__A_REMPLACER__
SMTP_PASSWORD=__A_REMPLACER__
SMTP_SECURE=__A_REMPLACER__ (true si port 465)

SMS_ENABLED=false

LOG_LEVEL=info
LOG_PRETTY=false
METRICS_ENABLED=true

THROTTLE_TTL_SECONDS=60
THROTTLE_LIMIT=120
```

> `LOG_PRETTY=false` en production : les logs restent en JSON structuré (Pino) sur stdout,
> exploitables tels quels par l'agrégateur de logs de Dokploy.

## 5. Domaine et HTTPS

Dans l'onglet **Domains** de l'application :

- Domaine : `api.fsf.sn`
- Port conteneur : `3000`
- HTTPS : activer (certificat Let's Encrypt automatique via le Traefik intégré à Dokploy).

## 6. Health check

Dans les réglages avancés de l'application (Health Check) :

- Path : `/health/live` (liveness, ne dépend d'aucune ressource externe)
- Le `HEALTHCHECK` déjà défini dans `docker/Dockerfile` (`/health/live`) fonctionne aussi
  indépendamment, pour l'état "healthy/unhealthy" visible dans Docker/Dokploy.
- `/health/ready` (vérifie Postgres + Redis) peut être utilisé comme readiness check si
  Dokploy propose cette distinction, sinon `/health/live` suffit pour le déploiement.

## 7. Déployer

Cliquer sur **Deploy**. Au démarrage du conteneur, `docker/entrypoint.sh` exécute
automatiquement `npx prisma migrate deploy` avant de lancer l'application — aucune étape
manuelle de migration n'est nécessaire à chaque déploiement.

**Ne jamais** déclencher `npm run db:seed` en production (compte admin avec mot de passe
public dans le code source, cf. `docs/12-deploiement.md`).

## 8. Vérification post-déploiement

```bash
curl https://api.fsf.sn/health/live
curl https://api.fsf.sn/health/ready
```

## 9. Limitation connue : file d'attente BullMQ

`package.json` référence un script `start:worker` (`node dist/worker.main.js`) mais ce fichier
n'existe pas encore dans `src/` : il n'y a pas de process worker séparé pour l'instant, BullMQ
tourne dans le process principal de l'API. Rien à déployer séparément aujourd'hui — mais si un
`worker.main.ts` est ajouté plus tard, prévoir un second service Dokploy (même image, même
`docker/Dockerfile`, `CMD` différent : `node dist/worker.main.js`).

## 10. Sauvegardes

Dokploy propose une sauvegarde planifiée vers S3 pour ses ressources "Database" (Postgres,
Redis) — à configurer dans l'onglet **Backups** de chaque ressource. Le bucket S3 documentaire
est sous la responsabilité du fournisseur externe retenu (vérifier sa politique de sauvegarde).
