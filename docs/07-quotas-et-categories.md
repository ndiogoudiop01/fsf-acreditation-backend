# Catégories, zones et quotas

Modules : `accreditation-config` (catalogues) et `quotas` (allocation par match).

## Catalogues (cahier §10, §19)

`AccreditationCategory` et `Zone` sont des référentiels **globaux**, configurables par un
administrateur (`COMPETITIONS_MANAGE`), réutilisés d'un match à l'autre. Une catégorie porte la
liste des types de documents requis (`requiredDocumentTypes`), utilisée pour orienter le
demandeur au dépôt de pièces (pas encore de blocage automatique si un type manque — validation
humaine par le gestionnaire, cf. `documents`).

## Quotas (cahier §11)

Un `MatchCategoryQuota` associe un match, une catégorie, un total et une liste de zones
accordées. Politique de dépassement (`overflowPolicy`) :

| Politique | Comportement actuel |
|---|---|
| `CLOSE` | La validation échoue avec `QUOTA_EXCEEDED` dès que le quota est plein. |
| `MANUAL_ARBITRATION` (défaut) | Idem — un gestionnaire doit augmenter le quota ou refuser d'autres dossiers avant de pouvoir valider. |
| `QUEUE` | **Pas de file d'attente automatique en Phase 1** (voir ci-dessous) — se comporte comme `MANUAL_ARBITRATION`. |
| `PRIORITY` | Un administrateur peut forcer la validation via `overrideQuota: true` sur `POST /admin/requests/:id/decide` — journalisé (motif de décision) et déclenche quand même l'incrément normal du compteur si la place existe, ou un dépassement assumé sinon. |

### Pourquoi `QUEUE` n'est pas une vraie file d'attente

Implémenter une file d'attente automatique correcte (ordre FIFO, notification de libération de
place, expiration des réservations) est un morceau de complexité disproportionné pour le
planning MVP. Le choix assumé : la demande reste simplement bloquée à l'étape de décision tant
que le quota est plein, un gestionnaire humain arbitre (augmente le quota, refuse un autre
dossier, ou attend une annulation qui libère une place via `releaseSlot`). C'est un
backlog Phase 2 explicite.

## Verrou transactionnel (Annexe B du cahier des charges)

```sql
UPDATE match_category_quotas
SET consumed = consumed + 1
WHERE id = :quotaId AND consumed < quota_total;
```

Cette unique instruction SQL (via `Prisma.updateMany` avec la même clause `WHERE`) est atomique :
PostgreSQL garantit qu'entre deux transactions concurrentes, une seule peut réussir
l'incrément une fois le quota atteint. Aucun verrou explicite (`SELECT ... FOR UPDATE`) n'est
nécessaire — testé en conditions réelles (deux validations quasi simultanées sur un quota de 1,
voir `docs/05-workflow-demandes.md` pour le scénario de recette correspondant).

## Libération de quota

`CancelRequestUseCase` appelle `quotas.releaseSlot(...)` si la demande annulée avait déjà
consommé une place (statuts `VALIDATED`, `BADGE_GENERATED`, `ACCESS_USED`). La révocation d'un
badge (module `accreditations`) ne libère PAS automatiquement le quota aujourd'hui — décision à
confirmer en cadrage FSF (une place revoquée doit-elle redevenir disponible ?).
