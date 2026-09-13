# API et Swagger

## Documentation interactive

- URL : `/docs` (Swagger UI), désactivée automatiquement quand `NODE_ENV=production` (cahier
  §28 : ne pas exposer une carte du système à un attaquant en prod).
- Contrat OpenAPI exportable sans démarrer de serveur : `npm run openapi:export` → `openapi.json`
  (utile en CI pour publier le contrat même en environnement de production).

## Conventions

- **Préfixe global** : `/api`, **versionnement** par URI : `/api/v1/...`. Les routes système
  (`/health/live`, `/health/ready`, `/metrics`) sont exemptées du préfixe et non versionnées
  (`VERSION_NEUTRAL`) pour rester des cibles stables pour les sondes d'infrastructure.
- **Enveloppe de réponse** uniforme :
  ```json
  { "success": true, "data": { ... }, "requestId": "...", "timestamp": "..." }
  { "success": false, "error": { "code": "...", "message": "...", "details": {} }, "requestId": "...", "timestamp": "..." }
  ```
- **Authentification** : `Authorization: Bearer <access-token>`, obtenu via `POST /auth/login`
  ou `POST /auth/register`. Rafraîchir avec `POST /auth/refresh` (rotation : l'ancien jeton de
  rafraîchissement est immédiatement invalidé).
- **Pagination** : `?page=1&pageSize=20` sur les listes, réponse
  `{ items, total, page, pageSize, totalPages }`.
- **Codes d'erreur métier stables** : voir `src/shared/kernel/errors/error-catalog.ts`
  (`ErrorCodes`) — destinés à piloter l'i18n côté frontend plutôt que de parser les messages.

## Rôles et permissions

Voir `src/shared/kernel/permissions/permission-catalog.ts` pour la liste complète des
permissions et leur attribution par rôle (`ADMIN`, `RESPONSABLE_ACCREDITATION`,
`COMMISSION_VALIDATION`, `AGENT_CONTROLE`, `SUPERVISEUR`), directement dérivée de la matrice de
droits du cahier des charges §23. Chaque route protégée porte un `@RequirePermissions(...)`
visible dans le code du contrôleur — pas de règle implicite.

## Découvrir l'API rapidement

Ouvrir `/docs`, s'authentifier via `POST /auth/login` (bouton "Authorize" avec le jeton reçu),
puis explorer par tag : Auth, Médias, Demandeurs, Compétitions, Matchs, Catégories
accréditation, Zones, Quotas, Documents, Demandes, Accréditations, Contrôle accès, Tableau de
bord, Notifications, Audit.
