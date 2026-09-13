# QR Code et contrôle d'accès

Modules : `accreditations` (émission du badge) et `access-control` (vérification au scan).

## Stratégie du jeton (cahier §17)

> "Le QR Code devra contenir un identifiant ou jeton non prédictible, et non des données
> personnelles lisibles directement."

- Le jeton est **32 octets aléatoires cryptographiquement sûrs** (`crypto.randomBytes`), encodé
  en base64url — `TokenHasherService.generateOpaqueToken()`.
- Le QR Code encode **directement ce jeton brut** (aucune donnée personnelle).
- Côté serveur, seul le **hash HMAC-SHA256** du jeton (`qrTokenHash`) est stocké — jamais le
  jeton en clair. Voir `src/infrastructure/security/token-hasher.service.ts` pour la
  justification du choix HMAC plutôt qu'argon2 (recherche par égalité indexée nécessaire au
  scan, sous 3 secondes — annexe A du cahier des charges).
- Le jeton en clair n'existe qu'en mémoire, le temps de générer le QR Code (PNG) et le PDF du
  badge (`BadgeRendererService`), stockés une fois pour toutes sur S3/MinIO
  (`accreditations/<id>/badge.pdf`). Il n'est jamais journalisé ni renvoyé par une autre route
  que le téléchargement du badge lui-même.

## Vérdicts de scan (cahier §17)

`AccessControlService.verifyScan()` retourne l'un de :

| Verdict | Condition |
|---|---|
| `INVALID` | Jeton inconnu (hash sans correspondance) |
| `REVOKED` | `Accreditation.status = REVOKED` |
| `EXPIRED` | `status = EXPIRED` ou `expiresAt` dépassée |
| `OUT_OF_SCOPE` | Mauvais match, ou zone scannée non accordée au badge |
| `ALREADY_USED` | Un scan `VALID` existe déjà **pour la même zone** — un badge multi-zones reste valide sur une zone non encore utilisée (cahier §19 : "une accréditation peut donner accès à une ou plusieurs zones") |
| `VALID` | Toutes les vérifications passent |

Chaque scan est journalisé (`ScanLog`) quel que soit le verdict — traçabilité complète (cahier
§24), y compris les tentatives invalides.

## Mode hors connexion (cahier §18) — Phase 1 vs Phase 2

**Livré (contrat d'API)** :
- `GET /admin/matches/:matchId/offline-export` — liste des accréditations actives du match
  (id, hash du jeton, zones, expiration) à précharger sur un appareil.
- `POST /admin/scans/sync-offline` — ingestion idempotente des scans effectués hors ligne
  (déduplication par `(accreditationId, deviceId, scannedAt)`).

**Explicitement Phase 2** (non livré, pour tenir le délai MVP) :
- Chiffrement du paquet exporté sur l'appareil (le JSON actuel n'est pas chiffré au repos côté
  client — à faire avant tout déploiement réel du mode hors-ligne).
- Résolution de conflits avancée (deux appareils scannent le même badge hors-ligne avant sync).
- Purge locale automatique et procédure de perte d'appareil.

Ne pas activer le mode hors-ligne en production sans traiter ces points — cf. Annexe B du cahier
des charges ("réseau instable au stade" → risque identifié, mesure "mode offline testé").

## Procédure de secours

En cas de panne du service de contrôle en ligne (cahier §17 : "une procédure de secours devra
être définie"), la seule option Phase 1 est un contrôle visuel du badge PDF (identité, photo si
imprimée, dates) par l'agent — le mode hors-ligne complet (Phase 2 ci-dessus) est la réponse
long-terme à ce risque.
