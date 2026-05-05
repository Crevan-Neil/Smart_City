// ─────────────────────────────────────────────
//  components/city/CityScene.jsx
//  R3F canvas root — camera, lighting, grid, entities
// ─────────────────────────────────────────────

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Sky, Stars, Environment } from "@react-three/drei";
import { Suspense } from "react";
import useCityStore from "../../store/cityStore";
import useUIStore from "../../store/uiStore";
import Building from "./Building";
import Junction from "./Junction";
import StreetLight from "./StreetLight";
import CarInstance from "./CarInstance";

function SceneContent() {
  const buildings = useCityStore((s) => s.buildings);
  const junctions = useCityStore((s) => s.junctions);
  const simHour = useUIStore((s) => s.simHour);

  // Day/night cycle based on simHour
  const isDaytime = simHour >= 6 && simHour <= 20;
  const sunPosition = [
    Math.cos((simHour / 24) * Math.PI * 2) * 100,
    Math.sin((simHour / 24) * Math.PI * 2) * 60,
    50,
  ];

  return (
    <>
      {/* ── Lighting ── */}
      <ambientLight intensity={isDaytime ? 0.6 : 0.15} color="#cce0ff" />
      <directionalLight
        position={sunPosition}
        intensity={isDaytime ? 1.4 : 0}
        castShadow
        shadow-mapSize={[2048, 2048]}
        color="#fffbe6"
      />
      {/* Night ambient glow */}
      {!isDaytime && (
        <pointLight position={[0, 20, 0]} intensity={0.4} color="#2255aa" />
      )}

      {/* ── Environment ── */}
      {isDaytime ? (
        <Sky
          sunPosition={sunPosition}
          turbidity={6}
          rayleigh={0.4}
          mieCoefficient={0.005}
          mieDirectionalG={0.8}
        />
      ) : (
        <Stars radius={100} depth={50} count={3000} factor={4} fade />
      )}

      {/* ── Ground grid ── */}
      <Grid
        position={[0, -0.01, 0]}
        args={[80, 80]}
        cellSize={2}
        cellThickness={0.4}
        cellColor="#1a3a5c"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#0e6a9e"
        fadeDistance={60}
        fadeStrength={1}
        infiniteGrid
      />

      {/* ── Ground plane ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#06121e" roughness={1} />
      </mesh>

      {/* ── Road ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 5]}>
        <planeGeometry args={[6, 30]} />
        <meshStandardMaterial color="#0d1f2d" roughness={0.9} />
      </mesh>

      {/* ── Buildings from MongoDB config ── */}
      {buildings.map((bld) => (
        <Building key={bld.entityId} building={bld} />
      ))}

      {/* ── Junctions ── */}
      {junctions.map((jxn) => (
        <Junction key={jxn.entityId} junction={jxn} />
      ))}

      {/* ── Street lights along the road ── */}
      {[-10, -4, 2, 8, 14].map((z) => (
        <StreetLight key={z} position={[4, 0, z]} isDaytime={isDaytime} />
      ))}
      {[-10, -4, 2, 8, 14].map((z) => (
        <StreetLight key={`l${z}`} position={[-4, 0, z]} isDaytime={isDaytime} />
      ))}

      {/* ── Moving vehicles ── */}
      <CarInstance count={8} />
    </>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#0e6a9e" wireframe />
    </mesh>
  );
}

export default function CityScene() {
  return (
    <Canvas
      shadows
      camera={{ position: [30, 25, 35], fov: 50, near: 0.1, far: 500 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: "#06121e" }}
    >
      <Suspense fallback={<LoadingFallback />}>
        <SceneContent />
      </Suspense>

      <OrbitControls
        makeDefault
        minDistance={8}
        maxDistance={120}
        maxPolarAngle={Math.PI / 2.1}
        enablePan
        panSpeed={0.8}
        rotateSpeed={0.6}
        zoomSpeed={0.8}
        target={[0, 0, 0]}
      />
    </Canvas>
  );
}