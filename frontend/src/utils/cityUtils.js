// ─────────────────────────────────────────────
//  utils/cityUtils.js
//  Shared helpers & constants for the Smart City frontend
// ─────────────────────────────────────────────

// ── Sensor alert thresholds (single source of truth) ──
// Used by: Sidebar, MetricCard, EnergyChart, TrafficChart
export const THRESHOLDS = {
  energy:      420,   // kW
  temperature:  35,   // °C
  air_quality: 150,   // AQI
  traffic:      90,   // veh/min
};

// ── Convert hex colour → "r,g,b" for use inside rgba() ──
// e.g. hexToRgb("#00e5ff") === "0,229,255"
export function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
