# ADR 0001 — Monolithe modulaire plutôt que microservices dès le départ

**Statut** : Accepté

## Contexte

Le cahier des charges demande une architecture "évolutive" capable d'absorber la croissance
(500+ utilisateurs simultanés, ~100k demandes) tout en tenant un planning de 8 à 11 semaines
pour un MVP couvrant le cycle complet d'accréditation.

## Décision

Un seul déployable NestJS, mais avec des frontières de modules aussi strictes que celles de
services distincts :

- chaque module métier (`iam`, `media`, `competitions`, `requests`, `accreditations`,
  `access-control`, `notifications`, `audit`, `reporting`, ...) possède ses propres couches
  `domain/ application/ infrastructure/ presentation/` ;
- aucun module n'importe les internes d'un autre module — seulement sa façade publique ou un
  événement de domaine (`EventsModule`) ;
- ces frontières sont vérifiées automatiquement par `dependency-cruiser`
  (`.dependency-cruiser.cjs`, `npm run arch:check`), pas seulement par convention.

## Conséquence

Le jour où un module (par exemple `access-control` pour l'app mobile contrôleur, ou `reporting`
pour de l'analytique lourde) doit devenir un service autonome, on l'extrait en remplaçant sa
façade par un client HTTP — sans avoir payé, aujourd'hui, le coût d'exploitation des
microservices (réseau, traçage distribué, cohérence éventuelle, plusieurs pipelines de
déploiement) pour un bénéfice nul à ce stade du produit.

## Alternatives rejetées

- **Microservices réels dès le départ** : chaque contexte (médias, demandes, contrôle d'accès,
  notifications...) en service séparé avec sa propre base de données. Rejeté : complexité
  opérationnelle disproportionnée par rapport au planning et à l'équipe visée pour un MVP.
- **Monolithe non structuré** (un seul gros module Nest) : rejeté, car il rendrait toute
  extraction future coûteuse et favoriserait le couplage implicite entre contextes métier.
