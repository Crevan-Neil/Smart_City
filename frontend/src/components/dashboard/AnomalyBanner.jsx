// ─────────────────────────────────────────────
//  components/dashboard/AnomalyBanner.jsx
//  Threshold breach alert — dismissable banners
// ─────────────────────────────────────────────

import useCityStore from "../../store/cityStore";

export default function AnomalyBanner() {
  const anomalies = useCityStore((s) => s.anomalies);
  const dismissAnomaly = useCityStore((s) => s.dismissAnomaly);

  if (!anomalies.length) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {anomalies.slice(0, 3).map((alert, i) => (
        <div
          key={i}
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.35)",
            borderLeft: "3px solid #ef4444",
            borderRadius: "6px",
            padding: "8px 10px",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 8,
            animation: "slideIn 0.3s ease",
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 10,
              color: "#ef4444",
              fontFamily: "monospace",
              fontWeight: 700,
              letterSpacing: "0.08em",
              marginBottom: 2,
            }}>
              ⚠ ANOMALY DETECTED
            </div>
            <div style={{
              fontSize: 11,
              color: "#fca5a5",
              fontFamily: "monospace",
              lineHeight: 1.4,
            }}>
              {alert.message}
            </div>
            {alert.narration && (
              <div style={{
                fontSize: 10,
                color: "#00e5a0",
                fontFamily: "monospace",
                lineHeight: 1.4,
                marginTop: 4,
                padding: "4px 6px",
                background: "rgba(0,229,160,0.05)",
                borderLeft: "2px solid #00e5a0",
              }}>
                ✦ {alert.narration}
              </div>
            )}
            <div style={{
              fontSize: 10,
              color: "#7a9bb5",
              fontFamily: "monospace",
              marginTop: 3,
            }}>
              {new Date(alert.timestamp).toLocaleTimeString()}
            </div>
          </div>

          <button
            onClick={() => dismissAnomaly(i)}
            style={{
              background: "none",
              border: "none",
              color: "#7a9bb5",
              cursor: "pointer",
              fontSize: 14,
              lineHeight: 1,
              padding: "0 2px",
              flexShrink: 0,
            }}
            aria-label="Dismiss alert"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}