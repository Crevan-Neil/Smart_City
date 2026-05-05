// ─────────────────────────────────────────────
//  models/validations/buildingValidation.js
//  Zod schemas derived from models/Building.js
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

// ── Core Building schema ───────────────────────────────────────────────────

export const BuildingSchema = z.object({
  entityId: z
    .string({ required_error: "entityId is required" })
    .min(1, "entityId cannot be empty"),

  name: z
    .string({ required_error: "name is required" })
    .min(1, "name cannot be empty"),

  coords: CoordsSchema,

  scenePosition: ScenePositionSchema.optional().default({ x: 0, y: 0, z: 0 }),

  floorCount: z.number().int().positive().default(1),

  // Maximum power capacity in kW — used for normalisation in 3D colour mapping
  maxCapacity: z.number({ required_error: "maxCapacity is required" }).positive(
    "maxCapacity must be a positive number"
  ),

  type: z
    .enum(["academic", "admin", "residential", "utility"])
    .default("academic"),

  // Which sensor metrics this building reports
  sensors: z.array(z.string()).default(["energy", "temperature"]),

  isActive: z.boolean().default(true),
});

// ── Partial schema for PATCH / update operations ───────────────────────────

export const UpdateBuildingSchema = BuildingSchema.partial().omit({
  entityId: true, // entityId must not change after creation
});

// ── Convenience: validate and return typed data ────────────────────────────

/**
 * Parse and validate a raw Building payload.
 * Throws a ZodError on failure.
 */
export const validateBuilding = (data) => BuildingSchema.parse(data);

/**
 * Parse and validate a partial Building update payload.
 * Throws a ZodError on failure.
 */
export const validateBuildingUpdate = (data) =>
  UpdateBuildingSchema.parse(data);
