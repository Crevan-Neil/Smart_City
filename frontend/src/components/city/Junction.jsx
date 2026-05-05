// ─────────────────────────────────────────────
//  components/city/Junction.jsx
//  Traffic junction — animated signal lights
//  driven by live traffic count data
// ─────────────────────────────────────────────

import { useState } from "react";
import { Html } from "@react-three/drei";
import useCityStore from "../../store/cityStore";
import useUIStore from "../../store/uiStore";

// Signal phases based on traffic density
function getSignalPhase(trafficCount) {
  if (trafficCount > 70) return "red";     // congested
  if (trafficCount > 40) return "amber";   // moderate
  return "green";                           // clear
}

function TrafficLight({ position, phase }) {
  return (
    <group position={position}>
      {/* Pole */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 3, 8]} />
        <meshStandardMaterial color="#1a2a3a" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Housing */}
      <mesh position={[0, 3.2, 0]}>
        <boxGeometry args={[0.3, 0.8, 0.2]} />
        <meshStandardMaterial color="#0d1f2d" metalness={0.6} />
      </mesh>
      {/* Red */}
      <mesh position={[0, 3.45, 0.11]}>
        <circleGeometry args={[0.09, 16]} />
        <meshBasicMaterial color={phase === "red" ? "#ff2244" : "#330a10"} />
      </mesh>
      {/* Amber */}
      <mesh position={[0, 3.2, 0.11]}>
        <circleGeometry args={[0.09, 16]} />
        <meshBasicMaterial color={phase === "amber" ? "#f59e0b" : "#2a1a00"} />
      </mesh>
      {/* Green */}
      <mesh position={[0, 2.95, 0.11]}>
        <circleGeometry args={[0.09, 16]} />
        <meshBasicMaterial color={phase === "green" ? "#00e5a0" : "#002210"} />
      </mesh>
      {/* Glow point light */}
      <pointLight
        position={[0, 3.2, 0.3]}
        intensity={phase === "red" ? 0.8 : phase === "amber" ? 0.6 : 0.8}
        distance={4}
        color={
          phase === "red" ? "#ff2244" : phase === "amber" ? "#f59e0b" : "#00e5a0"
        }
      />
    </group>
  );
}

export default function Junction({ junction }) {
  const [hovered, setHovered] = useState(false);

  const { entityId, name, scenePosition } = junction;
  const traffic = useCityStore((s) => s.sensorData[entityId]?.traffic ?? 0);
  const selectEntity = useUIStore((s) => s.selectEntity);
  const selectedId = useUIStore((s) => s.selectedEntityId);
  const isSelected = selectedId === entityId;

  const phase = getSignalPhase(traffic);
  const pos = [scenePosition.x, 0, scenePosition.z];

  return (
    <group position={pos}>
      {/* ── Junction pad ── */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        onClick={(e) => {
          e.stopPropagation();
          selectEntity(entityId, "junction");
        }}
        onPointerOver={() => {
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
      >
        <circleGeometry args={[3.5, 32]} />
        <meshStandardMaterial
          color={isSelected ? "#0e2a40" : "#080f18"}
          roughness={0.9}
        />
      </mesh>

      {/* ── Road markings ── */}
      {[-1, 0, 1].map((i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[i * 0.6, 0.02, 0]}>
          <planeGeometry args={[0.1, 1.5]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
        </mesh>
      ))}

      {/* ── 4 traffic lights at corners ── */}
      <TrafficLight position={[2.5, 0, 2.5]} phase={phase} />
      <TrafficLight position={[-2.5, 0, 2.5]} phase={phase} />
      <TrafficLight position={[2.5, 0, -2.5]} phase={phase} />
      <TrafficLight position={[-2.5, 0, -2.5]} phase={phase} />

      {/* ── Hover label ── */}
      {(hovered || isSelected) && (
        <Html position={[0, 5, 0]} center distanceFactor={20}>
          <div
            style={{
              background: "rgba(6,18,30,0.92)",
              border: "1px solid #f59e0b44",
              borderRadius: "6px",
              padding: "6px 10px",
              color: "#e2f4ff",
              fontSize: "11px",
              fontFamily: "'JetBrains Mono', monospace",
              whiteSpace: "nowrap",
              backdropFilter: "blur(8px)",
            }}
          >
            <div style={{ color: "#f59e0b", fontWeight: 600, marginBottom: 2 }}>
              {name}
            </div>
            <div>🚗 {Math.round(traffic)} vehicles/min</div>
            <div>
              Signal:{" "}
              <span
                style={{
                  color:
                    phase === "red"
                      ? "#ff2244"
                      : phase === "amber"
                      ? "#f59e0b"
                      : "#00e5a0",
                }}
              >
                {phase.toUpperCase()}
              </span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}