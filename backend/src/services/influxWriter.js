// ─────────────────────────────────────────────
//  services/influxWriter.js
//  Helper for querying sensor history from InfluxDB
//  (Writing is handled inline in redisSubscriber.js)
// ─────────────────────────────────────────────

import { getQueryApi } from "../config/db.js";

const BUCKET = process.env.INFLUX_BUCKET || "city_sensors";

/**
 * Query sensor history for a given entity + metric
 * over a time range (default: last 1 hour)
 *
 * @param {string} entityId
 * @param {string} metric
 * @param {string} range  — InfluxDB duration string e.g. "-1h", "-24h", "-7d"
 * @returns {Promise<Array<{ time, value }>>}
 */
export async function querySensorHistory(entityId, metric, range = "-1h") {
  const queryApi = getQueryApi();

  const flux = `
    from(bucket: "${BUCKET}")
      |> range(start: ${range})
      |> filter(fn: (r) => r._measurement == "sensor_reading")
      |> filter(fn: (r) => r.entityId == "${entityId}")
      |> filter(fn: (r) => r.metric == "${metric}")
      |> keep(columns: ["_time", "_value"])
      |> sort(columns: ["_time"])
  `;

  const rows = [];

  return new Promise((resolve, reject) => {
    queryApi.queryRows(flux, {
      next(row, tableMeta) {
        const obj = tableMeta.toObject(row);
        rows.push({ time: obj._time, value: obj._value });
      },
      error(err) {
        console.error("[influx] query error:", err.message);
        reject(err);
      },
      complete() {
        resolve(rows);
      },
    });
  });
}

/**
 * Query the latest reading for every metric of a given entity
 * Used by the AI service context builder
 */
export async function queryLatestReadings(entityId) {
  const queryApi = getQueryApi();

  const flux = `
    from(bucket: "${BUCKET}")
      |> range(start: -5m)
      |> filter(fn: (r) => r._measurement == "sensor_reading")
      |> filter(fn: (r) => r.entityId == "${entityId}")
      |> last()
      |> keep(columns: ["metric", "_value"])
  `;

  const results = {};

  return new Promise((resolve, reject) => {
    queryApi.queryRows(flux, {
      next(row, tableMeta) {
        const obj = tableMeta.toObject(row);
        results[obj.metric] = obj._value;
      },
      error(err) {
        console.error("[influx] latest query error:", err.message);
        reject(err);
      },
      complete() {
        resolve(results);
      },
    });
  });
}