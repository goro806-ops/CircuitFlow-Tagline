# Multistage Dockerfile for CircuitFlow Autonomous Hardware EDA Platform
# --- Stage 1: Node build & dependencies ---
FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# --- Stage 2: Official KiCad CLI runtime ---
# The Debian bookworm `kicad` package is KiCad 6 and does not ship kicad-cli.
# Use the same official KiCad image used by CI so production DRC/ERC behavior
# matches cloud validation instead of silently falling back to structural checks.
FROM kicad/kicad:9.0.7-amd64-full AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    QT_QPA_PLATFORM=offscreen \
    HOME=/tmp/circuitflow-home \
    XDG_CONFIG_HOME=/tmp/circuitflow-home/.config

# Reuse the tested Node 20 binary, and add the non-GUI runtime tools used by
# CircuitFlow's SPICE, health-check, and Python KiCad-generation paths.
COPY --from=node:20-bookworm-slim /usr/local/bin/node /usr/local/bin/node
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates ngspice python3 wget \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs --create-home circuitflow \
  && mkdir -p /tmp/circuitflow-home/.config \
  && chown -R circuitflow:nodejs /tmp/circuitflow-home \
  && kicad-cli version \
  && ngspice -v \
  && node --version

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
