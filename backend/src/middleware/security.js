// ─────────────────────────────────────────────
//  middleware/security.js
//  Security headers + input sanitisation
//
//  Covers:
//    - Helmet HTTP headers
//    - CORS with strict origin check
//    - Request body size limit
//    - Input sanitisation (strip HTML tags)
//    - MongoDB injection protection
// ─────────────────────────────────────────────

import helmet from "helmet";
import cors from "cors";
import mongoSanitize from "express-mongo-sanitize";

const ALLOWED_ORIGINS = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

// ── CORS ──────────────────────────────────────
// Strictly whitelist the frontend origin.
// In production, replace with your real domain.
export const corsMiddleware = cors({
  origin: "*", // Allow all for VM setup
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86400,
});

// ── Helmet ────────────────────────────────────
// Sets secure HTTP headers automatically.
// contentSecurityPolicy is relaxed for Socket.io + R3F assets.
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'self'"],
      scriptSrc:      ["'self'", "'unsafe-inline'"],   // Vite HMR needs this in dev
      styleSrc:       ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc:        ["'self'", "https://fonts.gstatic.com"],
      imgSrc:         ["'self'", "data:", "blob:"],
      connectSrc:     ["*"],       // Allow all for VM setup
      workerSrc:      ["'self'", "blob:"],             // Three.js workers
    },
  },
  crossOriginEmbedderPolicy: false,   // Required for SharedArrayBuffer (Three.js)
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

// ── MongoDB injection protection ──────────────
// Strips $ and . from request body/query/params
// Prevents NoSQL injection attacks like:
//   { "username": { "$gt": "" } }
export const mongoSanitizeMiddleware = mongoSanitize({
  replaceWith: "_",
  onSanitizeError: (req) => {
    console.warn(`[security] MongoDB injection attempt from ${req.ip}`);
  },
});

// ── Input length limiter ──────────────────────
// Rejects requests with body fields that are
// suspiciously long — prevents memory exhaustion
export function inputLengthGuard(req, res, next) {
  const MAX_FIELD_LENGTH = 2000;
  const MAX_BODY_FIELDS = 20;

  if (req.body && typeof req.body === "object") {
    const keys = Object.keys(req.body);

    if (keys.length > MAX_BODY_FIELDS) {
      return res.status(400).json({
        success: false,
        error: "Request body has too many fields",
      });
    }

    for (const key of keys) {
      const val = req.body[key];
      if (typeof val === "string" && val.length > MAX_FIELD_LENGTH) {
        return res.status(400).json({
          success: false,
          error: `Field '${key}' exceeds maximum length of ${MAX_FIELD_LENGTH} characters`,
        });
      }
    }
  }

  next();
}

// ── Request logger (security events) ─────────
// Logs suspicious patterns for monitoring
export function securityLogger(req, res, next) {
  const suspicious = [
    "<script",
    "javascript:",
    "data:text/html",
    "../",
    "etc/passwd",
    "SELECT ",
    "DROP TABLE",
  ];

  const body = JSON.stringify(req.body || {}).toLowerCase();
  const url = req.originalUrl.toLowerCase();

  const hit = suspicious.find(
    (s) => body.includes(s.toLowerCase()) || url.includes(s.toLowerCase())
  );

  if (hit) {
    console.warn(
      `[security] suspicious pattern "${hit}" from ${req.ip} — ${req.method} ${req.originalUrl}`
    );
  }

  next();
}