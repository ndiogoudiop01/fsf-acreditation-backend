# syntax=docker/dockerfile:1
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# tini : reaping des zombies + transmission propre de SIGTERM (arret gracieux,
# voir src/bootstrap/graceful-shutdown.ts)
RUN apk add --no-cache tini

COPY package.json package-lock.json ./
# scripts.prepare (husky) suppose un depot git et le paquet husky (devDependency,
# absent ici) : on le retire de cette copie de package.json avant l'install de
# production pour eviter un "husky: not found" qui ferait echouer le build.
RUN npm pkg delete scripts.prepare \
  && npm ci --omit=dev --legacy-peer-deps \
  && npm cache clean --force
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma
COPY docker/entrypoint.sh ./docker/entrypoint.sh

RUN chmod +x ./docker/entrypoint.sh \
  && addgroup -S app && adduser -S app -G app \
  && chown -R app:app /app

USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health/live || exit 1

ENTRYPOINT ["tini", "--", "docker/entrypoint.sh"]
CMD ["node", "dist/main.js"]
