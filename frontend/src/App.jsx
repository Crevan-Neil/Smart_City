// ─────────────────────────────────────────────
//  App.jsx — root component
//  Wires together: socket, city data, 3D scene,
//  dashboard panels, AI chat, command trigger
// ─────────────────────────────────────────────

import { useEffect } from "react";
import CityScene from "./components/city/CityScene";
import Sidebar from "./components/dashboard/Sidebar";
import AiChatPanel from "./components/ai/AiChatPanel";
import CommandTrigger from "./components/ai/CommandTrigger";
import AuthOverlay from "./components/auth/AuthOverlay";
import ErrorBoundary from "./components/ErrorBoundary";
import { useSocket } from "./hooks/useSocket";
import { useCityData } from "./hooks/useCityData";
import useUIStore from "./store/uiStore";
import useCityStore from "./store/cityStore";
import useAuthStore from "./store/authStore";
import { hexToRgb } from "./utils/cityUtils";

// ── Top bar component ──────────────────────────
function TopBar() {
  const isConnected = useCityStore((s) => s.isConnected);
  const simHour = useUIStore((s) => s.simHour);
  const setSimHour = useUIStore((s) => s.setSimHour);
  const toggleAiPanel = useUIStore((s) => s.toggleAiPanel);
  const toggleCommandPanel = useUIStore((s) => s.toggleCommandPanel);
  
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const timeLabel = `${String(simHour).padStart(2, "0")}:00`;
  const isDaytime = simHour >= 6 && simHour <= 20;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 44,
        background: "rgba(4,12,22,0.88)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(0,229,255,0.08)",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 16,
        zIndex: 150,
      }}
    >
      {/* Brand */}
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "#00e5ff",
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: "0.1em",
          whiteSpace: "nowrap",
        }}
      >
        ◈ SMART CITY TWIN
      </div>

      <div style={{ width: 1, height: 20, background: "rgba(0,229,255,0.1)" }} />

      {/* User profile */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 9, color: "#4a7a9b", fontFamily: "monospace" }}>USER:</div>
        <div style={{ fontSize: 10, color: "#e2f4ff", fontWeight: 600, fontFamily: "monospace" }}>
          {user?.username?.toUpperCase() || "VISITOR"}
        </div>
        <div style={{
          fontSize: 8, padding: "1px 4px", borderRadius: 3,
          background: "rgba(0,229,255,0.1)", color: "#00e5ff",
          border: "1px solid rgba(0,229,255,0.2)", fontFamily: "monospace"
        }}>
          {user?.role?.toUpperCase() || "VIEWER"}
        </div>
      </div>

      <div style={{ width: 1, height: 20, background: "rgba(0,229,255,0.1)" }} />

      {/* Sim time control */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
        <span style={{ fontSize: 9, color: "#4a7a9b", fontFamily: "monospace", whiteSpace: "nowrap" }}>
          {isDaytime ? "☀" : "🌙"} SIM TIME
        </span>
        <input
          type="range"
          min={0}
          max={23}
          value={simHour}
          onChange={(e) => setSimHour(Number(e.target.value))}
          style={{ width: 100, accentColor: "#00e5ff", cursor: "pointer" }}
        />
        <span
          style={{
            fontSize: 11,
            color: "#00e5ff",
            fontFamily: "monospace",
            minWidth: 36,
          }}
        >
          {timeLabel}
        </span>
      </div>

      {/* Right-side actions */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto" }}>
        <TopBarBtn
          onClick={toggleAiPanel}
          color="#00e5a0"
          label="✦ AI CHAT"
        />
        <TopBarBtn
          onClick={toggleCommandPanel}
          color="#a855f7"
          label="⚡ SIM CMD"
        />
        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)", margin: "0 4px" }} />
        <TopBarBtn
          onClick={logout}
          color="#ff4d4d"
          label="⏻ LOGOUT"
        />
      </div>
    </div>
  );
}

function TopBarBtn({ onClick, color, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 12px",
        background: `rgba(${hexToRgb(color)},0.1)`,
        border: `1px solid ${color}30`,
        borderRadius: 6,
        color,
        fontSize: 9,
        fontFamily: "monospace",
        letterSpacing: "0.08em",
        cursor: "pointer",
        transition: "all 0.2s",
        whiteSpace: "nowrap",
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = `rgba(${hexToRgb(color)},0.18)`;
        e.currentTarget.style.borderColor = color + "55";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = `rgba(${hexToRgb(color)},0.1)`;
        e.currentTarget.style.borderColor = color + "30";
      }}
    >
      {label}
    </button>
  );
}

// ── Loading screen ────────────────────────────
function LoadingScreen({ message = "LOADING CAMPUS DATA..." }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#06121e",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
      }}
    >
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: "#00e5ff",
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: "0.2em",
          marginBottom: 24,
        }}
      >
        ◈ CITY TWIN
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#00e5ff",
              animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      <div
        style={{
          marginTop: 16,
          fontSize: 10,
          color: "#2a4a6a",
          fontFamily: "monospace",
          letterSpacing: "0.1em",
        }}
      >
        {message}
      </div>
      <style>{`
        @keyframes dotPulse {
          0%,80%,100% { opacity:0.2; transform:scale(0.8); }
          40% { opacity:1; transform:scale(1.2); }
        }
      `}</style>
    </div>
  );
}

// ── Root App ──────────────────────────────────
export default function App() {
  const initAuth = useAuthStore((s) => s.initAuth);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitializing = useAuthStore((s) => s.isInitializing);

  // 1. Initialize authentication session on mount
  useEffect(() => {
    initAuth();
  }, []);

  // 2. Initialize sockets and fetch data only if authenticated
  useSocket();
  const { loading, error } = useCityData();

  if (isInitializing) return <LoadingScreen message="INITIALIZING SESSION..." />;

  if (!isAuthenticated) return <AuthOverlay />;

  if (loading) return <LoadingScreen />;

  if (error) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#06121e",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#ef4444",
          fontFamily: "monospace",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 20 }}>⚠ CONNECTION ERROR</div>
        <div style={{ fontSize: 12, color: "#7a9bb5" }}>{error}</div>
        <div style={{ fontSize: 10, color: "#2a4a6a" }}>
          Is the backend running at {import.meta.env.VITE_API_URL}?
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "#06121e" }}>
      {/* 3D scene fills the whole screen — wrapped in ErrorBoundary to contain crashes */}
      <ErrorBoundary>
        <CityScene />
      </ErrorBoundary>

      {/* UI layers on top */}
      <TopBar />
      <Sidebar />
      <AiChatPanel />
      <CommandTrigger />
    </div>
  );
}

