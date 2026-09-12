FROM oven/bun:1.4.0 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY tsconfig.json ./
COPY backend ./backend
COPY shared ./shared
COPY scripts/build-backend.mjs ./scripts/build-backend.mjs
RUN bun run build:backend

FROM oven/bun:1.4.0 AS dependencies
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
ENV NODE_EXTRA_CA_CERTS=/app/backend/certs/supabase-prod-ca-2021.crt
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/backend/dist ./backend/dist
COPY --chown=node:node backend/certs ./backend/certs
COPY package.json ./
USER node
EXPOSE 4000
CMD ["node", "backend/dist/index.mjs"]
