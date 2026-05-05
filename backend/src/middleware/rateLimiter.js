// ─────────────────────────────────────────────
//  middleware/rateLimiter.js
//  Rate limiting middleware using express-rate-limit
//  + Redis store for distributed limiting
//
//  Three limiters with different strictness:
//    authLimiter     — strictest  (login brute-force)
//    simLimiter      — moderate   (sim job spam)
//    apiLimiter      — lenient    (general API calls)
// ─────────────────────────────────────────────

import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { getRedisClient } from "../config/redis.js";

// ── Helper: build a limiter with a Redis store ──
function createLimiter({
  windowMs,
  max,
  message,
  keyPrefix,
}) {
  return rateLimit({
    windowMs,
    max,
    // Use Redis so limits survive server restarts
    // and work across multiple backend instances
    store: new RedisStore({
      sendCommand: (...args) => getRedisClient().call(...args),
      prefix: `rl:${keyPrefix}:`,
    }),
    standardHeaders: true,   // Return RateLimit-* headers
    legacyHeaders: false,     // Disable X-RateLimit-* headers
    handler: (req, res) => {
      const retryAfter = Math.ceil(windowMs / 1000);
      res.status(429).json({
        success: false,
        error: message,
        retryAfterSeconds: retryAfter,
      });
    },
    // Disable built-in IP validation as we handle it manually
    // and use custom key generators.
    validate: { ip: false },
    // Key by IP address
    keyGenerator: (req) =>
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.ip ||
      "unknown",
  });
}

// ── Auth limiter ──────────────────────────────
// 10 login attempts per 15 minutes per IP
// Protects against brute-force password attacks
export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message:
    "Too many login attempts from this IP. Please wait 15 minutes before trying again.",
  keyPrefix: "auth",
});

// ── Simulation limiter ────────────────────────
// 20 trigger requests per minute per IP
// Prevents Redis/BullMQ job queue flooding
export const simLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message:
    "Too many simulation requests. You can trigger up to 20 events per minute.",
  keyPrefix: "sim",
});

// ── General API limiter ───────────────────────
// 200 requests per minute per IP
// Baseline protection on all routes
export const apiLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 200,
  message:
    "Too many requests from this IP. Please slow down.",
  keyPrefix: "api",
});

// ── Socket.io connection limiter ──────────────
// Applied manually in server.js — not Express middleware
// Tracks connection count per IP using Redis
export async function checkSocketLimit(ip) {
  const redis = getRedisClient();
  const key = `rl:socket:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 60); // reset count every 60s
  }
  // Allow max 5 socket connections per IP per minute
  return count <= 5;
}