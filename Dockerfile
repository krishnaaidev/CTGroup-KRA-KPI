# CT Group of Institutions - KRA & KPI Portal
# Multi-stage production container for 24/7 Cloud Deployment

FROM node:20-bookworm-slim AS base

# Install compilation essentials for better-sqlite3 native bindings
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    sqlite3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests
COPY web/package*.json ./
RUN npm ci

# Copy project files
COPY web/ ./

# Set environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Build optimized Next.js bundle
RUN npm run build

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/login || exit 1

# Start server
CMD ["npm", "run", "start"]
