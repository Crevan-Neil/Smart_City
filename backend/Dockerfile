# ─────────────────────────────────────────────
#  BACKEND SERVICE — Dockerfile
#  Node.js 20 · Express · Socket.io · BullMQ
# ─────────────────────────────────────────────

FROM node:20-alpine

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy package files first — maximises layer cache hits
# (npm install only reruns when package.json changes)
COPY package*.json ./
RUN npm ci

# Copy source after deps to keep the install layer cached
COPY . .

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# docker-compose overrides CMD with `npm run dev` for hot reload
CMD ["node", "src/server.js"]