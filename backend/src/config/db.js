// ─────────────────────────────────────────────
//  config/db.js — Mongoose + InfluxDB clients
// ─────────────────────────────────────────────

import mongoose from "mongoose";
import { InfluxDB } from "@influxdata/influxdb-client";

// ── MongoDB ───────────────────────────────────
let mongoConnected = false;

export async function connectMongo() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is not defined in environment");

  await mongoose.connect(uri);
  mongoConnected = true;
  console.log("[mongo] connected");

  mongoose.connection.on("disconnected", () => {
    console.warn("[mongo] disconnected — attempting reconnect...");
    mongoConnected = false;
  });
  mongoose.connection.on("reconnected", () => {
    console.log("[mongo] reconnected");
    mongoConnected = true;
  });
}

export function isMongoConnected() {
  return mongoConnected;
}

// ── InfluxDB ──────────────────────────────────
let influxClient = null;
let writeApi = null;
let queryApi = null;

export async function connectInflux() {
  const url = process.env.INFLUX_URL;
  const token = process.env.INFLUX_TOKEN;
  const org = process.env.INFLUX_ORG;
  const bucket = process.env.INFLUX_BUCKET;

  if (!url || !token || !org || !bucket) {
    throw new Error("InfluxDB environment variables missing");
  }

  influxClient = new InfluxDB({ url, token });
  writeApi = influxClient.getWriteApi(org, bucket, "ms"); // millisecond precision
  queryApi = influxClient.getQueryApi(org);

  // Flush writes every 5 seconds or 500 records (whichever comes first)
  writeApi.useDefaultTags({ service: "smart_city" });

  console.log("[influx] client ready");
}

export function getWriteApi() {
  if (!writeApi) throw new Error("InfluxDB writeApi not initialised");
  return writeApi;
}

export function getQueryApi() {
  if (!queryApi) throw new Error("InfluxDB queryApi not initialised");
  return queryApi;
}