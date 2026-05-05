// ─────────────────────────────────────────────
//  server.js — Express + Socket.io entry point
//  Updated with full security middleware stack
// ─────────────────────────────────────────────

import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

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

const app = express();
const httpServer = http.createServer(app);

// ── Socket.io ─────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
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
app.use("/api", apiLimiter);           // 7. Global rate limit on all /api routes

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

  console.log(`[socket] client connected — ${socket.id} (${ip})`);

  socket.on("disconnect", () =>
    console.log(`[socket] client disconnected — ${socket.id}`)
  );

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