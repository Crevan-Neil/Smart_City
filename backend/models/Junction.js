// ─────────────────────────────────────────────
//  models/Junction.js — Mongoose schema
// ─────────────────────────────────────────────

import mongoose from "mongoose";

const JunctionSchema = new mongoose.Schema(
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
    coords: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    scenePosition: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      z: { type: Number, default: 0 },
    },
    // Default green-phase duration in seconds
    defaultPhaseDuration: {
      type: Number,
      default: 30,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Junction ||
  mongoose.model("Junction", JunctionSchema);