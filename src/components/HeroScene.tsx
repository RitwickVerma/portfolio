'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';

// Shared pointer state — lerped for smooth entry, no snap
const pointer = { x: 0.5, y: 0.5 };
const smoothedPointer = { x: 0.5, y: 0.5 };
const LERP = 0.08;
let pointerInit = false;
function initPointer() {
  if (pointerInit) return;
  pointerInit = true;
  window.addEventListener('pointermove', (e: PointerEvent) => {
    pointer.x = e.clientX / window.innerWidth;
    pointer.y = 1.0 - e.clientY / window.innerHeight;
  }, { passive: true });
}

// Drag state
const drag = {
  active: false,
  prevX: 0, prevY: 0,
  targetY: 0, targetX: 0,
  velocityY: 0, velocityX: 0,
};

function onDragMove(e: PointerEvent) {
  if (!drag.active) return;
  const dx = e.clientX - drag.prevX;
  const dy = e.clientY - drag.prevY;
  drag.targetY += dx * 0.01;
  drag.targetX += dy * 0.01;
  drag.velocityY = dx * 0.01;
  drag.velocityX = dy * 0.01;
  drag.prevX = e.clientX;
  drag.prevY = e.clientY;
}

function onDragUp() {
  drag.active = false;
  window.removeEventListener('pointermove', onDragMove);
  window.removeEventListener('pointerup', onDragUp);
}

function GrabHandler() {
  const { gl } = useThree();
  useEffect(() => {
    const el = gl.domElement;
    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      drag.active = true;
      drag.prevX = e.clientX;
      drag.prevY = e.clientY;
      drag.velocityX = 0;
      drag.velocityY = 0;
      window.addEventListener('pointermove', onDragMove, { passive: true });
      window.addEventListener('pointerup', onDragUp, { once: true });
    };
    el.addEventListener('pointerdown', onDown);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onDragMove);
      window.removeEventListener('pointerup', onDragUp);
    };
  }, [gl]);
  return null;
}

const ACCENT = '#64ffda';
const GATEWAY_ACCENT = '#ffd166';

type RackDef = { id: string; name: string; x: number; z: number; gateway?: boolean };

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

const CABLE_PAIRS: Array<[number, number]> = [
  [0,1],[1,2],[2,3],[4,5],[5,6],[6,7],[0,4],[1,5],[2,6],[3,7],
];

const FIT_WIDTH = 9.6;
const FIT_HEIGHT = 7.2;

function cableEndpoints(a: RackDef, b: RackDef): [THREE.Vector3, THREE.Vector3] {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  const nx = dx / len, nz = dz / len;
  const half = 0.54, y = 0.85;
  return [
    new THREE.Vector3(a.x + nx * half, y, a.z + nz * half),
    new THREE.Vector3(b.x - nx * half, y, b.z - nz * half),
  ];
}

