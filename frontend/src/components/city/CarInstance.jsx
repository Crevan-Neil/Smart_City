// ─────────────────────────────────────────────
//  components/city/CarInstance.jsx
//  Instanced vehicle mesh — efficient rendering
//  Cars move along the road using instancing
// ─────────────────────────────────────────────

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { InstancedMesh, Object3D, Color } from "three";
import useCityStore from "../../store/cityStore";

const ROAD_Z_MIN = -14;
const ROAD_Z_MAX = 20;
const ROAD_LENGTH = ROAD_Z_MAX - ROAD_Z_MIN;

// Car colours — cyberpunk palette
const CAR_COLORS = [
  "#00e5ff", "#ff3366", "#f59e0b", "#a855f7",
  "#00e5a0", "#3b82f6", "#ffffff", "#ef4444",
];

export default function CarInstance({ count = 8 }) {
  const meshRef = useRef();
  const dummy = useMemo(() => new Object3D(), []);

  // Each car has independent speed and phase offset
  const cars = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      speed: 3 + Math.random() * 4,
      offset: (i / count) * ROAD_LENGTH,
      lane: i % 2 === 0 ? 1 : -1,       // two-lane road
      color: new Color(CAR_COLORS[i % CAR_COLORS.length]),
    })), [count]
  );

  // Set per-instance colours once on mount
  useEffect(() => {
    if (!meshRef.current) return;
    cars.forEach((car, i) => {
      meshRef.current.setColorAt(i, car.color);
    });
    meshRef.current.instanceColor.needsUpdate = true;
  }, [cars]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    cars.forEach((car, i) => {
      // Advance position
      car.offset = (car.offset + car.speed * delta) % ROAD_LENGTH;
      const z = ROAD_Z_MIN + car.offset;
      const x = car.lane * 1.2;

      dummy.position.set(x, 0.25, z);
      dummy.rotation.y = car.lane > 0 ? 0 : Math.PI;
      dummy.scale.set(0.6, 0.35, 1.2);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        metalness={0.7}
        roughness={0.2}
        transparent
        opacity={0.95}
      />
    </instancedMesh>
  );
}