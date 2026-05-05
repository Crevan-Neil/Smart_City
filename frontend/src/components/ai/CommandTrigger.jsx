// ─────────────────────────────────────────────
//  components/ai/CommandTrigger.jsx
//  Simulation command panel — trigger events
//  from the dashboard → BullMQ → Python sim
// ─────────────────────────────────────────────

import { useState, useEffect } from "react";
import useUIStore from "../../store/uiStore";
import useCityStore from "../../store/cityStore";

import { hexToRgb } from "../../utils/cityUtils";

const SIM_TYPES = [
  {
    type: "traffic_surge",
    label: "Traffic Surge",
    icon: "🚗",
    desc: "Spike vehicle count at junction",
    accent: "#f59e0b",
    defaultDuration: 30,
    defaultIntensity: 2.5,
  },
  {
    type: "power_spike",
    label: "Power Spike",
    icon: "⚡",
    desc: "Overload building energy consumption",
    accent: "#00e5ff",
    defaultDuration: 20,
    defaultIntensity: 2.0,
  },
  {
    type: "air_quality_drop",
    label: "Air Quality Drop",
    icon: "💨",
    desc: "Simulate pollution event",
    accent: "#a855f7",
    defaultDuration: 45,
    defaultIntensity: 3.0,
  },
  {
    type: "custom",
    label: "Custom Event",
    icon: "⚙",
    desc: "Set all parameters manually",
    accent: "#00e5a0",
    defaultDuration: 30,
    defaultIntensity: 1.5,
  },
];

function StatusBadge({ status }) {
  const map = {
    idle:    { color: "#4a7a9b", label: "READY" },
    sending: { color: "#f59e0b", label: "SENDING..." },
    success: { color: "#00e5a0", label: "QUEUED ✓" },
    error:   { color: "#ef4444", label: "FAILED ✗" },
  };
  const s = map[status] || map.idle;
  return (
    <span style={{ fontSize: 9, color: s.color, fontFamily: "monospace", letterSpacing: "0.1em" }}>
      {s.label}
    </span>
  );
}

