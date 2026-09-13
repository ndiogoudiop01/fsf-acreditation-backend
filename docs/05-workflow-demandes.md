# Cycle de vie d'une demande d'accréditation

Module : `src/modules/requests`. Source de vérité des transitions :
`src/modules/requests/domain/request-status.machine.ts` — **aucune** transition ne doit être
codée ailleurs.

## Machine à statuts (cahier §14)

```
DRAFT ──submit──▶ SUBMITTED ──(staff)──▶ UNDER_REVIEW ──complement──▶ INFO_REQUESTED
                                              │                             │
                                              │◀────── tous compléments résolus ──────┘
                                              │
                                      mark COMPLETE
                                              │
                                              ▼
                                          COMPLETE ──▶ PENDING_VALIDATION (optionnel, commission)
                                              │
                                    decide (VALIDATED / REJECTED)
                                              │
                        ┌─────────────────────┴─────────────────────┐
                        ▼                                           ▼
                    VALIDATED                                   REJECTED (terminal)
                        │ (génération automatique du badge)
                        ▼
                  BADGE_GENERATED ──scan valide──▶ ACCESS_USED (terminal)

CANCELLED : atteignable depuis presque tout statut non terminal (demandeur ou staff).
```

## Parcours demandeur simplifié (cahier §9)

Le formulaire papier du cahier des charges prévoit 6 étapes incluant la ressaisie des
informations personnelles/professionnelles à chaque demande. Ici, ces informations vivent une
fois pour toutes dans `RequesterProfile` (créé à l'inscription) et sont réutilisées : le
parcours effectif est donc **sélection du match → catégorie → pièces justificatives →
soumission**, ce qui réduit la friction sans rien enlever aux données collectées. Documenté
comme simplification volontaire.

Endpoints principaux (`RequestsController`, préfixe `/requests`) :

| Action | Route | Notes |
|---|---|---|
| Créer/mettre à jour le brouillon | `POST /requests` | Upsert par (demandeur, match) |
| Déposer un document | `POST /requests/:id/documents` | Multipart, délègue à `documents.upload` |
| Soumettre | `POST /requests/:id/submit` | Vérifie la période d'ouverture, détecte les doublons |
| Résoudre un complément | `POST /requests/:id/complements/:complementId/resolve` | Retour auto en `UNDER_REVIEW` |
| Annuler | `POST /requests/:id/cancel` | Libère le quota si déjà réservé |

Côté back-office (`AdminRequestsController`, préfixe `/admin/requests`) :

| Action | Route | Permission |
|---|---|---|
| Recherche multi-critères | `GET /admin/requests` | `requests:read:any` |
| Demander un complément | `POST /admin/requests/:id/complement` | `requests:complement:request` |
| Transition simple (ex: COMPLETE) | `PATCH /admin/requests/:id/status` | `requests:validate` |
| Valider / refuser | `POST /admin/requests/:id/decide` | `requests:validate` |

## Détection de doublons (cahier §9, Annexe B)

À la soumission, le système recherche une autre demande **non terminale** (pas `REJECTED` ni
`CANCELLED`) du même demandeur pour le même match. Si trouvée, la nouvelle demande est marquée
(`duplicateOfId`) mais **jamais bloquée** — dédoublonnage supervisé, la décision reste humaine.

## Génération du badge (cahier §13 étapes 8-9)

`DecideRequestUseCase` déclenche `AccreditationsFacade.generateAccreditation(...)`
**synchrone** dans le même appel que la validation (pas d'événement asynchrone) : la demande ne
passe `BADGE_GENERATED` que si le badge existe réellement, jamais avant — aucun badge orphelin
possible.
