# ─── Stage 1: Build ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies first (cached layer)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ─── Stage 2: Production Runner ─────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Security: run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

ENV NODE_ENV=production

# Install production deps only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy build artifacts from builder
COPY --from=builder /app/dist ./dist

# Drop to non-root
USER appuser

# PORT is read from environment (Cloud Run injects $PORT at runtime)
EXPOSE 8080

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-8080}/api/health || exit 1

CMD ["node", "dist/server.cjs"]
