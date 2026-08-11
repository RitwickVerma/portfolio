'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';

// Shared pointer state — updated by window listener
const pointer = { x: 0.5, y: 0.5 };
let pointerInit = false;
function initPointer() {
  if (pointerInit) return;
  pointerInit = true;
  window.addEventListener('pointermove', (e: PointerEvent) => {
    pointer.x = e.clientX / window.innerWidth;
    pointer.y = 1.0 - e.clientY / window.innerHeight;
  }, { passive: true });
}

// Drag state — grab-and-spin with inertia
const drag = {
  active: false,
  prevX: 0,
  prevY: 0,
  targetY: 0,   // accumulated manual rotation Y
  targetX: 0,   // accumulated manual rotation X
  velocityY: 0,
  velocityX: 0,
};

const ACCENT = '#64ffda';
const GATEWAY_ACCENT = '#ffd166';

type RackDef = {
  id: string;
  name: string;
  x: number;
  z: number;
  gateway?: boolean;
};

/** 2 rows × 4 columns of racks — the homelab services */
const RACKS: RackDef[] = [
  { id: 'VM110', name: 'VM110 Gateway', x: -3.3, z: -1.25, gateway: true },
  { id: 'CT101', name: 'CT101 Hermes', x: -1.1, z: -1.25 },
  { id: 'CT102', name: 'CT102 DNS', x: 1.1, z: -1.25 },
  { id: 'CT104', name: 'CT104 Vaultwarden', x: 3.3, z: -1.25 },
  { id: 'CT106', name: 'CT106 Immich', x: -3.3, z: 1.25 },
  { id: 'CT107', name: 'CT107 Paperless', x: -1.1, z: 1.25 },
  { id: 'CT111', name: 'CT111 Jellyfin', x: 1.1, z: 1.25 },
  { id: 'CT113', name: 'CT113 Syncthing', x: 3.3, z: 1.25 },
];

/** Index pairs into RACKS: row links + column (cross-row) links */
const CABLE_PAIRS: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [4, 5],
  [5, 6],
  [6, 7],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
];

// World-space footprint the camera must keep framed on any viewport
const FIT_WIDTH = 9.6;
const FIT_HEIGHT = 7.2;

/** Endpoints of a "network cable" on the facing sides of two racks. */
function cableEndpoints(a: RackDef, b: RackDef): [THREE.Vector3, THREE.Vector3] {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  const nx = dx / len;
  const nz = dz / len;
  const half = 0.54;
  const y = 0.85;
  return [
    new THREE.Vector3(a.x + nx * half, y, a.z + nz * half),
    new THREE.Vector3(b.x - nx * half, y, b.z - nz * half),
  ];
}

/** Responsive camera — moves back/forward so the scene always fits the viewport. */
function CameraRig() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(size.height, 1);
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    // keep the full datacenter in frame: isometric direction (1,1,1)
    const dist = Math.max(
      FIT_WIDTH / (2 * tanHalf * aspect),
      FIT_HEIGHT / (2 * tanHalf),
    );
    const dir = new THREE.Vector3(1, 1, 1).normalize();
    cam.position.copy(dir.multiplyScalar(dist));
    cam.lookAt(0, 0.55, 0);
    cam.updateProjectionMatrix();
  }, [camera, size]);

  return null;
}

/** Blinking status LEDs on a rack's front face. */
function RackLights({ accent, phase }: { accent: string; phase: number }) {
  const refs = useRef<Array<THREE.Mesh | null>>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    refs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.55 + Math.sin(t * 1.8 + i * 2.2 + phase) * 0.3;
    });
  });

  return (
    <group position={[0, 0.4, 0.46]}>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(m) => {
            refs.current[i] = m;
          }}
          position={[-0.24 + i * 0.24, 0, 0]}
        >
          <sphereGeometry args={[0.032, 8, 8]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

/** A single server rack: body, front panel, LEDs, top indicator + name label. */
function Rack({ rack }: { rack: RackDef }) {
  const accent = rack.gateway ? GATEWAY_ACCENT : ACCENT;
  const bodyColor = rack.gateway ? '#221f2e' : '#17171f';

  return (
    <group position={[rack.x, 0, rack.z]}>
      {/* rack body */}
      <mesh>
        <boxGeometry args={[1, 2.2, 0.9]} />
        <meshStandardMaterial
          color={bodyColor}
          metalness={0.6}
          roughness={0.35}
          emissive={accent}
          emissiveIntensity={0.08}
        />
      </mesh>
      {/* front panel */}
      <mesh position={[0, 0.1, 0.455]}>
        <boxGeometry args={[0.72, 1.6, 0.015]} />
        <meshStandardMaterial
          color="#1e1e28"
          metalness={0.5}
          roughness={0.5}
          emissive={accent}
          emissiveIntensity={0.04}
        />
      </mesh>
      {/* blinking status LEDs */}
      <RackLights accent={accent} phase={rack.x * 1.9} />
      {/* top indicator dot */}
      <mesh position={[0, 1.18, 0]}>
        <sphereGeometry args={[0.055, 12, 12]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.3} />
      </mesh>
      {/* name label */}
      <Html position={[0, 1.62, 0]} center zIndexRange={[40, 0]} style={{ pointerEvents: 'none' }}>
        <div className="pointer-events-none flex select-none items-center gap-1.5 whitespace-nowrap rounded-full border border-white/10 bg-[#0a0a0f]/70 px-2.5 py-1 backdrop-blur-sm">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: accent, boxShadow: `0 0 6px ${accent}` }}
          />
          <span className="text-[10px] font-medium tracking-wider text-zinc-300">{rack.name}</span>
        </div>
      </Html>
    </group>
  );
}

