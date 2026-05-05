// ─────────────────────────────────────────────
//  routes/sensors.js — GET /api/sensors/history
// ─────────────────────────────────────────────

import { Router } from "express";
import { querySensorHistory, queryLatestReadings } from "../services/influxWriter.js";
import { getRedisClient } from "../config/redis.js";

const router = Router();

// GET /api/sensors/history?entityId=bldA&metric=energy&range=-1h
// Returns time-series data from InfluxDB for charts
router.get("/history", async (req, res) => {
  const { entityId, metric, range = "-1h" } = req.query;

  if (!entityId || !metric) {
    return res.status(400).json({
      success: false,
      error: "entityId and metric are required query params",
    });
  }

  // Validate range to prevent injection
  const validRanges = ["-15m", "-1h", "-6h", "-24h", "-7d"];
  if (!validRanges.includes(range)) {
    return res.status(400).json({
      success: false,
      error: `range must be one of: ${validRanges.join(", ")}`,
    });
  }

  try {
    const rows = await querySensorHistory(entityId, metric, range);
    res.json({ success: true, entityId, metric, range, data: rows });
  } catch (err) {
    console.error("[route/sensors] history error:", err.message);
    res.status(500).json({ success: false, error: "Failed to query history" });
  }
});

// GET /api/sensors/current?entityId=bldA
// Returns latest readings from Redis hot-state cache (instant)
router.get("/current", async (req, res) => {
  const { entityId } = req.query;

  if (!entityId) {
    return res.status(400).json({
      success: false,
      error: "entityId is required",
    });
  }

  try {
    const redis = getRedisClient();
    const metrics = ["energy", "temperature", "air_quality", "traffic"];
    const readings = {};

    await Promise.all(
      metrics.map(async (metric) => {
        const val = await redis.get(`city:state:${entityId}:${metric}`);
        if (val !== null) readings[metric] = parseFloat(val);
      })
    );

    res.json({ success: true, entityId, data: readings });
  } catch (err) {
    console.error("[route/sensors] current error:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch current readings" });
  }
});

// GET /api/sensors/latest?entityId=bldA
// Returns latest readings from InfluxDB (slightly slower, more accurate)
router.get("/latest", async (req, res) => {
  const { entityId } = req.query;

  if (!entityId) {
    return res.status(400).json({ success: false, error: "entityId is required" });
  }

  try {
    const readings = await queryLatestReadings(entityId);
    res.json({ success: true, entityId, data: readings });
  } catch (err) {
    console.error("[route/sensors] latest error:", err.message);
    res.status(500).json({ success: false, error: "Failed to query latest" });
  }
});

export default router;