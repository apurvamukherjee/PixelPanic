# syntax=docker/dockerfile:1

# ---- Build stage: full devDependencies, compiles better-sqlite3's native
# binding, builds the client, typechecks the server ----
FROM node:20-bookworm-slim AS build
WORKDIR /app

# better-sqlite3 needs a native build the first time (see README.md's
# Windows dev note) — python3 + a C++ toolchain satisfy node-gyp here.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# Copy just the manifests first so `npm ci` is cached unless deps change.
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
COPY shared/package.json shared/package.json
RUN npm ci

COPY . .
RUN npm run build -w client
RUN npm run typecheck -w server
RUN npm prune --omit=dev

# ---- Runtime stage: same base image/tag as the build stage, since
# better-sqlite3's compiled binary is tied to this exact glibc/Node ABI ----
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/server ./server
COPY --from=build /app/shared ./shared
COPY --from=build /app/client/dist ./client/dist

WORKDIR /app/server
EXPOSE 3001
CMD ["npm", "start"]
