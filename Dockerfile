# CT Group of Institutions - KRA & KPI Portal
# Production container for 24/7 Cloud Deployment

FROM node:20-bookworm-slim AS base

# Install compilation tools for native node addons (better-sqlite3)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    sqlite3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies (using npm install for cross-platform Linux resolution)
COPY web/package*.json ./
RUN npm install

# Copy application source
COPY web/ ./

# Production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Build Next.js application
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
