// ─────────────────────────────────────────────
//  models/validations/sensorSpecValidation.js
//  Zod schemas derived from models/SensorSpec.js
// ─────────────────────────────────────────────

import { z } from "zod";

// ── Core SensorSpec schema ─────────────────────────────────────────────────

export const SensorSpecSchema = z.object({
  // Unique metric identifier, e.g. "energy", "temperature", "co2"
  metric: z
    .string({ required_error: "metric is required" })
    .min(1, "metric cannot be empty"),

  // Physical unit of measurement, e.g. "kWh", "°C", "ppm"
  unit: z
    .string({ required_error: "unit is required" })
    .min(1, "unit cannot be empty"),

  // Lower bound of the normal operating range (optional)
  minNormal: z.number().optional(),

  // Upper bound of the normal operating range (optional)
  maxNormal: z.number().optional(),

  // Value above which an anomaly alert is triggered
  alertThreshold: z.number({ required_error: "alertThreshold is required" }),

  // Human-readable description used by AI RAG layer for grounded answers
  description: z.string().optional(),
});

// ── Partial schema for PATCH / update operations ───────────────────────────

export const UpdateSensorSpecSchema = SensorSpecSchema.partial().omit({
  metric: true, // metric (the primary key) must not change after creation
});

// ── Convenience helpers ────────────────────────────────────────────────────

/**
 * Parse and validate a raw SensorSpec payload.
 * Throws a ZodError on failure.
 */
export const validateSensorSpec = (data) => SensorSpecSchema.parse(data);

/**
 * Parse and validate a partial SensorSpec update payload.
 * Throws a ZodError on failure.
 */
export const validateSensorSpecUpdate = (data) =>
  UpdateSensorSpecSchema.parse(data);