function CameraRig() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(size.height, 1);
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const dist = Math.max(FIT_WIDTH / (2 * tanHalf * aspect), FIT_HEIGHT / (2 * tanHalf));
    const dir = new THREE.Vector3(1, 1, 1).normalize();
    cam.position.copy(dir.multiplyScalar(dist));
    cam.lookAt(0, 0.55, 0);
    cam.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

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
      {[0,1,2].map(i => (
        <mesh key={i} ref={m => { refs.current[i] = m }} position={[-0.24 + i*0.24, 0, 0]}>
          <sphereGeometry args={[0.032, 8, 8]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function Rack({ rack }: { rack: RackDef }) {
  const accent = rack.gateway ? GATEWAY_ACCENT : ACCENT;
  const bodyColor = rack.gateway ? '#221f2e' : '#17171f';
  return (
    <group position={[rack.x, 0, rack.z]}>
      <mesh>
        <boxGeometry args={[1, 2.2, 0.9]} />
        <meshStandardMaterial color={bodyColor} metalness={0.6} roughness={0.35} emissive={accent} emissiveIntensity={0.08} />
      </mesh>
      <mesh position={[0, 0.1, 0.455]}>
        <boxGeometry args={[0.72, 1.6, 0.015]} />
        <meshStandardMaterial color="#1e1e28" metalness={0.5} roughness={0.5} emissive={accent} emissiveIntensity={0.04} />
      </mesh>
      <RackLights accent={accent} phase={rack.x * 1.9} />
      <mesh position={[0, 1.18, 0]}>
        <sphereGeometry args={[0.055, 12, 12]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.3} />
      </mesh>
      <Html position={[0, 1.62, 0]} center zIndexRange={[40, 0]} style={{ pointerEvents: 'none' }}>
        <div className="pointer-events-none flex select-none items-center gap-1.5 whitespace-nowrap rounded-full border border-white/10 bg-[#0a0a0f]/70 px-2.5 py-1 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent, boxShadow: `0 0 6px ${accent}` }} />
          <span className="text-[10px] font-medium tracking-wider text-zinc-300">{rack.name}</span>
        </div>
      </Html>
    </group>
  );
}

function Cable({ from, to }: { from: THREE.Vector3; to: THREE.Vector3 }) {
  const geometry = useMemo(() => {
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    mid.y += 0.55;
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3([from, mid, to]), 20, 0.022, 6, false);
  }, [from, to]);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={0.55} transparent opacity={0.7} roughness={0.35} metalness={0.2} />
    </mesh>
  );
}

function Cables() {
  const cables = useMemo(() =>
    CABLE_PAIRS.map(([ai, bi]) => {
      const [from, to] = cableEndpoints(RACKS[ai], RACKS[bi]);
      return { key: `${RACKS[ai].id}-${RACKS[bi].id}`, from, to };
    }), []);
  return <group>{cables.map(c => <Cable key={c.key} from={c.from} to={c.to} />)}</group>;
}

/** Round particle texture — canvas-drawn circle, no square artifacts */
let _particleTex: THREE.Texture | null = null;
function getParticleTex() {
  if (_particleTex) return _particleTex;
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.15, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.3)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  _particleTex = new THREE.CanvasTexture(canvas);
  _particleTex.needsUpdate = true;
  return _particleTex;
}

// Easter egg state
const rickroll = { intensity: 0, triggered: false };

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Bubble particles — spawn below, drift up toward cursor, die, respawn */
function DriftParticles({ count = 200 }: { count?: number }) {
  const rand = useMemo(() => mulberry32(0x64ffda), []);
  const randB = useMemo(() => mulberry32(0xc0113), []);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [count]);

  const vel = useMemo(() => new Float32Array(count * 3), [count]);
  const life = useMemo(() => new Float32Array(count), [count]);
  const maxLife = useMemo(() => new Float32Array(count), [count]);
  const seeded = useRef(false);

  // Seed initial state once
  if (!seeded.current) {
    seeded.current = true;
    const arr = (geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
    for (let i = 0; i < count; i++) {
      spawn(arr, vel, life, maxLife, i, rand);
    }
  }

  const matRef = useRef<THREE.PointsMaterial>(null);

  useFrame((_, delta) => {
    const attr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;

    const cx = (smoothedPointer.x - 0.5) * 8;
    const cz = (smoothedPointer.y - 0.5) * 5;
    const bounds = 7; // kill zone radius

    const spin = Math.hypot(drag.velocityX, drag.velocityY);
    const boost = 1 + spin * 40;

    if (matRef.current) {
      matRef.current.size += ((0.04 + spin * 6) - matRef.current.size) * 0.1;
    }

    if (spin > 0.3 && !rickroll.triggered) {
      rickroll.intensity = Math.min(1, rickroll.intensity + spin * 0.08);
    } else if (!drag.active) {
      rickroll.intensity = Math.max(0, rickroll.intensity - 0.0008);
    }

    const dt = Math.min(delta, 0.1);
    for (let i = 0; i < count; i++) {
      life[i] -= dt;
      if (life[i] <= 0) {
        spawn(arr, vel, life, maxLife, i, rand);
        continue;
      }

      const idx = i * 3;
      // Cursor attraction (gentle, limited)
      const dx = cx - arr[idx];
      const dz = cz - arr[idx + 2];
      const dist = Math.hypot(dx, dz) + 0.1;
      const force = Math.min(1, 2 / (dist + 1)) * dt * 0.8;
      vel[idx] += dx / dist * force;
      vel[idx + 2] += dz / dist * force;

      // Random jitter to prevent line formation
      vel[idx] += (rand() - 0.5) * dt * 0.3;
      vel[idx + 2] += (rand() - 0.5) * dt * 0.3;

      // Move
      arr[idx] += vel[idx] * dt;
      arr[idx + 1] += vel[idx + 1] * dt * boost;
      arr[idx + 2] += vel[idx + 2] * dt;

      // Kill if too far from center
      if (Math.abs(arr[idx]) > bounds || Math.abs(arr[idx + 2]) > bounds || arr[idx + 1] > 4) {
        spawn(arr, vel, life, maxLife, i, rand);
      }
    }
    attr.needsUpdate = true;
  });

  return (
    <points geometry={geometry}>
      <pointsMaterial ref={matRef} map={getParticleTex()} color={ACCENT} size={0.05} sizeAttenuation transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

function spawn(
  arr: Float32Array, vel: Float32Array, life: Float32Array, maxLife: Float32Array,
  i: number, rand: () => number
) {
  const idx = i * 3;
  arr[idx] = (rand() - 0.5) * 10;
  arr[idx + 1] = -1 - rand() * 1.5; // spawn near scene, visible idle
  arr[idx + 2] = (rand() - 0.5) * 6;
  vel[idx] = (rand() - 0.5) * 0.5;
  vel[idx + 1] = 0.3 + rand() * 0.7;
  vel[idx + 2] = (rand() - 0.5) * 0.5;
  const ml = 2 + rand() * 4;
  life[i] = ml;
  maxLife[i] = ml;
}

function Datacenter() {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const g = group.current;
    if (!g) return;
    smoothedPointer.x += (pointer.x - smoothedPointer.x) * LERP;
    smoothedPointer.y += (pointer.y - smoothedPointer.y) * LERP;
    if (!drag.active) {
      drag.targetY += drag.velocityY;
      drag.targetX += drag.velocityX;
      drag.velocityY *= 0.985;
      drag.velocityX *= 0.985;
    }
    const autoY = Math.sin(t * 0.12) * 0.4;
    const mouseY = (smoothedPointer.x - 0.5) * 0.8;
    g.rotation.y = autoY + mouseY + drag.targetY;
    g.rotation.x = (smoothedPointer.y - 0.5) * -0.25 + drag.targetX;
    g.position.y = Math.sin(t * 0.55) * 0.06;
  });
  return (
    <group ref={group}>
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[9.4, 0.08, 4.2]} />
        <meshStandardMaterial color="#0d0d14" metalness={0.4} roughness={0.6} transparent opacity={0.55} emissive={ACCENT} emissiveIntensity={0.03} />
      </mesh>
      {RACKS.map(rack => <Rack key={rack.id} rack={rack} />)}
      <Cables />
    </group>
  );
}