export default function CommandTrigger() {
  const isOpen = useUIStore((s) => s.isCommandPanelOpen);
  const toggleCommandPanel = useUIStore((s) => s.toggleCommandPanel);
  const buildings = useCityStore((s) => s.buildings);
  const junctions = useCityStore((s) => s.junctions);
  const selectedId = useUIStore((s) => s.selectedEntityId);

  const [selectedType, setSelectedType] = useState(SIM_TYPES[0]);
  const [entityId, setEntityId] = useState(selectedId || "");
  const [duration, setDuration] = useState(30);
  const [intensity, setIntensity] = useState(2.0);
  const [status, setStatus] = useState("idle");
  const [lastJobId, setLastJobId] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

  // All selectable entities — filtered by type to prevent invalid sim requests
  const allEntities = [
    ...buildings.map((b) => ({ id: b.entityId, label: b.name, type: "building", sensors: b.sensors })),
    ...junctions.map((j) => ({ id: j.entityId, label: j.name, type: "junction", sensors: ["traffic"] })),
  ].filter((e) => {
    if (selectedType.type === "traffic_surge") return e.type === "junction";
    if (selectedType.type === "power_spike") return e.sensors?.includes("energy");
    if (selectedType.type === "air_quality_drop") return e.sensors?.includes("air_quality");
    return true; // custom shows all
  });

  // Sync entity dropdown when user clicks something in the 3D scene
  useEffect(() => {
    if (selectedId) setEntityId(selectedId);
  }, [selectedId]);

  // Reset entityId if current selection is filtered out by a new event type
  useEffect(() => {
    if (entityId && !allEntities.find(e => e.id === entityId)) {
      setEntityId("");
    }
  }, [selectedType, allEntities, entityId]);

  async function handleTrigger() {
    if (!entityId) return;
    setStatus("sending");

    try {
      const res = await fetch(`${API_URL}/api/sim/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType.type,
          entityId,
          duration,
          intensity,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Request failed");
      }

      setLastJobId(data.jobId);
      setStatus("success");
      setTimeout(() => setStatus("idle"), 4000);
    } catch (err) {
      console.error("[CommandTrigger]", err.message);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        width: 320,
        background: "rgba(4,12,22,0.94)",
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(168,85,247,0.22)",
        borderRadius: 14,
        zIndex: 200,
        overflow: "hidden",
        boxShadow: "0 0 40px rgba(168,85,247,0.08), 0 20px 60px rgba(0,0,0,0.5)",
        animation: "slideUp 0.25s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          padding: "12px 14px",
          borderBottom: "1px solid rgba(168,85,247,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#a855f7",
              fontFamily: "monospace",
              letterSpacing: "0.06em",
            }}
          >
            ⚡ SIM COMMAND
          </div>
          <div style={{ fontSize: 9, color: "#4a2a7a", fontFamily: "monospace", marginTop: 1 }}>
            INJECT SIMULATION EVENT
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <StatusBadge status={status} />
          <button
            onClick={toggleCommandPanel}
            style={{
              background: "none", border: "none",
              color: "#4a7a9b", fontSize: 16, cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>
      </div>

      <div style={{ padding: "14px 14px" }}>

        {/* ── Event type selector ── */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 9, color: "#4a7a9b", fontFamily: "monospace", letterSpacing: "0.08em", marginBottom: 7 }}>
            EVENT TYPE
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {SIM_TYPES.map((t) => (
              <button
                key={t.type}
                onClick={() => {
                  setSelectedType(t);
                  setDuration(t.defaultDuration);
                  setIntensity(t.defaultIntensity);
                }}
                style={{
                  padding: "8px 8px",
                  background: selectedType.type === t.type
                    ? `rgba(${hexToRgb(t.accent)},0.12)`
                    : "rgba(255,255,255,0.02)",
                  border: `1px solid ${selectedType.type === t.type
                    ? t.accent + "50"
                    : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 7,
                  color: selectedType.type === t.type ? t.accent : "#4a7a9b",
                  fontSize: 10,
                  fontFamily: "monospace",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontSize: 14, marginBottom: 2 }}>{t.icon}</div>
                <div style={{ fontWeight: 600, lineHeight: 1.2 }}>{t.label}</div>
                <div style={{ fontSize: 9, opacity: 0.6, marginTop: 1 }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Target entity ── */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: "#4a7a9b", fontFamily: "monospace", letterSpacing: "0.08em", marginBottom: 6 }}>
            TARGET ENTITY
          </div>
          <select
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            style={{
              width: "100%",
              background: "rgba(10,25,41,0.8)",
              border: "1px solid rgba(168,85,247,0.2)",
              borderRadius: 7,
              padding: "8px 10px",
              color: "#c8dff0",
              fontSize: 11,
              fontFamily: "monospace",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="">Select entity...</option>
            {allEntities.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label} ({e.id})
              </option>
            ))}
          </select>
        </div>

        {/* ── Duration slider ── */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 9, color: "#4a7a9b", fontFamily: "monospace", letterSpacing: "0.08em" }}>
              DURATION
            </span>
            <span style={{ fontSize: 10, color: "#a855f7", fontFamily: "monospace" }}>
              {duration}s
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={120}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#a855f7", cursor: "pointer" }}
          />
        </div>

        {/* ── Intensity slider ── */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 9, color: "#4a7a9b", fontFamily: "monospace", letterSpacing: "0.08em" }}>
              INTENSITY
            </span>
            <span style={{ fontSize: 10, color: "#a855f7", fontFamily: "monospace" }}>
              {intensity.toFixed(1)}×
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={5}
            step={0.1}
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#a855f7", cursor: "pointer" }}
          />
          <div style={{
            display: "flex", justifyContent: "space-between",
            fontSize: 8, color: "#2a4a6a", fontFamily: "monospace", marginTop: 2,
          }}>
            <span>MILD</span><span>MODERATE</span><span>EXTREME</span>
          </div>
        </div>

        {/* ── Trigger button ── */}
        <button
          onClick={handleTrigger}
          disabled={!entityId || status === "sending"}
          style={{
            width: "100%",
            padding: "11px 0",
            background: !entityId || status === "sending"
              ? "rgba(168,85,247,0.05)"
              : "rgba(168,85,247,0.15)",
            border: `1px solid ${!entityId ? "rgba(168,85,247,0.1)" : "rgba(168,85,247,0.35)"}`,
            borderRadius: 8,
            color: !entityId ? "#4a2a7a" : "#a855f7",
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "monospace",
            letterSpacing: "0.08em",
            cursor: !entityId || status === "sending" ? "not-allowed" : "pointer",
            transition: "all 0.2s",
          }}
        >
          {status === "sending"
            ? "DISPATCHING..."
            : `⚡ TRIGGER ${selectedType.label.toUpperCase()}`}
        </button>

        {/* ── Last job ID ── */}
        {lastJobId && (
          <div style={{
            marginTop: 8,
            fontSize: 9,
            color: "#2a6a4a",
            fontFamily: "monospace",
            textAlign: "center",
          }}>
            JOB #{lastJobId} QUEUED
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0); }
        }
        select option { background: #060c16; }
      `}</style>
    </div>
  );
}