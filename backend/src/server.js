// ─────────────────────────────────────────────
//  server.js — Express + Socket.io entry point
//  Updated with full security middleware stack
//  + Prometheus metrics via prom-client
// ─────────────────────────────────────────────

import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import client from "prom-client";

import { connectMongo, connectInflux } from "./config/db.js";
import { connectRedis } from "./config/redis.js";
import { startRedisSubscriber } from "./services/redisSubscriber.js";
import { initSocketBroadcast } from "./services/socketBroadcast.js";
import { initWorkers } from "./bullmq/workers.js";

import buildingsRouter  from "./routes/buildings.js";
import junctionsRouter  from "./routes/junctions.js";
import sensorsRouter    from "./routes/sensors.js";
import authRouter       from "./routes/auth.js";
import simulationRouter from "./routes/simulation.js";

import {
  corsMiddleware,
  helmetMiddleware,
  mongoSanitizeMiddleware,
  inputLengthGuard,
  securityLogger,
} from "./middleware/security.js";

import {
  apiLimiter,
  authLimiter,
  simLimiter,
  checkSocketLimit,
} from "./middleware/rateLimiter.js";

// ── Prometheus setup ──────────────────────────
// Collect default metrics: CPU, memory, event loop lag, GC, etc.
const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: "nodejs_" });

// Counter — total HTTP requests (labelled by method, route, status)
const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
  registers: [register],
});

// Histogram — request duration in seconds
const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});

// Gauge — live WebSocket connection count
export const wsConnectionsActive = new client.Gauge({
  name: "websocket_connections_active",
  help: "Number of active WebSocket connections",
  registers: [register],
});

// ── Metrics request-tracking middleware ───────
function metricsMiddleware(req, res, next) {
  const end = httpRequestDuration.startTimer();
  res.on("finish", () => {
    // Normalize dynamic route segments (/api/buildings/123 → /api/buildings/:id)
    const route = req.route?.path
      ? `${req.baseUrl || ""}${req.route.path}`
      : req.path;
    const labels = {
      method: req.method,
      route,
      status: res.statusCode,
    };
    httpRequestsTotal.inc(labels);
    end(labels);
  });
  next();
}

const app = express();
const httpServer = http.createServer(app);

// ── Socket.io ─────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins for VM deployment
    methods: ["GET", "POST"],
  },
  // Limit payload size to prevent memory attacks
  maxHttpBufferSize: 1e5,   // 100 KB
});

// Verify JWT on socket connection (pre-connection)
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error("Authentication error: Invalid token"));
  }
});

// ── Security middleware (order matters) ───────
app.use(helmetMiddleware);             // 1. Security headers first
app.use(corsMiddleware);               // 2. CORS
app.use(express.json({ limit: "50kb" })); // 3. Body parse with size limit
app.use(mongoSanitizeMiddleware);      // 4. Strip NoSQL injection chars
app.use(securityLogger);               // 5. Log suspicious patterns
app.use(inputLengthGuard);             // 6. Reject oversized fields
app.use(metricsMiddleware);            // 7. Track request metrics
app.use("/api", apiLimiter);           // 8. Global rate limit on all /api routes

// ── Prometheus metrics endpoint ───────────────
// No auth, no rate limit — only reachable inside Docker network by Prometheus
app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// ── Health check (no auth, no rate limit) ─────
app.get("/health", (_req, res) =>
  res.json({ status: "ok", ts: Date.now() })
);

// ── REST routes with targeted rate limits ─────
app.use("/api/auth",      authLimiter, authRouter);       // strictest
app.use("/api/sim",       simLimiter,  simulationRouter);  // moderate
app.use("/api/buildings", buildingsRouter);
app.use("/api/junctions", junctionsRouter);
app.use("/api/sensors",   sensorsRouter);

// ── Global Error Handler ──────────────────────
app.use((err, req, res, next) => {
  console.error("[server] Unhandled Error:", err.stack || err.message);
  
  if (err.name === "ZodError") {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      issues: err.errors,
    });
  }

  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal Server Error",
  });
});

// ── Socket.io connection with IP limiting ─────
io.on("connection", async (socket) => {
  const ip =
    socket.handshake.headers["x-forwarded-for"] ||
    socket.handshake.address ||
    "unknown";

  // Check per-IP socket connection limit
  const allowed = await checkSocketLimit(ip).catch(() => true);
  if (!allowed) {
    console.warn(`[socket] connection limit exceeded for ${ip} — disconnecting`);
    socket.emit("error", { message: "Connection limit exceeded" });
    socket.disconnect(true);
    return;
  }

  wsConnectionsActive.inc();
  console.log(`[socket] client connected — ${socket.id} (${ip})`);

  socket.on("disconnect", () => {
    wsConnectionsActive.dec();
    console.log(`[socket] client disconnected — ${socket.id}`);
  });

  // Reject any client-sent events with large payloads
  socket.use(([event, ...args], next) => {
    const size = JSON.stringify(args).length;
    if (size > 10_000) {
      console.warn(`[socket] oversized event '${event}' (${size}B) from ${socket.id}`);
      return next(new Error("Payload too large"));
    }
    next();
  });
});

// ── Boot sequence ─────────────────────────────
async function start() {
  try {
    await connectMongo();
    await connectInflux();
    const redisClient = await connectRedis();

    initSocketBroadcast(io);
    await startRedisSubscriber(redisClient);
    initWorkers();

    const PORT = process.env.PORT || 3001;
    httpServer.listen(PORT, () =>
      console.log(`[server] running on http://localhost:${PORT}`)
    );
  } catch (err) {
    console.error("[server] failed to start:", err);
    process.exit(1);
  }
}

start();

export { io };