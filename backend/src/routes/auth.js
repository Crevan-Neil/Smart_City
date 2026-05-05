// ─────────────────────────────────────────────
//  routes/auth.js — POST /api/auth
//  Real authentication using User model
//  + bcrypt password comparison
//  + JWT token signing
// ─────────────────────────────────────────────

import { Router } from "express";
import jwt from "jsonwebtoken";
import User from "../../models/User.js";
import { validateLoginUser, validateRegisterUser } from "../../models/validations/index.js";

const router = Router();

if (!process.env.JWT_SECRET) {
  throw new Error("FATAL: JWT_SECRET environment variable is missing.");
}
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

// ── Middleware — verify JWT on protected routes ──
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
}

// ── Middleware — restrict to specific roles ──
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied — requires role: ${roles.join(" or ")}`,
      });
    }
    next();
  };
}

// ── POST /api/auth/login ──────────────────────
// Body: { identifier, password }
// identifier can be username OR email
router.post("/login", async (req, res, next) => {
  try {
    const { identifier, password } = validateLoginUser(req.body);
    // findByCredential selects +password explicitly
    const user = await User.findByCredential(identifier);

    if (!user) {
      // Intentionally vague — don't reveal whether user exists
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    // Update last login timestamp
    await User.updateOne({ _id: user._id }, { lastLogin: new Date() });

    // Sign JWT
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        role: user.role,
        allowedBuildings: user.allowedBuildings,
        tokenVersion: user.tokenVersion,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      token,
      user: user.profile,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/verify ─────────────────────
// Checks if a JWT is still valid and returns the decoded user
router.post("/verify", async (req, res, next) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, error: "Token is required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ success: false, valid: false, error: "Token no longer valid" });
    }

    res.json({ success: true, valid: true, user: decoded });
  } catch (err) {
    res.status(401).json({ success: false, valid: false, error: "Invalid or expired token" });
  }
});

// ── POST /api/auth/register ───────────────────
router.post("/register", async (req, res, next) => {
  try {
    const { username, email, password, role, allowedBuildings } = validateRegisterUser(req.body);
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: "Username or email already in use",
      });
    }

    const user = await User.create({
      username,
      email,
      password,
      role: role || "viewer",
      allowedBuildings: allowedBuildings || [],
    });

    // Sign JWT for auto-login after registration
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        role: user.role,
        allowedBuildings: user.allowedBuildings,
        tokenVersion: user.tokenVersion,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      token,
      user: user.profile,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/logout ─────────────────────
// Increments tokenVersion — invalidates all existing JWTs for this user
router.post("/logout", requireAuth, async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.user.id },
      { $inc: { tokenVersion: 1 } }
    );
    res.json({ success: true, message: "Logged out — all sessions invalidated" });
  } catch (err) {
    console.error("[auth] logout error:", err.message);
    res.status(500).json({ success: false, error: "Logout failed" });
  }
});

// ── GET /api/auth/me ──────────────────────────
// Returns the current user's profile from the token
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    res.json({ success: true, user: user.profile });
  } catch (err) {
    console.error("[auth] me error:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch profile" });
  }
});

export default router;