# Modèle de données

Schéma complet : `prisma/schema.prisma`. Ce document explique le *pourquoi* de chaque entité par
rapport au tableau conceptuel du cahier des charges (§29).

| Entité (table) | Rôle | Points notables |
|---|---|---|
| `User` | Compte unifié STAFF/REQUESTER | `kind` discrimine ; `role` (`StaffRole`) uniquement pour STAFF. Le mot de passe (`passwordHash`, argon2id) n'est **jamais** exposé par l'API (requêtes Prisma avec `select` explicite dans `UsersService`). `failedLoginAttempts`/`lockedUntil` portent le verrouillage temporaire (cahier §24). |
| `RefreshToken` | Session de rafraîchissement | Seul le **hash HMAC** du jeton est stocké ; rotation à chaque usage (l'ancien est révoqué). `createdByIp`/`userAgent` tracent l'appareil à l'origine de la session. |
| `LoginAttempt` | Historique de connexion (§24) | Une ligne par tentative (succès ou échec), avec IP/user-agent/motif — table dédiée et indexée, distincte de `AuditLog` (alimentée en parallèle) pour compter efficacement les échecs récents et lister l'historique par utilisateur sans parser du JSON. |
| `Media` | Référentiel médias (§7) | Dédoublonnage par `(name, country)` à la création. |
| `RequesterProfile` | Profil professionnel (§8) | 1:1 avec `User` (`userId` unique). Rattaché à un `Media`. |
| `Competition`, `Match` | §5, §6 | `Match.requestsOpenAt/CloseAt` pilotent l'ouverture des demandes ; clôture automatique par cron (`MatchesService.closeExpiredMatches`). |
| `AccreditationCategory`, `Zone` | Catalogues configurables (§10, §19) | Indépendants des matchs ; réutilisés par plusieurs matchs. |
| `MatchCategoryQuota` | Quota par match+catégorie (§11) | `consumed` est un compteur **mis à jour de façon atomique** (`UPDATE ... WHERE consumed < quotaTotal`) — jamais de dépassement même sous concurrence. Voir `07-quotas-et-categories.md`. |
| `MatchCategoryQuotaZone` | Zones accordées par quota | Table de jointure. |
| `Document` | Pièce justificative polymorphe (§12) | `subjectType` (`MEDIA`/`REQUESTER`/`REQUEST`) + `subjectId` — pas de FK SQL (polymorphe), intégrité gérée en application. Versionné (`version`, ancien statut `SUPERSEDED`). |
| `AccreditationRequest` | Cœur du workflow (§9, §13, §14) | `uniqueReference` publique (`FSF-AAAA-NNNNNN`). `duplicateOfId` : auto-relation pour le dédoublonnage supervisé (jamais bloquant). |
| `RequestComplement` | Demande de complément (§15) | `resolvedAt` nul tant qu'ouvert ; la demande repasse `UNDER_REVIEW` dès que tous les compléments d'une demande sont résolus. |
| `RequestDecision` | Historique des transitions | Une ligne par changement de statut (acteur, ancien/nouveau statut, motif) — traçabilité fine en plus du journal d'audit global. |
| `Accreditation` | Badge émis (§16, §17) | `qrTokenHash` : hash HMAC du jeton opaque, **jamais le jeton en clair**. `number` public (`ACC-AAAA-NNNNNN`). |
| `AccreditationZone` | Zones accordées au badge | Table de jointure. |
| `ScanLog` | Journal des contrôles (§17, §18, §24) | `source` (`ONLINE`/`OFFLINE_SYNCED`) prépare la synchronisation hors-connexion. |
| `NotificationTemplate`, `NotificationLog` | §20 | Gabarits personnalisables (repli sur des valeurs par défaut codées si absent) + journal d'envoi avec statut de livraison. |
| `AuditLog` | §24 | Alimenté automatiquement par un listener générique (`AuditListener`) qui capture **tous** les événements de domaine — jamais besoin d'ajouter un appel d'audit manuel dans chaque use case. |

## Pourquoi un compteur `consumed` plutôt qu'un `COUNT()` en direct

Compter dynamiquement les `AccreditationRequest` validées à chaque décision créerait une fenêtre
de course entre la lecture du compte et l'écriture de la décision : deux validations
concurrentes pourraient toutes les deux lire "quota non atteint" et dépasser la limite. Le
compteur `consumed`, incrémenté par une mise à jour conditionnelle unique
(`WHERE consumed < quotaTotal`), rend l'opération atomique au niveau PostgreSQL sans verrou
explicite ni transaction `SERIALIZABLE`.

## Migrations

Toutes les migrations sont commitées dans `prisma/migrations/`. En développement :
`npm run db:migrate` (crée + applique). En production : `npm run db:migrate:deploy` (applique
uniquement, jamais de génération interactive).
