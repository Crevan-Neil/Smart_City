// ─────────────────────────────────────────────
//  components/city/Building.jsx
//  3D building mesh — color driven by live energy data
//  Click to select and show in sidebar
// ─────────────────────────────────────────────

import { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Color, MathUtils } from "three";
import useCityStore from "../../store/cityStore";
import useUIStore from "../../store/uiStore";

// Colour ramp: green (normal) → amber (elevated) → red (critical)
function energyToColor(normalised) {
  const low = new Color("#00e5a0");    // cyan-green — normal
  const mid = new Color("#f59e0b");    // amber — elevated
  const high = new Color("#ef4444");   // red — critical

  if (normalised < 0.6) return low.lerp(mid, normalised / 0.6);
  return mid.lerp(high, (normalised - 0.6) / 0.4);
}

export default function Building({ building }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

  const { entityId, name, scenePosition, floorCount, maxCapacity } = building;
  const height = floorCount * 1.8;
  const pos = [scenePosition.x, height / 2, scenePosition.z];

  const energy = useCityStore((s) => s.sensorData[entityId]?.energy ?? 0);
  const temperature = useCityStore((s) => s.sensorData[entityId]?.temperature ?? 0);
  const selectedId = useUIStore((s) => s.selectedEntityId);
  const selectEntity = useUIStore((s) => s.selectEntity);

  const isSelected = selectedId === entityId;
  const normalised = Math.min(energy / maxCapacity, 1);

  // Smooth colour interpolation each frame
  const targetColor = useMemo(
    () => energyToColor(normalised),
    [normalised]
  );

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    // Smoothly lerp the material colour
    meshRef.current.material.color.lerp(targetColor, delta * 3);

    // Subtle idle pulse on the emission
    const pulse = Math.sin(Date.now() * 0.002) * 0.03;
    meshRef.current.material.emissiveIntensity = isSelected
      ? 0.3 + pulse
      : hovered
      ? 0.15
      : normalised * 0.12 + pulse * 0.5;
  });

  return (
    <group>
      {/* ── Building body ── */}
      <mesh
        ref={meshRef}
        position={pos}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          selectEntity(entityId, "building");
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
      >
        <boxGeometry args={[4, height, 4]} />
        <meshStandardMaterial
          color={targetColor}
          emissive={targetColor}
          emissiveIntensity={0.1}
          roughness={0.3}
          metalness={0.6}
          transparent
          opacity={0.92}
        />
      </mesh>

      {/* ── Selection ring ── */}
      {isSelected && (
        <mesh position={[scenePosition.x, 0.05, scenePosition.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.2, 3.6, 32]} />
          <meshBasicMaterial color="#00e5ff" transparent opacity={0.8} />
        </mesh>
      )}

      {/* ── Window grid overlay ── */}
      <mesh position={pos}>
        <boxGeometry args={[4.05, height, 4.05]} />
        <meshBasicMaterial color="#0a2540" wireframe transparent opacity={0.3} />
      </mesh>

      {/* ── Floating label (shows on hover or selection) ── */}
      {(hovered || isSelected) && (
        <Html
          position={[scenePosition.x, height + 1.5, scenePosition.z]}
          center
          distanceFactor={20}
          style={{ pointerEvents: "none" }}
        >
          <div
            style={{
              background: "rgba(6, 18, 30, 0.92)",
              border: "1px solid #00e5ff44",
              borderRadius: "6px",
              padding: "6px 10px",
              color: "#e2f4ff",
              fontSize: "11px",
              fontFamily: "'JetBrains Mono', monospace",
              whiteSpace: "nowrap",
              backdropFilter: "blur(8px)",
            }}
          >
            <div style={{ color: "#00e5ff", fontWeight: 600, marginBottom: 2 }}>{name}</div>
            <div>⚡ {energy.toFixed(1)} kW</div>
            <div>🌡 {temperature.toFixed(1)} °C</div>
          </div>
        </Html>
      )}
    </group>
  );
}