# ---------- Stage 1: build ----------
# Full install (including dev tools like the Nest CLI and TypeScript),
# generate the Prisma client, then compile TypeScript into dist/.
FROM node:24-bookworm-slim AS build
WORKDIR /app

# Copy only the dependency files first so Docker can cache this layer
COPY package*.json ./
RUN npm ci

# Build configuration, Prisma schema and source code
COPY tsconfig.json tsconfig.build.json nest-cli.json prisma7.config.ts ./
COPY prisma ./prisma
COPY src ./src

# Prisma 7 writes the client to generated/prisma (see schema.prisma "output")
RUN npx prisma generate --config prisma7.config.ts
RUN npm run build

# ---------- Stage 2: runtime ----------
# Production dependencies + compiled JavaScript only. No compiler, no source.
FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# dist/ contains both dist/src (the app) and dist/generated (the Prisma client)
COPY --from=build /app/dist ./dist

USER node
EXPOSE 3000

# Because generated/ sits outside src/, Nest outputs dist/src/main.js, not dist/main.js
CMD ["node", "dist/src/main.js"]
