// ─────────────────────────────────────────────
//  models/User.js — Mongoose schema
//  Handles authentication + role-based access
//  Used by backend auth routes + middleware
// ─────────────────────────────────────────────

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
      index: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
      index: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // never returned in queries by default
    },

    role: {
      type: String,
      enum: {
        values: ["admin", "operator", "viewer"],
        message: "Role must be admin, operator, or viewer",
      },
      default: "viewer",
    },

    // Which campus buildings this user can access
    // Empty array = access to all (used for admin role)
    allowedBuildings: {
      type: [String],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLogin: {
      type: Date,
      default: null,
    },

    // For future: JWT refresh token invalidation
    tokenVersion: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // createdAt + updatedAt
  }
);

// ── Pre-save hook — hash password before storing ──
UserSchema.pre("save", async function (next) {
  // Only re-hash if password field was modified
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// ── Instance method — compare plain password with hash ──
UserSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

// ── Instance method — check if user can access a building ──
UserSchema.methods.canAccessBuilding = function (entityId) {
  if (this.role === "admin") return true;           // admins see everything
  if (this.allowedBuildings.length === 0) return true; // empty = all allowed
  return this.allowedBuildings.includes(entityId);
};

// ── Static method — find active user by username or email ──
UserSchema.statics.findByCredential = async function (identifier) {
  return this.findOne({
    $or: [{ username: identifier }, { email: identifier }],
    isActive: true,
  }).select("+password"); // explicitly include password for auth checks
};

// ── Virtual — public profile (no sensitive fields) ──
UserSchema.virtual("profile").get(function () {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
    allowedBuildings: this.allowedBuildings,
    lastLogin: this.lastLogin,
  };
});

export default mongoose.models.User || mongoose.model("User", UserSchema);