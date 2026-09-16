#!/bin/sh
set -e

# Applique les migrations Prisma deja generees (jamais de generation
# interactive en production - voir docs/12-deploiement.md).
echo "[entrypoint] prisma migrate deploy..."
npx prisma migrate deploy

echo "[entrypoint] demarrage : $*"
exec "$@"
