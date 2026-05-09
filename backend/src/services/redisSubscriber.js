// ─────────────────────────────────────────────
//  services/redisSubscriber.js
//  Consumes Redis Pub/Sub on `city:live`
//  → writes to InfluxDB
//  → updates Redis hot-state cache
//  → triggers Socket.io broadcast
// ─────────────────────────────────────────────

import axios from "axios";
import { getWriteApi } from "../config/db.js";
import { getRedisClient } from "../config/redis.js";
import { broadcast, broadcastAnomaly, broadcastAiNarration } from "./socketBroadcast.js";
import { Point } from "@influxdata/influxdb-client";

const CHANNEL = process.env.REDIS_CHANNEL || "city:live";

// Thresholds — match what's in your MongoDB SensorSpec seed data
const THRESHOLDS = {
  energy: 420,       // kW
  temperature: 35,   // °C
  air_quality: 150,  // AQI
  traffic: 90,       // vehicle count
};

export async function startRedisSubscriber({ subscriberClient }) {
  await subscriberClient.subscribe(CHANNEL);
  console.log(`[redis-sub] subscribed to channel: ${CHANNEL}`);

  subscriberClient.on("message", async (channel, raw) => {
    if (channel !== CHANNEL) return;
    console.log(`[redis-sub] received update for ${channel}`);

    let event;
    try {
      event = JSON.parse(raw);
    } catch {
      console.warn("[redis-sub] received non-JSON message — skipping");
      return;
    }

    const { entityId, entityType, metric, value, unit, timestamp } = event;

    if (!entityId || !metric || value === undefined) {
      console.warn("[redis-sub] malformed event — skipping:", event);
      return;
    }

    // 1. Write to InfluxDB (async, non-blocking)
    writeToInflux({ entityId, entityType, metric, value, unit, timestamp });

    // 2. Update Redis hot-state cache
    await updateHotState({ entityId, metric, value });

    // 3. Broadcast to all connected browser clients
    broadcast({ entityId, entityType, metric, value, unit, timestamp });

    // 4. Check anomaly threshold and narrate if breached
    checkAnomaly({ entityId, metric, value });
  });

  subscriberClient.on("error", (err) =>
    console.error("[redis-sub] error:", err)
  );
}

// ── InfluxDB write ────────────────────────────
function writeToInflux({ entityId, entityType, metric, value, unit, timestamp }) {
  try {
    const writeApi = getWriteApi();
    const point = new Point("sensor_reading")
      .tag("entityId", entityId)
      .tag("entityType", entityType || "unknown")
      .tag("metric", metric)
      .tag("unit", unit || "")
      .floatField("value", parseFloat(value))
      .timestamp(timestamp ? new Date(timestamp) : new Date());

    writeApi.writePoint(point);
    // writeApi auto-flushes on interval — no need to await here
  } catch (err) {
    console.error("[influx] write error:", err.message);
  }
}

// ── Redis hot-state cache ─────────────────────
// Stores current reading as: city:state:<entityId>:<metric>
async function updateHotState({ entityId, metric, value }) {
  try {
    const redis = getRedisClient();
    const key = `city:state:${entityId}:${metric}`;
    await redis.set(key, value, "EX", 60); // expire after 60s of no updates
  } catch (err) {
    console.error("[redis] hot-state update error:", err.message);
  }
}

// ── Anomaly detection ─────────────────────────
// 1. Add 'async' here so you can await the AI response
async function checkAnomaly({ entityId, metric, value }) {
  const threshold = THRESHOLDS[metric];
  if (threshold === undefined) return;

  if (parseFloat(value) > threshold) {
    const alert = {
      entityId,
      metric,
      value,
      threshold,
      message: `${entityId}: ${metric} is ${value} — exceeds threshold of ${threshold}`,
      timestamp: new Date().toISOString(),
    };

    console.warn("[anomaly]", alert.message);
    
    // Broadcast the raw anomaly immediately so the UI shows the "Red" state instantly
    broadcastAnomaly(alert);

    // 2. Add the AI Service snippet here
    try {
      const aiRes = await axios.post(`${process.env.AI_SERVICE_URL}/alert`, {
        entityId, 
        metric, 
        value, 
        threshold,
        entityName: entityId, 
        unit: "" // Consider pulling this from your SensorSpec model later
      });

      // 3. Broadcast the AI's narration to the frontend (e.g., via Socket.io)
      if (aiRes.data && aiRes.data.narration) {
        broadcastAiNarration({
          entityId,
          narration: aiRes.data.narration
        });
      }
    } catch (error) {
      console.error("Failed to fetch AI narration:", error.message);
    }
  }
}