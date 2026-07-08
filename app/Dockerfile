# ux-paths app — build from the REPO ROOT context (pnpm workspace), e.g.:
#   docker build -f app/Dockerfile -t dfl-ux-paths-app:latest .
# Dokploy app config: build context = repo root, dockerfile path = app/Dockerfile.

FROM node:20-alpine AS deps
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@9 --activate
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY app/package.json ./app/package.json
# schema/cli are workspace siblings but not needed to build app/ — copying
# only package.json for them would break "pnpm install" filtering, so we
# fetch the full lockfile-driven install scoped to the app package.
RUN pnpm install --filter @devfellowship/ux-paths-app... --frozen-lockfile=false

FROM node:20-alpine AS build
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@9 --activate
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/app/node_modules ./app/node_modules
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY app ./app
RUN pnpm --filter @devfellowship/ux-paths-app run build

FROM node:20-alpine AS runtime
# WORKDIR mirrors the build layout (/repo/app) so pnpm's relative symlinks in
# app/node_modules (e.g. express -> ../../node_modules/.pnpm/express@…) still
# resolve at runtime. Copying ONLY app/node_modules into a fresh /app breaks
# those symlinks (they dangle into a non-existent /repo/node_modules/.pnpm),
# which crash-looped the container with `Cannot find package 'express'`.
# So we copy BOTH node_modules trees to their original absolute paths.
WORKDIR /repo/app
ENV NODE_ENV=production
ENV PORT=3100
COPY --from=build /repo/node_modules /repo/node_modules
COPY --from=build /repo/app/node_modules ./node_modules
COPY --from=build /repo/app/dist ./dist
COPY --from=build /repo/app/server ./server
COPY --from=build /repo/app/package.json ./package.json
EXPOSE 3100
CMD ["node", "server/index.mjs"]
