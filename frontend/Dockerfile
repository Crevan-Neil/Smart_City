# ─────────────────────────────────────────────
#  FRONTEND SERVICE — Dockerfile
#  Node.js 20 · React · Vite · R3F · Tailwind
#
#  Two stages:
#    dev   — used by docker-compose (hot reload)
#    prod  — optimised static build via nginx
# ─────────────────────────────────────────────

# ── Stage 1: Development (default for compose) ──
FROM node:20-alpine AS dev

WORKDIR /app

RUN apk add --no-cache curl

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 5173

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:5173 || exit 1

# docker-compose overrides this with: npm run dev -- --host
CMD ["npm", "run", "dev", "--", "--host"]


# ── Stage 2: Production build ─────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Vite reads VITE_ vars at build time — pass them as build args
ARG VITE_API_URL
ARG VITE_SOCKET_URL
ARG VITE_AI_URL

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_AI_URL=$VITE_AI_URL

RUN npm run build


# ── Stage 3: Production serve via nginx ───────
FROM nginx:alpine AS prod

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config for React SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]