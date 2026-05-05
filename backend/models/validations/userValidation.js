// ─────────────────────────────────────────────
//  models/validations/userValidation.js
//  Zod schemas derived from models/User.js
//  Handles auth + role-based access validation
// ─────────────────────────────────────────────

import { z } from "zod";

// ── Core User schema ───────────────────────────────────────────────────────

export const UserSchema = z.object({
  username: z
    .string({ required_error: "Username is required" })
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters"),

  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .toLowerCase()
    .email("Please provide a valid email"),

  password: z
    .string({ required_error: "Password is required" })
    .min(6, "Password must be at least 6 characters"),

  role: z.enum(["admin", "operator", "viewer"]).default("viewer"),

  // Which campus buildings this user can access.
  // Empty array = access to all (used for admin role).
  allowedBuildings: z.array(z.string()).default([]),

  isActive: z.boolean().default(true),

  lastLogin: z.coerce.date().nullable().default(null),

  // For JWT refresh token invalidation
  tokenVersion: z.number().int().nonnegative().default(0),
});

// ── Registration schema — only what the client sends ──────────────────────

export const RegisterUserSchema = z.object({
  username: z
    .string({ required_error: "Username is required" })
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters"),

  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .toLowerCase()
    .email("Please provide a valid email"),

  password: z
    .string({ required_error: "Password is required" })
    .min(6, "Password must be at least 6 characters"),

  role: z.enum(["admin", "operator", "viewer"]).optional().default("viewer"),
});

// ── Login schema ───────────────────────────────────────────────────────────

export const LoginUserSchema = z.object({
  // Accepts either a username or an email address (mirrors findByCredential)
  identifier: z
    .string({ required_error: "Username or email is required" })
    .min(1, "Identifier cannot be empty"),

  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password cannot be empty"),
});

// ── Partial schema for PATCH / profile-update operations ──────────────────

export const UpdateUserSchema = UserSchema.partial().omit({
  password: true,      // password changes use a dedicated endpoint
  tokenVersion: true,  // managed internally, never updated by client
});

// ── Password change schema ─────────────────────────────────────────────────

export const ChangePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: "Current password is required" })
      .min(1, "Current password cannot be empty"),

    newPassword: z
      .string({ required_error: "New password is required" })
      .min(6, "New password must be at least 6 characters"),

    confirmPassword: z.string({
      required_error: "Please confirm your new password",
    }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// ── Convenience helpers ────────────────────────────────────────────────────

/**
 * Parse and validate a full User payload.
 * Throws a ZodError on failure.
 */
export const validateUser = (data) => UserSchema.parse(data);

/**
 * Parse and validate a registration payload.
 * Throws a ZodError on failure.
 */
export const validateRegisterUser = (data) => RegisterUserSchema.parse(data);

/**
 * Parse and validate a login payload.
 * Throws a ZodError on failure.
 */
export const validateLoginUser = (data) => LoginUserSchema.parse(data);

/**
 * Parse and validate a profile update payload.
 * Throws a ZodError on failure.
 */
export const validateUserUpdate = (data) => UpdateUserSchema.parse(data);

/**
 * Parse and validate a change-password payload.
 * Throws a ZodError on failure.
 */
export const validateChangePassword = (data) =>
  ChangePasswordSchema.parse(data);