/** One thin glowing "network cable" arching between two racks. */
function Cable({ from, to }: { from: THREE.Vector3; to: THREE.Vector3 }) {
  const geometry = useMemo(() => {
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    mid.y += 0.55;
    const curve = new THREE.CatmullRomCurve3([from, mid, to]);
    return new THREE.TubeGeometry(curve, 20, 0.022, 6, false);
  }, [from, to]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={ACCENT}
        emissive={ACCENT}
        emissiveIntensity={0.55}
        transparent
        opacity={0.7}
        roughness={0.35}
        metalness={0.2}
      />
    </mesh>
  );
}

function Cables() {
  const cables = useMemo(
    () =>
      CABLE_PAIRS.map(([ai, bi]) => {
        const a = RACKS[ai];
        const b = RACKS[bi];
        const [from, to] = cableEndpoints(a, b);
        return { key: `${a.id}-${b.id}`, from, to };
      }),
    [],
  );

  return (
    <group>
      {cables.map((c) => (
        <Cable key={c.key} from={c.from} to={c.to} />
      ))}
    </group>
  );
}

/** Deterministic PRNG so the particle field is stable across re-renders. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** ~180 particles slowly drifting upward around the datacenter. */
function DriftParticles({ count = 180 }: { count?: number }) {
  const geometry = useMemo(() => {
    const rand = mulberry32(0x64ffda);
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rand() - 0.5) * 9;
      positions[i * 3 + 1] = -2 + rand() * 4.4;
      positions[i * 3 + 2] = (rand() - 0.5) * 5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.computeBoundingSphere();
    return geo;
  }, [count]);

  const speeds = useMemo(() => {
    const rand = mulberry32(0xc0113);
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) arr[i] = 0.12 + rand() * 0.28;
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    const attr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      let y = arr[i * 3 + 1] + speeds[i] * delta;
      if (y > 2.6) y = -2.2;
      arr[i * 3 + 1] = y;
    }
    attr.needsUpdate = true;
  });

  return (
    <points geometry={geometry}>
      <pointsMaterial
        color={ACCENT}
        size={0.06}
        sizeAttenuation
        transparent
        opacity={0.5}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** Handles pointer-down/up/move on the Canvas for grab-and-spin. */
function GrabHandler() {
  const { gl } = useThree();
  const el = gl.domElement;

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      drag.active = true;
      drag.prevX = e.clientX;
      drag.prevY = e.clientY;
      drag.velocityX = 0;
      drag.velocityY = 0;
      el.setPointerCapture(e.pointerId);
    };
    const onUp = () => {
      drag.active = false;
    };
    const onMove = (e: PointerEvent) => {
      if (!drag.active) return;
      const dx = e.clientX - drag.prevX;
      const dy = e.clientY - drag.prevY;
      drag.targetY += dx * 0.005;
      drag.targetX += dy * 0.005;
      drag.velocityY = dx * 0.005;
      drag.velocityX = dy * 0.005;
      drag.prevX = e.clientX;
      drag.prevY = e.clientY;
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointerleave', onUp);
    el.addEventListener('pointermove', onMove);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointerleave', onUp);
      el.removeEventListener('pointermove', onMove);
    };
  }, [el]);

  return null;
}

/** The rotating datacenter: slab floor, 8 racks, network cables. */
function Datacenter() {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock, delta }) => {
    const t = clock.getElapsedTime();
    const g = group.current;
    if (!g) return;

    // Inertia decay when not dragging
    if (!drag.active) {
      drag.targetY += drag.velocityY;
      drag.targetX += drag.velocityX;
      drag.velocityY *= 0.95;
      drag.velocityX *= 0.95;
    }

    // Auto-rotation (reduced when dragging)
    const autoY = drag.active ? 0 : Math.sin(t * 0.12) * 0.4;
    const mouseY = drag.active ? 0 : (pointer.x - 0.5) * 0.8;

    g.rotation.y = autoY + mouseY + drag.targetY;
    g.rotation.x = (pointer.y - 0.5) * -0.25 + drag.targetX;
    g.position.y = Math.sin(t * 0.55) * 0.06;
  });

  return (
    <group ref={group}>
      {/* floating slab floor */}
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[9.4, 0.08, 4.2]} />
        <meshStandardMaterial
          color="#0d0d14"
          metalness={0.4}
          roughness={0.6}
          transparent
          opacity={0.55}
          emissive={ACCENT}
          emissiveIntensity={0.03}
        />
      </mesh>
      {RACKS.map((rack) => (
        <Rack key={rack.id} rack={rack} />
      ))}
      <Cables />
    </group>
  );
}

export default function HeroScene() {
  initPointer();
  return (
    <Canvas
      flat
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [7, 7, 7], fov: 35, near: 0.1, far: 200 }}
      style={{ width: '100%', height: '100%' }}
    >
      <Suspense fallback={null}>
        <GrabHandler />
        <CameraRig />
        <ambientLight intensity={0.4} />
        <directionalLight position={[6, 9, 5]} intensity={1.2} />
        <directionalLight position={[-6, 5, -4]} intensity={0.35} color={ACCENT} />
        <pointLight position={[0, 2.5, 0]} intensity={10} distance={18} color={ACCENT} />
        <Datacenter />
        <DriftParticles />
      </Suspense>
    </Canvas>
  );
}
