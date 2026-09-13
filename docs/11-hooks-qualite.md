# Hooks qualité (Git)

Mis en place avec Husky. Objectif : attraper localement ce qui casserait la CI, avant le commit
ou le push — "hook minimum" demandé, pas une usine à gaz.

## `pre-commit`

```
node scripts/hooks/check-secrets.mjs   # detection de secrets dans le diff stage
npx lint-staged                        # oxlint --fix + prettier sur les fichiers stages
```

`scripts/hooks/check-secrets.mjs` est un script maison sans dépendance : il grep le contenu
stagé contre une liste de motifs (clé AWS, bloc `PRIVATE KEY`, jeton GitHub/Slack, URL Postgres
avec mot de passe, assignation `secret=`/`password=`/`token=` suspecte) et bloque le commit si
trouvé. Il refuse aussi tout `.env` réel accidentellement stagé (`.env.example` excepté). Ce
n'est **pas** un remplacement pour un scanner complet (gitleaks, trufflehog) — juste un filet
minimal ; brancher un scanner dédié en CI reste recommandé si le projet grandit.

## `pre-push`

```
npm run build   # compilation TypeScript stricte (bloquant)
npm test        # tests unitaires Vitest (bloquant)
npm audit ...   # audit de securite (avertissement seulement, ne bloque jamais le push)
```

L'audit de sécurité est volontairement non bloquant : une advisory sur une dépendance
transitive sans correctif disponible ne doit pas paralyser le dépôt. Elle reste visible dans le
terminal à chaque push.

## CI (GitHub Actions)

`.github/workflows/ci.yml` reproduit les mêmes étapes contre un vrai Postgres/Redis
(services Docker du runner) : lint, `arch:check` (frontières de modules), tests, build, audit.
Sert de filet si un hook local a été contourné (`--no-verify`) ou n'a pas tourné.

## Vérification manuelle rapide

```bash
npm run verify   # lint + arch:check + test + build, dans cet ordre
```

## Ce qui n'est PAS couvert (bornes assumées)

- Pas de tests d'intégration contre une vraie base dans les hooks locaux (trop lent pour un
  hook) — c'est le rôle de la CI.
- Pas de scan de vulnérabilités applicatives (SAST/DAST) automatisé — à faire via le skill
  `security-review` avant une mise en production, ou un outil dédié en CI si le besoin grandit.
- Pas de couverture de tests minimale imposée pour l'instant (le MVP a été validé par des tests
  end-to-end manuels documentés dans les messages de commit et cette session de développement ;
  ajouter des tests unitaires/e2e automatisés sur les modules `requests`/`quotas`/
  `access-control` est le prochain investissement qualité recommandé).
