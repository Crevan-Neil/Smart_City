// ─────────────────────────────────────────────
//  models/validations/index.js
//  Barrel file — re-exports all Zod validation
//  schemas from a single import point.
//
//  Usage:
//    import { RegisterUserSchema, validateBuilding } from
//      "../models/validations/index.js";
// ─────────────────────────────────────────────

export * from "./buildingValidation.js";
export * from "./junctionValidation.js";
export * from "./sensorSpecValidation.js";
export * from "./userValidation.js";
