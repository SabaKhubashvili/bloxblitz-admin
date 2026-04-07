# syntax=docker/dockerfile:1
# Build from BloxBlitz_Admin repository root:
#   docker build -f web/Dockerfile --target production .
#
# Matches next.config.ts: output "standalone" → runtime uses `node server.js` + `.next/static` + `public`.
# Optional: pin digest for reproducible builds, e.g.
#   docker build --build-arg NODE_IMAGE=node@sha256:<digest> ...

ARG NODE_IMAGE=node:22-bookworm-slim

# -----------------------------------------------------------------------------
# Development — Next.js hot reload (compose mounts ./web over /app; prisma schema bind-mounted)
# -----------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS dev

RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=development \
    CHOKIDAR_USEPOLLING=1 \
    WATCHPACK_POLLING=true

COPY web/package.json web/package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY web/ .
COPY admin-api/prisma ./prisma

EXPOSE 4006

CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "4006"]

# -----------------------------------------------------------------------------
# Production build — Prisma sync + next build (standalone output)
# -----------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS builder

RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ARG NEXT_PUBLIC_ADMIN_API_URL=/api
ENV NEXT_PUBLIC_ADMIN_API_URL=${NEXT_PUBLIC_ADMIN_API_URL}

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

COPY web/package.json web/package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY web/ .
COPY admin-api/prisma ./prisma

RUN node scripts/sync-prisma.mjs && npm run build --ignore-scripts

# -----------------------------------------------------------------------------
# Production runtime — Next.js standalone (see next.config.ts)
# -----------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS production

LABEL org.opencontainers.image.title="admin-web" \
    org.opencontainers.image.description="BloxBlitz Admin Next.js app (standalone)"

RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl ca-certificates tini \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=4006 \
    HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 4006

# Path must match src/app/health/route.ts (GET /health). Uses Node as HTTP client — no curl in image.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||'4006')+'/health',r=>{r.resume();process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
