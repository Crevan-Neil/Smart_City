// ─────────────────────────────────────────────
//  models/validations/junctionValidation.js
//  Zod schemas derived from models/Junction.js
// ─────────────────────────────────────────────

import { z } from "zod";

// ── Sub-schemas ────────────────────────────────────────────────────────────

const CoordsSchema = z.object({
  lat: z.number({ required_error: "Latitude is required" }),
  lng: z.number({ required_error: "Longitude is required" }),
});

const ScenePositionSchema = z.object({
  x: z.number().default(0),
  y: z.number().default(0),
  z: z.number().default(0),
});

// ── Core Junction schema ───────────────────────────────────────────────────

export const JunctionSchema = z.object({
  entityId: z
    .string({ required_error: "entityId is required" })
    .min(1, "entityId cannot be empty"),

  name: z
    .string({ required_error: "name is required" })
    .min(1, "name cannot be empty"),

  coords: CoordsSchema,

  scenePosition: ScenePositionSchema.optional().default({ x: 0, y: 0, z: 0 }),

  // Default green-phase duration in seconds
  defaultPhaseDuration: z
    .number()
    .int()
    .positive("defaultPhaseDuration must be a positive integer")
    .default(30),

  isActive: z.boolean().default(true),
});

// ── Partial schema for PATCH / update operations ───────────────────────────

export const UpdateJunctionSchema = JunctionSchema.partial().omit({
  entityId: true,
});

// ── Convenience helpers ────────────────────────────────────────────────────

/**
 * Parse and validate a raw Junction payload.
 * Throws a ZodError on failure.
 */
export const validateJunction = (data) => JunctionSchema.parse(data);

/**
 * Parse and validate a partial Junction update payload.
 * Throws a ZodError on failure.
 */
export const validateJunctionUpdate = (data) =>
  UpdateJunctionSchema.parse(data);
