# syntax=docker/dockerfile:1
# Build from BloxBlitz_Admin repo root (not the Next.js `web/` app — see web/next.config.ts for that image).
#   docker build -f admin-api/Dockerfile --target production .
#
# Optional: pin digest for reproducible builds, e.g.
#   ARG NODE_IMAGE=node@sha256:<digest>

ARG NODE_IMAGE=node:22-bookworm-slim

# -----------------------------------------------------------------------------
# Development — NestJS watch (compose mounts ./admin-api over /app)
# -----------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS dev

RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=development \
    CHOKIDAR_USEPOLLING=1

COPY admin-api/package.json admin-api/package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY admin-api/ .

EXPOSE 4005

CMD ["npm", "run", "start:dev"]

# -----------------------------------------------------------------------------
# Production build — prisma generate + nest build (see package.json "build"), then prune devDependencies
# -----------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS build

RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=development

COPY admin-api/package.json admin-api/package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY admin-api/ .
RUN npm run build && npm prune --omit=dev

# -----------------------------------------------------------------------------
# Production runtime — Nest + NodeNext emits entry at dist/src/main.js (not dist/main.js)
# -----------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS production

LABEL org.opencontainers.image.title="admin-api" \
    org.opencontainers.image.description="BloxBlitz Admin NestJS API"

RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl ca-certificates tini \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production \
    PORT=4005

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nestjs

COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/package.json ./
COPY --from=build --chown=nestjs:nodejs /app/prisma ./prisma

USER nestjs

EXPOSE 4005

# Uses Node as HTTP client — no curl in image. Path must match AppController GET health.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||'4005')+'/health',r=>{r.resume();process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/src/main.js"]
