// ─────────────────────────────────────────────
//  components/city/StreetLight.jsx
//  Smart street light — auto-on at night
//  dims based on simHour
// ─────────────────────────────────────────────

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

export default function StreetLight({ position = [0, 0, 0], isDaytime }) {
  const glowRef = useRef();
  const isOn = !isDaytime;

  useFrame(() => {
    if (!glowRef.current) return;
    const pulse = Math.sin(Date.now() * 0.001) * 0.05;
    glowRef.current.intensity = isOn ? 1.2 + pulse : 0;
  });

  return (
    <group position={position}>
      {/* Pole */}
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 4, 8]} />
        <meshStandardMaterial color="#1a2a3a" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Arm */}
      <mesh position={[0.3, 3.9, 0]} rotation={[0, 0, Math.PI / 8]}>
        <cylinderGeometry args={[0.025, 0.025, 0.8, 8]} />
        <meshStandardMaterial color="#1a2a3a" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Lamp housing */}
      <mesh position={[0.6, 3.85, 0]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial
          color={isOn ? "#fffbe6" : "#1a2a3a"}
          emissive={isOn ? "#fffbe6" : "#000000"}
          emissiveIntensity={isOn ? 1 : 0}
        />
      </mesh>

      {/* Point light */}
      <pointLight
        ref={glowRef}
        position={[0.6, 3.7, 0]}
        intensity={isOn ? 1.2 : 0}
        distance={10}
        color="#fffbe6"
        castShadow={false}
      />
    </group>
  );
}
