// ─────────────────────────────────────────────
//  components/dashboard/Sidebar.jsx
//  Glassmorphism left panel — entity details,
//  live metrics, charts, anomaly alerts
// ─────────────────────────────────────────────

import useCityStore from "../../store/cityStore";
import useUIStore from "../../store/uiStore";
import MetricCard from "./MetricCard";
import EnergyChart from "./EnergyChart";
import TrafficChart from "./TrafficChart";
import AnomalyBanner from "./AnomalyBanner";
import { THRESHOLDS } from "../../utils/cityUtils";


function BuildingDetail({ building }) {
  const sensorData = useCityStore((s) => s.sensorData[building.entityId] || {});

  return (
    <div>
      {/* Building header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: "#4a7a9b", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: 4 }}>
          {building.type?.toUpperCase()} · {building.floorCount} FLOORS
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#e2f4ff", letterSpacing: "0.02em" }}>
          {building.name}
        </div>
        <div style={{ fontSize: 10, color: "#2a5a7a", fontFamily: "monospace", marginTop: 2 }}>
          ID: {building.entityId}
        </div>
      </div>

      {/* Metric cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        {building.sensors?.map((metric) => (
          <MetricCard
            key={metric}
            metric={metric}
            value={sensorData[metric]}
            threshold={THRESHOLDS[metric]}
            isAlert={sensorData[metric] > THRESHOLDS[metric]}
          />
        ))}
      </div>

      {/* Energy chart */}
      <div style={{
        background: "rgba(0,229,255,0.04)",
        border: "1px solid rgba(0,229,255,0.1)",
        borderRadius: 8,
        padding: "10px 12px",
        marginBottom: 10,
      }}>
        <EnergyChart entityId={building.entityId} />
      </div>
    </div>
  );
}

function JunctionDetail({ junction }) {
  const sensorData = useCityStore((s) => s.sensorData[junction.entityId] || {});

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: "#4a7a9b", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: 4 }}>
          TRAFFIC JUNCTION
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#e2f4ff" }}>
          {junction.name}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <MetricCard
          metric="traffic"
          value={sensorData.traffic}
          threshold={THRESHOLDS.traffic}
          isAlert={sensorData.traffic > THRESHOLDS.traffic}
        />
      </div>

      <div style={{
        background: "rgba(245,158,11,0.04)",
        border: "1px solid rgba(245,158,11,0.1)",
        borderRadius: 8,
        padding: "10px 12px",
      }}>
        <TrafficChart entityId={junction.entityId} />
      </div>
    </div>
  );
}

function CampusOverview() {
  const buildings = useCityStore((s) => s.buildings);
  const sensorData = useCityStore((s) => s.sensorData);

  const totalEnergy = buildings.reduce((acc, b) => {
    return acc + (sensorData[b.entityId]?.energy || 0);
  }, 0);

  const avgTemp = buildings.reduce((acc, b) => {
    return acc + (sensorData[b.entityId]?.temperature || 0);
  }, 0) / (buildings.length || 1);

  const alertCount = useCityStore((s) => s.anomalies.length);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: "#4a7a9b", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: 4 }}>
          CAMPUS OVERVIEW
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#e2f4ff" }}>
          Smart City Twin
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        <div style={{
          background: "rgba(0,229,255,0.06)", border: "1px solid rgba(0,229,255,0.15)",
          borderRadius: 8, padding: "10px 12px",
        }}>
          <div style={{ fontSize: 9, color: "#4a7a9b", fontFamily: "monospace", marginBottom: 4 }}>TOTAL POWER</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#00e5ff", fontFamily: "monospace" }}>
            {totalEnergy.toFixed(0)}
            <span style={{ fontSize: 11, color: "#4a7a9b", marginLeft: 3 }}>kW</span>
          </div>
        </div>
        <div style={{
          background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)",
          borderRadius: 8, padding: "10px 12px",
        }}>
          <div style={{ fontSize: 9, color: "#4a7a9b", fontFamily: "monospace", marginBottom: 4 }}>AVG TEMP</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#f59e0b", fontFamily: "monospace" }}>
            {avgTemp.toFixed(1)}
            <span style={{ fontSize: 11, color: "#4a7a9b", marginLeft: 3 }}>°C</span>
          </div>
        </div>
        <div style={{
          background: alertCount > 0 ? "rgba(239,68,68,0.08)" : "rgba(0,229,160,0.06)",
          border: `1px solid ${alertCount > 0 ? "rgba(239,68,68,0.2)" : "rgba(0,229,160,0.15)"}`,
          borderRadius: 8, padding: "10px 12px",
        }}>
          <div style={{ fontSize: 9, color: "#4a7a9b", fontFamily: "monospace", marginBottom: 4 }}>ALERTS</div>
          <div style={{ fontSize: 20, fontWeight: 700,
            color: alertCount > 0 ? "#ef4444" : "#00e5a0", fontFamily: "monospace" }}>
            {alertCount}
          </div>
        </div>
        <div style={{
          background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.15)",
          borderRadius: 8, padding: "10px 12px",
        }}>
          <div style={{ fontSize: 9, color: "#4a7a9b", fontFamily: "monospace", marginBottom: 4 }}>BUILDINGS</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#a855f7", fontFamily: "monospace" }}>
            {buildings.length}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 10, color: "#4a7a9b", fontFamily: "monospace", marginBottom: 8 }}>
        CLICK A BUILDING OR JUNCTION TO INSPECT
      </div>
    </div>
  );
}

