FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci && npm rebuild better-sqlite3
COPY tsconfig.json ./
COPY src ./src
COPY assets ./assets
RUN npm run build \
  && npm prune --omit=dev

FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    gosu ca-certificates libfontconfig1 \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /app/data /app/backups
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/assets ./assets
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/nexo.db
ENV BACKUP_DIR=/app/backups
STOPSIGNAL SIGTERM
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
