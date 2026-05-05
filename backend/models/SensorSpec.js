// ─────────────────────────────────────────────
//  models/SensorSpec.js — Mongoose schema
//  Defines what each sensor metric means
//  Used by the AI RAG layer for grounded answers
// ─────────────────────────────────────────────

import mongoose from "mongoose";

const SensorSpecSchema = new mongoose.Schema(
  {
    metric: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    unit: {
      type: String,
      required: true,
    },
    minNormal: Number,
    maxNormal: Number,
    // Value above which an anomaly alert is triggered
    alertThreshold: {
      type: Number,
      required: true,
    },
    description: String,
  },
  { timestamps: true }
);

export default mongoose.models.SensorSpec ||
  mongoose.model("SensorSpec", SensorSpecSchema);