export default function Sidebar() {
  const isOpen = useUIStore((s) => s.isSidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const toggleAiPanel = useUIStore((s) => s.toggleAiPanel);
  const toggleCommandPanel = useUIStore((s) => s.toggleCommandPanel);
  const isConnected = useCityStore((s) => s.isConnected);

  const selectedId = useUIStore((s) => s.selectedEntityId);
  const selectedType = useUIStore((s) => s.selectedEntityType);
  const clearSelection = useUIStore((s) => s.clearSelection);

  const buildings = useCityStore((s) => s.buildings);
  const junctions = useCityStore((s) => s.junctions);

  const selectedBuilding = buildings.find((b) => b.entityId === selectedId);
  const selectedJunction = junctions.find((j) => j.entityId === selectedId);

  return (
    <>
      {/* ── Sidebar panel ── */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: isOpen ? 0 : -300,
          width: 280,
          height: "100vh",
          background: "rgba(4, 12, 22, 0.85)",
          backdropFilter: "blur(20px)",
          borderRight: "1px solid rgba(0,229,255,0.12)",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          transition: "left 0.3s cubic-bezier(0.4,0,0.2,1)",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "16px 16px 12px",
          borderBottom: "1px solid rgba(0,229,255,0.08)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <div style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#00e5ff",
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.06em",
            }}>
              ◈ CITY TWIN
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                background: isConnected ? "#00e5a0" : "#ef4444",
                boxShadow: isConnected ? "0 0 6px #00e5a0" : "0 0 6px #ef4444",
              }} />
              <span style={{ fontSize: 9, color: "#4a7a9b", fontFamily: "monospace" }}>
                {isConnected ? "LIVE" : "OFFLINE"}
              </span>
            </div>
          </div>
          <div style={{ fontSize: 9, color: "#2a4a6a", fontFamily: "monospace" }}>
            COLLEGE CAMPUS MONITOR
          </div>
        </div>

        {/* Anomaly banners */}
        <div style={{ padding: "10px 12px 0", flexShrink: 0 }}>
          <AnomalyBanner />
        </div>

        {/* Main content */}
        <div style={{ padding: "12px 12px", flex: 1, overflowY: "auto" }}>
          {selectedType === "building" && selectedBuilding ? (
            <>
              <button onClick={clearSelection} style={{
                background: "none", border: "1px solid #1a3a5c", borderRadius: 4,
                color: "#4a7a9b", fontSize: 10, padding: "3px 8px",
                cursor: "pointer", fontFamily: "monospace", marginBottom: 12,
              }}>← BACK</button>
              <BuildingDetail building={selectedBuilding} />
            </>
          ) : selectedType === "junction" && selectedJunction ? (
            <>
              <button onClick={clearSelection} style={{
                background: "none", border: "1px solid #1a3a5c", borderRadius: 4,
                color: "#4a7a9b", fontSize: 10, padding: "3px 8px",
                cursor: "pointer", fontFamily: "monospace", marginBottom: 12,
              }}>← BACK</button>
              <JunctionDetail junction={selectedJunction} />
            </>
          ) : (
            <CampusOverview />
          )}
        </div>

        {/* Footer actions */}
        <div style={{
          padding: "10px 12px",
          borderTop: "1px solid rgba(0,229,255,0.08)",
          display: "flex",
          gap: 6,
          flexShrink: 0,
        }}>
          <button
            onClick={toggleAiPanel}
            style={{
              flex: 1, padding: "7px 0",
              background: "rgba(0,229,160,0.1)",
              border: "1px solid rgba(0,229,160,0.25)",
              borderRadius: 6, color: "#00e5a0",
              fontSize: 10, fontFamily: "monospace",
              letterSpacing: "0.06em", cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            ✦ ASK AI
          </button>
          <button
            onClick={toggleCommandPanel}
            style={{
              flex: 1, padding: "7px 0",
              background: "rgba(168,85,247,0.1)",
              border: "1px solid rgba(168,85,247,0.25)",
              borderRadius: 6, color: "#a855f7",
              fontSize: 10, fontFamily: "monospace",
              letterSpacing: "0.06em", cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            ⚡ SIM CMD
          </button>
        </div>
      </div>

      {/* ── Toggle tab ── */}
      <button
        onClick={toggleSidebar}
        style={{
          position: "fixed",
          top: "50%",
          left: isOpen ? 280 : 0,
          transform: "translateY(-50%)",
          background: "rgba(4,12,22,0.9)",
          border: "1px solid rgba(0,229,255,0.2)",
          borderLeft: "none",
          borderRadius: "0 6px 6px 0",
          color: "#00e5ff",
          width: 18,
          height: 48,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          zIndex: 101,
          transition: "left 0.3s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {isOpen ? "‹" : "›"}
      </button>
    </>
  );
}