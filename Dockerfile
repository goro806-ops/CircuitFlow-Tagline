# Multistage Dockerfile for CircuitFlow Autonomous Hardware EDA Platform

# --- Stage 1: Build & Dependencies ---
FROM node:20-bookworm-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# --- Stage 2: Production Runtime ---
FROM node:20-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV QT_QPA_PLATFORM=offscreen

# The Docker runtime is the full validation profile: real ngspice and KiCad CLI
# are optional in the managed Node deployment but available here when required.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates ngspice kicad python3 wget \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs --create-home circuitflow

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server.js ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public
COPY --from=builder /app/README.md ./

RUN chown -R circuitflow:nodejs /app
USER circuitflow

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ready || exit 1

CMD ["node", "server.js"]
