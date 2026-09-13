# Sécurité et conformité

## Mesures techniques livrées (cahier §28.1)

| Exigence | Implémentation |
|---|---|
| HTTPS/TLS | À la charge du reverse proxy en production (Nginx, ALB, Cloudflare) — l'app fait confiance à `X-Forwarded-*` (`trust proxy`) |
| Authentification sécurisée | JWT access (courte durée) + refresh opaque avec rotation et révocation (`AuthService`) |
| Politique de mot de passe | Longueur minimale 8 caractères (`class-validator`) ; argon2id pour le hachage (mémoire 19 Mo, 2 passes — `PasswordHasherService`) |
| MFA | Non implémenté (cahier : "si retenue") — champ `User.mfaEnabled` réservé pour une implémentation Phase 2 (TOTP) |
| Rôles et permissions côté serveur | `PermissionsGuard` + `RequirePermissions()`, jamais de contrôle uniquement côté client |
| Protection injection/XSS | ORM paramétré (Prisma), `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`), Helmet |
| Brute force | `ThrottlerGuard` global (limite configurable via `THROTTLE_*`) |
| Téléchargement non autorisé | Documents et badges servis via URLs S3 **pré-signées temporaires** (300s par défaut), jamais de lien public permanent |
| Chiffrement des documents | Chiffrement au repos délégué au bucket S3 (SSE côté fournisseur) — à activer explicitement en production selon l'hébergeur retenu |
| Sauvegardes testées | Hors périmètre applicatif — responsabilité infra (cf. `12-deploiement.md`) |
| Journalisation et alertes | `AuditLog` (toute action métier via événements de domaine) + logs structurés Pino ; alerting à brancher sur l'outil de supervision retenu |
| Séparation des environnements | `.env` par environnement, jamais de secret dans le code (`.gitignore` couvre `.env*`) |
| Gestion des secrets hors du code | Variables d'environnement uniquement, validées par un schéma Zod au démarrage (échec rapide si secret manquant/trop court) |
| Révocation de sessions | `RefreshToken.revokedAt` ; un compte suspendu (`UserStatus`) perd l'accès **immédiatement**, même avec un access token encore valide (revalidation à chaque requête dans `JwtStrategy`) |
| Tests de sécurité avant prod | `npm audit` en hook `pre-push` (non bloquant) et en CI ; `security-review` (skill Claude Code) recommandé avant toute mise en production |

## Bug corrigé pendant le développement (à retenir)

Une revue de sécurité a détecté que la création et la liste des utilisateurs internes
renvoyaient le **hash argon2** du mot de passe dans la réponse JSON (`UsersService`). Corrigé en
excluant `passwordHash` via `select` explicite dans toutes les méthodes exposées à l'API — seule
`findByEmail`/`findById` (usage interne pour la vérification du mot de passe) y accèdent encore.
Voir `git log` pour le commit correspondant.

## Journal d'audit générique

`AuditListener` s'abonne à **tous** les événements de domaine (`@OnEvent('**')`) plutôt que
d'exiger un appel d'audit manuel dans chaque cas d'usage — garantit qu'aucune action métier
future n'est oubliée du journal (cahier §24), au prix d'un format `newValue` moins structuré
(JSON brut des champs de l'événement).

## Données personnelles (cahier §28.2, loi sénégalaise n° 2008-12)

Le backend fournit les briques techniques suivantes, mais **la conformité juridique reste à
valider avec un conseil juridique / le référent conformité FSF** :

- **Minimisation** : le profil demandeur ne collecte que les champs listés au cahier §8 ; aucun
  champ superflu.
- **Droit d'accès** : `GET /requesters/me`, `GET /auth/me` permettent au demandeur de consulter
  ses propres données.
- **Traçabilité** : `AuditLog` conserve qui a consulté/modifié/exporté quoi, avec horodatage.
- **Suppression/rectification** : pas d'endpoint dédié à ce stade (à ajouter selon la décision de
  cadrage sur les durées de conservation et les droits effectifs — cahier §28.2 le laisse
  explicitement ouvert).
- **Exports** : chaque export (`/admin/exports/*`) porte l'auteur et la date de génération dans
  le fichier lui-même.

Aucune formalité CDP, aucun registre des traitements et aucune base légale ne sont présumés
acquis par ce document — ce sont des décisions non techniques, hors périmètre de ce backend.
