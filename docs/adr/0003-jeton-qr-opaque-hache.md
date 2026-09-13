# ADR 0003 — Jeton QR opaque, hashé en base (jamais en clair)

**Statut** : Accepté

## Contexte

Le cahier des charges (§17) exige que le QR Code d'une accréditation contienne un identifiant
non prédictible et aucune donnée personnelle lisible, avec une vérification au scan en moins de
3 secondes (Annexe A).

## Décision

- Le contenu du QR Code est un jeton opaque de 32 octets aléatoires (`crypto.randomBytes`),
  encodé en base64url.
- Seul un hash HMAC-SHA256 du jeton (`Accreditation.qrTokenHash`) est stocké en base — jamais le
  jeton en clair.
- La vérification au scan recalcule le HMAC du jeton présenté et cherche une correspondance
  exacte indexée (`@unique` sur `qrTokenHash`), en `O(1)` — condition nécessaire pour respecter
  la contrainte de 3 secondes sous charge.

## Alternative rejetée : JWT signé comme contenu du QR Code

Un JWT auto-porteur (contenant `accreditationId`, `matchId`, etc., signé) aurait permis une
vérification sans aller en base pour les champs non sensibles. Rejeté car :
- Un JWT décodable expose des métadonnées (même non "personnelles" au sens strict) dans le QR
  Code, contraire à l'esprit du cahier des charges.
- La révocation d'un JWT auto-porteur nécessite une liste de révocation de toute façon — la
  vérification en base reste incontournable pour `REVOKED`/`ALREADY_USED`, annulant le bénéfice
  principal d'un jeton auto-porteur.

## Conséquence pratique

Le jeton en clair n'existe qu'en mémoire pendant `AccreditationsService.generateAccreditation()`
— le temps de produire l'image QR et le PDF du badge, stockés une fois pour toutes sur S3. Il
n'est ni journalisé, ni renvoyé par une autre route que le téléchargement du badge PDF lui-même
(qui contient l'image déjà encodée, pas le texte du jeton).
