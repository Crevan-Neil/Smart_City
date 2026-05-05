// ─────────────────────────────────────────────
//  components/dashboard/EnergyChart.jsx
//  Live energy consumption line chart (Recharts)
//  Buffers last 30 readings from socket events
// ─────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import useCityStore from "../../store/cityStore";
import { THRESHOLDS } from "../../utils/cityUtils";

const MAX_POINTS = 30;

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(6,18,30,0.95)",
      border: "1px solid #00e5ff30",
      borderRadius: 6,
      padding: "6px 10px",
      fontSize: 11,
      fontFamily: "monospace",
      color: "#e2f4ff",
    }}>
      <div style={{ color: "#7a9bb5", marginBottom: 2 }}>{label}</div>
      <div style={{ color: "#00e5ff" }}>⚡ {payload[0].value?.toFixed(1)} kW</div>
    </div>
  );
}

export default function EnergyChart({ entityId }) {
  const [history, setHistory] = useState([]);
  const energy = useCityStore((s) => s.sensorData[entityId]?.energy);
  const prevEnergyRef = useRef(null);

  // Append new reading when energy changes
  useEffect(() => {
    if (energy == null || energy === prevEnergyRef.current) return;
    prevEnergyRef.current = energy;

    const point = {
      time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      value: parseFloat(energy.toFixed(1)),
    };

    setHistory((prev) => [...prev.slice(-MAX_POINTS + 1), point]);
  }, [energy]);

  return (
    <div>
      <div style={{
        fontSize: 10,
        color: "#7a9bb5",
        fontFamily: "monospace",
        letterSpacing: "0.06em",
        marginBottom: 8,
      }}>
        ⚡ ENERGY CONSUMPTION (kW)
      </div>

      {history.length < 2 ? (
        <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center",
          color: "#2a4a6a", fontSize: 11, fontFamily: "monospace" }}>
          Waiting for data...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={80}>
          <AreaChart data={history} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" hide tick={false} />
            <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9, fill: "#4a7a9b" }} width={35} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={THRESHOLDS.energy}
              stroke="#ef4444"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#00e5ff"
              strokeWidth={1.5}
              fill="url(#energyGrad)"
              dot={false}
              animationDuration={200}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}