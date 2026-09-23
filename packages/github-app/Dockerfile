# syntax=docker/dockerfile:1
# Build context is the repository root:
#   docker compose -f packages/github-app/docker-compose.yml build
FROM node:24-alpine AS base
RUN npm install -g pnpm@12.5.1
WORKDIR /repo

FROM base AS build
# the plugin is a workspace dependency (types only), so its manifest is needed for the install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY patches ./patches
COPY packages/cypress-plugin-visual-regression-diff/package.json ./packages/cypress-plugin-visual-regression-diff/
COPY packages/github-app/package.json ./packages/github-app/
# the plugin's devDependencies pull in Cypress; its binary is not needed to emit types
ENV CYPRESS_INSTALL_BINARY=0
RUN pnpm install --frozen-lockfile --filter @frsource/cpvrd-github-app...
COPY packages/cypress-plugin-visual-regression-diff ./packages/cypress-plugin-visual-regression-diff
COPY packages/github-app ./packages/github-app
# `deploy` installs only this package's dependencies, so the plugin's patch
# (rollup-plugin-typescript2) is unused there and must not fail the build
RUN pnpm --filter @frsource/cypress-plugin-visual-regression-diff build \
  && pnpm --filter @frsource/cpvrd-github-app build \
  && pnpm --filter @frsource/cpvrd-github-app deploy --prod --legacy \
       --config.allow-unused-patches=true /out

FROM node:24-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3100 \
    HOST=0.0.0.0 \
    CACHE_DIR=/data/cache \
    LOG_FORMAT=json
WORKDIR /app
COPY --from=build /out ./
RUN mkdir -p /data/cache && chown -R node:node /data
USER node
VOLUME /data
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/healthz" || exit 1
CMD ["node", "dist/server.js"]
