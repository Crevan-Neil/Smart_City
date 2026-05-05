// ─────────────────────────────────────────────
//  components/dashboard/MetricCard.jsx
//  Single sensor metric — live-updating stat card
// ─────────────────────────────────────────────

import { useEffect, useRef } from "react";

const METRIC_META = {
  energy:      { label: "Energy",      unit: "kW",      icon: "⚡", accent: "#00e5ff" },
  temperature: { label: "Temperature", unit: "°C",      icon: "🌡", accent: "#f59e0b" },
  air_quality: { label: "Air Quality", unit: "AQI",     icon: "💨", accent: "#a855f7" },
  traffic:     { label: "Traffic",     unit: "veh/min", icon: "🚗", accent: "#00e5a0" },
};

export default function MetricCard({ metric, value, threshold, isAlert }) {
  const meta = METRIC_META[metric] || {
    label: metric, unit: "", icon: "📊", accent: "#00e5ff",
  };

  const displayValue = value != null ? Number(value).toFixed(1) : "—";
  const pct = threshold ? Math.min((value / threshold) * 100, 100) : 0;

  return (
    <div
      style={{
        background: isAlert
          ? "rgba(239,68,68,0.08)"
          : "rgba(10, 25, 41, 0.7)",
        border: `1px solid ${isAlert ? "#ef444440" : meta.accent + "30"}`,
        borderRadius: "10px",
        padding: "12px 14px",
        backdropFilter: "blur(10px)",
        transition: "all 0.3s ease",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Alert pulse overlay */}
      {isAlert && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(239,68,68,0.04)",
            animation: "pulse 2s ease-in-out infinite",
            borderRadius: "10px",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: "#7a9bb5", fontFamily: "monospace", letterSpacing: "0.06em" }}>
          {meta.icon} {meta.label.toUpperCase()}
        </span>
        {isAlert && (
          <span style={{ fontSize: 9, color: "#ef4444", fontWeight: 700, letterSpacing: "0.1em" }}>
            ⚠ ALERT
          </span>
        )}
      </div>

      {/* Value */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span
          style={{
            fontSize: 26,
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            color: isAlert ? "#ef4444" : meta.accent,
            lineHeight: 1,
            transition: "color 0.3s",
          }}
        >
          {displayValue}
        </span>
        <span style={{ fontSize: 11, color: "#4a7a9b", fontFamily: "monospace" }}>
          {meta.unit}
        </span>
      </div>

      {/* Progress bar */}
      {threshold && (
        <div
          style={{
            marginTop: 10,
            height: 3,
            background: "rgba(255,255,255,0.06)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: isAlert
                ? "#ef4444"
                : pct > 75
                ? "#f59e0b"
                : meta.accent,
              borderRadius: 2,
              transition: "width 0.8s ease, background 0.3s",
            }}
          />
        </div>
      )}
    </div>
  );
}