export default function HeroScene() {
  initPointer();
  const overlayRef = useRef<HTMLDivElement>(null);

  // Easter egg: poll rickroll intensity, show overlay when triggered
  useEffect(() => {
    const check = () => {
      const el = overlayRef.current;
      if (!el) return;
      const ri = rickroll.intensity;
      if (ri >= 0.95 && !rickroll.triggered) {
        rickroll.triggered = true;
        el.style.opacity = '1';
        el.style.pointerEvents = 'auto';
      }
      el.style.opacity = String(Math.min(ri * 2, 1));
    };
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Rickroll overlay */}
      <div
        ref={overlayRef}
        style={{
          position: 'absolute', inset: 0, zIndex: 100,
          opacity: 0, pointerEvents: 'none',
          transition: 'opacity 0.3s',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: '#000',
          color: '#fff', fontFamily: 'Impact, sans-serif', fontSize: 'clamp(2rem, 8vw, 6rem)',
        }}
      >
        <div style={{ animation: 'rickrollSpin 0.5s linear infinite' }}>🌀</div>
        <div style={{ marginTop: '1rem' }}>YOU GOT</div>
        <div style={{ color: '#ff4444', fontSize: '1.5em' }}>RICKROLL'D</div>
        <style>{`@keyframes rickrollSpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    <Canvas flat dpr={[1, 1.75]} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} camera={{ position: [7,7,7], fov: 35, near: 0.1, far: 200 }} style={{ width:'100%', height:'100%' }}>
      <Suspense fallback={null}>
        <GrabHandler />
        <CameraRig />
        <ambientLight intensity={0.4} />
        <directionalLight position={[6,9,5]} intensity={1.2} />
        <directionalLight position={[-6,5,-4]} intensity={0.35} color={ACCENT} />
        <pointLight position={[0,2.5,0]} intensity={10} distance={18} color={ACCENT} />
        <Datacenter />
        <DriftParticles />
      </Suspense>
    </Canvas>
    </div>
  );
}
