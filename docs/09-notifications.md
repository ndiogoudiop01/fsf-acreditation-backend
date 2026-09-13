# Notifications

Module : `notifications`. Canal livré : **email** (SMTP). SMS/WhatsApp : port défini
(`SmsPort`), adaptateur par défaut `LogSmsAdapter` qui journalise sans envoyer — cahier §20 :
"aucun canal supplémentaire ne sera activé sans décision de la FSF".

## Comment ça marche

1. Une action métier lève un **événement de domaine** (ex : `RequestSubmittedEvent`).
2. `NotificationListener` (`@OnEvent(...)`) traduit l'événement en un événement de notification
   du catalogue cahier §20 (`NotificationEvent` Prisma) et résout le destinataire.
3. `NotificationsService.send()` charge le gabarit (personnalisé en base, sinon valeur par
   défaut codée dans `default-templates.ts`), le rend (substitution `{{variable}}`), l'envoie via
   `MailerPort` (SMTP/Nodemailer), et journalise le résultat dans `NotificationLog`
   (`PENDING` → `SENT`/`FAILED`).

## Événements couverts

| Événement domaine | Notification (cahier §20) |
|---|---|
| `user.account_created` | `ACCOUNT_CREATED` |
| `request.submitted` | `REQUEST_RECEIVED` |
| `request.complement_requested` | `COMPLEMENT_REQUESTED` |
| `request.decided` (VALIDATED) | `REQUEST_VALIDATED` |
| `request.decided` (REJECTED) | `REQUEST_REJECTED` |
| `accreditation.generated` | `BADGE_AVAILABLE` |
| `accreditation.revoked` | `ACCREDITATION_REVOKED` |
| `match.updated` | `MATCH_UPDATED` (envoyé à tous les demandeurs ayant une demande active sur ce match) |

`CLOSURE_REMINDER` (rappel avant clôture) : événement défini dans le catalogue mais pas encore
déclenché automatiquement — nécessite un job planifié comparant `Match.requestsCloseAt` à la
date courante. Backlog Phase 2.

## Personnaliser un gabarit

```
GET /admin/notification-templates          # liste effective (personnalisé ou valeur par defaut)
PUT /admin/notification-templates/:event   # { subject, bodyTemplate, active }
```

Réservé aux administrateurs (`USERS_MANAGE`). Variables disponibles par événement : voir les
appels à `notifications.send({ variables: {...} })` dans `notification.listener.ts`.

## Piège de configuration corrigé (à ne pas réintroduire)

`z.coerce.boolean()` de Zod convertit **toute chaîne non vide** en `true`, y compris la chaîne
littérale `"false"` — un bug réel a mis `SMTP_SECURE=false` à `true`, cassant l'envoi SMTP vers
un serveur en clair (erreur TLS `wrong version number`). Corrigé par un parseur de booléen
explicite (`boolFromEnv` dans `src/config/env.schema.ts`) qui compare le texte
(`"true"/"1"/"yes"/"on"`). Ne jamais utiliser `z.coerce.boolean()` ailleurs dans ce projet.
