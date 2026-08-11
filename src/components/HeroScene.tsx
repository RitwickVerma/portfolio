"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";

const services = [
  { id: "VM110", name: "Gateway", color: "#ff6b6b" },
  { id: "CT101", name: "Hermes", color: "#64ffda" },
  { id: "CT102", name: "DNS", color: "#64ffda" },
  { id: "CT104", name: "VWarden", color: "#64ffda" },
  { id: "CT106", name: "Immich", color: "#64ffda" },
  { id: "CT107", name: "Paperless", color: "#64ffda" },
  { id: "CT111", name: "Jellyfin", color: "#64ffda" },
  { id: "CT113", name: "Syncthing", color: "#64ffda" },
];

function Rack({
  position,
  label,
  color,
}: {
  position: [number, number, number];
  label: string;
  color: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const emissiveColor = useMemo(() => new THREE.Color(color), [color]);

  return (
    <group position={position}>
      {/* Main rack box */}
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={[0.6, 1.8, 0.4]} />
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.4}
          roughness={0.6}
          emissive={emissiveColor}
          emissiveIntensity={0.15}
        />
      </mesh>
      {/* Top indicator light */}
      <mesh position={[0, 0.95, 0.21]}>
        <boxGeometry args={[0.12, 0.05, 0.02]} />
        <meshStandardMaterial
          color={color}
          emissive={emissiveColor}
          emissiveIntensity={0.9}
        />
      </mesh>
      {/* Label text via small plane — simplified as colored dot */}
      <mesh position={[0, -1.05, 0.21]}>
        <circleGeometry args={[0.06, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={emissiveColor}
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
}

function Cable({
  start,
  end,
}: {
  start: [number, number, number];
  end: [number, number, number];
}) {
  const points = useMemo(() => {
    const mid: [number, number, number] = [
      (start[0] + end[0]) / 2,
      Math.max(start[1], end[1]) + 0.5,
      (start[2] + end[2]) / 2,
    ];
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...start),
      new THREE.Vector3(...mid),
      new THREE.Vector3(...end),
    );
    return curve.getPoints(20);
  }, [start, end]);

  const lineGeo = useMemo(
    () => new THREE.BufferGeometry().setFromPoints(points),
    [points],
  );

  return (
    <line geometry={lineGeo}>
      <lineBasicMaterial
        color="#64ffda"
        transparent
        opacity={0.15}
        linewidth={1}
      />
    </line>
  );
}

function Scene() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.08;
    }
  });

  const rackPositions = useMemo(() => {
    const positions: {
      position: [number, number, number];
      label: string;
      color: string;
    }[] = [];
    // 2 rows of 4
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        const idx = row * 4 + col;
        if (idx >= services.length) break;
        positions.push({
          position: [
            (col - 1.5) * 1.2,
            0,
            (row - 0.5) * 1.8,
          ] as [number, number, number],
          label: services[idx].id,
          color: services[idx].color,
        });
      }
    }
    return positions;
  }, []);

  const cables = useMemo(() => {
    const result: { start: [number, number, number]; end: [number, number, number] }[] = [];
    // Connect rows in a bus topology
    for (let i = 0; i < rackPositions.length - 1; i++) {
      const a = rackPositions[i].position;
      const b = rackPositions[i + 1].position;
      result.push({
        start: [a[0], a[1] + 0.3, a[2]],
        end: [b[0], b[1] + 0.3, b[2]],
      });
    }
    return result;
  }, [rackPositions]);

  return (
    <group ref={groupRef}>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]}>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color="#0d0d1a" transparent opacity={0.4} />
      </mesh>

      {/* Racks */}
      {rackPositions.map((r, i) => (
        <Rack key={i} position={r.position} label={r.label} color={r.color} />
      ))}

      {/* Network cables */}
      {cables.map((c, i) => (
        <Cable key={i} start={c.start} end={c.end} />
      ))}

      {/* Particles */}
      <Sparkles
        count={200}
        scale={6}
        size={2}
        speed={0.3}
        color="#64ffda"
        opacity={0.15}
      />
    </group>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      camera={{ position: [3, 4, 5], fov: 40 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={0.8} />
      <pointLight position={[0, 3, 0]} intensity={0.3} color="#64ffda" />
      <Scene />
    </Canvas>
  );
}
