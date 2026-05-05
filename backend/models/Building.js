// ─────────────────────────────────────────────
//  models/Building.js — Mongoose schema
//  Shared between backend and ai_service
// ─────────────────────────────────────────────

import mongoose from "mongoose";

const BuildingSchema = new mongoose.Schema(
  {
    entityId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    // Real-world geographic coordinates
    coords: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    // 3D scene position (local coordinate system)
    scenePosition: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      z: { type: Number, default: 0 },
    },
    floorCount: {
      type: Number,
      default: 1,
    },
    // Maximum power capacity in kW — used for normalisation in 3D color mapping
    maxCapacity: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ["academic", "admin", "residential", "utility"],
      default: "academic",
    },
    // Which sensor metrics this building reports
    sensors: {
      type: [String],
      default: ["energy", "temperature"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Building ||
  mongoose.model("Building", BuildingSchema);