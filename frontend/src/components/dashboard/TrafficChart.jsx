// ─────────────────────────────────────────────
//  components/dashboard/TrafficChart.jsx
//  Live traffic count bar chart (Recharts)
// ─────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import useCityStore from "../../store/cityStore";
import { THRESHOLDS } from "../../utils/cityUtils";

const MAX_POINTS = 20;

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(6,18,30,0.95)",
      border: "1px solid #f59e0b30",
      borderRadius: 6,
      padding: "6px 10px",
      fontSize: 11,
      fontFamily: "monospace",
      color: "#e2f4ff",
    }}>
      <div style={{ color: "#f59e0b" }}>🚗 {payload[0].value} veh/min</div>
    </div>
  );
}

export default function TrafficChart({ entityId }) {
  const [history, setHistory] = useState([]);
  const traffic = useCityStore((s) => s.sensorData[entityId]?.traffic);
  const prevRef = useRef(null);

  useEffect(() => {
    if (traffic == null || traffic === prevRef.current) return;
    prevRef.current = traffic;

    setHistory((prev) => [
      ...prev.slice(-MAX_POINTS + 1),
      { time: Date.now(), value: Math.round(traffic) },
    ]);
  }, [traffic]);

  return (
    <div>
      <div style={{
        fontSize: 10, color: "#7a9bb5",
        fontFamily: "monospace", letterSpacing: "0.06em", marginBottom: 8,
      }}>
        🚗 TRAFFIC DENSITY (vehicles/min)
      </div>

      {history.length < 2 ? (
        <div style={{ height: 70, display: "flex", alignItems: "center",
          justifyContent: "center", color: "#2a4a6a", fontSize: 11, fontFamily: "monospace" }}>
          Waiting for data...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={70}>
          <BarChart data={history} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={6}>
            <XAxis dataKey="time" hide />
            <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#4a7a9b" }} width={35} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={THRESHOLDS.traffic} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} />
            <Bar dataKey="value" radius={[2, 2, 0, 0]} animationDuration={200}>
              {history.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    entry.value > THRESHOLDS.traffic
                      ? "#ef4444"
                      : entry.value > 60
                      ? "#f59e0b"
                      : "#00e5a0"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}