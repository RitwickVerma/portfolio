'use client';
/* eslint-disable react-hooks/immutability */

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { createNoise2D } from 'simplex-noise';
import { sceneState } from '@/lib/sceneState';
import { advancePhase, phaseProgress, type PhaseState } from '@/lib/phaseMachine';
import { mulberry32 } from '@/lib/random';

// ─── Shared pointer + drag state ──────────────────────────────────────────

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
      e.stopPropagation();
      drag.active = true;
      drag.prevX = e.clientX; drag.prevY = e.clientY;
      drag.velocityX = 0; drag.velocityY = 0;
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

// ─── Constants ────────────────────────────────────────────────────────────

const ACCENT = '#64ffda';
const GATEWAY_ACCENT = '#ffd166';
const WARN_ACCENT = '#ff4444';

// ─── Scene lighting ───────────────────────────────────────────────────────

function SceneLighting() {
  const lightRef = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (lightRef.current) {
      const pulse = Math.sin(clock.getElapsedTime() * 1.2) * 0.3 + 0.7;
      lightRef.current.intensity = 10 + sceneState.spin * 5 + pulse * 2;
    }
  });
  return <pointLight ref={lightRef} position={[0, 2.5, 0]} intensity={10} distance={18} color={ACCENT} />;
}

// ─── Camera rig — asymmetric framing, not mathematically perfect ──────────

const FIT_WIDTH = 9.6;
const FIT_HEIGHT = 7.2;

function CameraRig() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const baseFov = useRef(35);
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(size.height, 1);
    const isMobile = size.width < 768;
    const fov = isMobile ? 50 : 35;
    baseFov.current = fov;
    cam.fov = fov;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(fov / 2));
    const dist = Math.max(FIT_WIDTH / (2 * tanHalf * aspect), FIT_HEIGHT / (2 * tanHalf));
    const dir = new THREE.Vector3(1.0, 0.88, 1.15).normalize();
    cam.position.copy(dir.multiplyScalar(dist));
    cam.lookAt(0, 0.55, 0);
    cam.updateProjectionMatrix();
  }, [camera, size]);
  useFrame(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const target = baseFov.current + sceneState.spin * 14;
    cam.fov += (target - cam.fov) * 0.06;
    cam.updateProjectionMatrix();
  });
  return null;
}

// ─── Depth fog — near crisp, far soft. Real room atmosphere ────────────────

function SceneFog() {
  const scene = useThree((s) => s.scene);
  const size = useThree((s) => s.size);
  useEffect(() => {
    const isMobile = size.width < 768;
    scene.fog = new THREE.Fog('#0a0a0f', isMobile ? 12 : 6, isMobile ? 32 : 18);
    return () => { scene.fog = null; };
  }, [scene, size]);
  return null;
}

// ─── Rack definitions — asymmetric positions, no perfect grid ─────────────

type RackDef = { id: string; name: string; x: number; z: number; height: number; gateway?: boolean; vents?: boolean; warning?: boolean };

const RACKS: RackDef[] = [
  { id: 'VM110', name: 'VM110 Gateway',  x: -3.20, z: -1.30, height: 2.5, gateway: true },
  { id: 'CT101', name: 'CT101 Hermes',    x: -1.00, z: -1.20, height: 2.2 },
  { id: 'CT102', name: 'CT102 DNS',       x:  1.15, z: -1.28, height: 1.9 },
  { id: 'CT104', name: 'CT104 Vaultwarden',x:  3.35, z: -1.15, height: 1.8, warning: true },
  { id: 'CT106', name: 'CT106 Immich',    x: -3.15, z:  1.20, height: 2.3 },
  { id: 'CT107', name: 'CT107 Paperless',  x: -1.05, z:  1.30, height: 2.0 },
  { id: 'CT111', name: 'CT111 Jellyfin',   x:  1.20, z:  1.18, height: 2.4 },
  { id: 'CT113', name: 'CT113 Syncthing',  x:  3.28, z:  1.35, height: 1.8 },
];

// ─── Rack screen (canvas texture — dynamic boot/log/glitch during flash) ───

const BOOT_LOGS: Record<string, string[]> = {
  VM110: ['VM110 login:', '[  OK  ] Traefik v3.6  ▸ active', '[  OK  ] Authelia OIDC ▸ ok', '[  OK  ] Headscale VPN ▸ up', '[  OK  ] WAN: 2.3 Gbps', 'VM110:~# _'],
  CT101: ['CT101 login:', '[  OK  ] Hermes Agent ▸ live', '[  OK  ] deepseek-v4 ▸ loaded', '[  OK  ] Skills: 112 loaded', '[  OK  ] Memory: 2.1GB', 'CT101:~# _'],
  CT102: ['CT102 login:', '[  OK  ] Pi-hole v6  ▸ active', '[  OK  ] Queries: 4.2k/h', '[  OK  ] Blocked: 23.1%', '[  OK  ] Cache hit: 89%', 'CT102:~# _'],
  CT104: ['CT104 login:', '[  OK  ] Vaultwarden ▸ locked', '[  OK  ] Users: 2 enrolled', '[  OK  ] TOTP keys: 7', '[  OK  ] Last sync: 2 min', 'CT104:~# _'],
  CT106: ['CT106 login:', '[  OK  ] Immich ▸ running', '[  OK  ] Photos: 12,847', '[  OK  ] ML: mobilenet ▸ idle', '[  OK  ] Backup: up to date', 'CT106:~# _'],
  CT107: ['CT107 login:', '[  OK  ] Paperless-ngx ▸ up', '[  OK  ] Docs indexed: 2,103', '[  OK  ] Inbox: 14 unread', '[  OK  ] OCR: idle', 'CT107:~# _'],
  CT111: ['CT111 login:', '[  OK  ] Jellyfin ▸ running', '[  OK  ] Library: 1.2 TB', '[  OK  ] Active streams: 0', '[  OK  ] Real-Debrid: ok', 'CT111:~# _'],
  CT113: ['CT113 login:', '[  OK  ] Syncthing ▸ up', '[  OK  ] Peers: 5 online', '[  OK  ] Folders: 12 synced', '[  OK  ] Uptime: 14 days', 'CT113:~# _'],
};

function drawBoot(ctx: CanvasRenderingContext2D, accent: string, logs: string[], progress: number, flicker: boolean) {
  const visible = Math.floor(progress * logs.length) + (flicker && Math.random() < 0.15 ? 0 : 1);
  ctx.fillStyle = accent; ctx.globalAlpha = 0.7; ctx.fillRect(0, 0, 256, 36);
  ctx.fillStyle = '#04060a'; ctx.globalAlpha = 1;
  ctx.font = 'bold 13px monospace'; ctx.textBaseline = 'middle';
  ctx.fillText(logs[0].split(' ')[0].toUpperCase(), 10, 18);
  ctx.fillStyle = accent; ctx.globalAlpha = flicker ? 0.6 + Math.random() * 0.4 : 0.85;
  ctx.font = '12px monospace';
  for (let i = 1; i < Math.min(visible, logs.length); i++) {
    let line = logs[i];
    if (flicker && Math.random() < 0.08) line = '█'.repeat(Math.floor(Math.random() * 20));
    ctx.fillText(line, 10, 48 + (i - 1) * 36);
  }
  if (visible >= logs.length) {
    const cursorOn = flicker || Math.floor(Date.now() / 500) % 2 === 0;
    if (cursorOn) {
      ctx.fillStyle = accent; ctx.globalAlpha = 0.9;
      ctx.fillText('_', 10 + ctx.measureText(logs[logs.length - 1].replace('_', '')).width, 48 + (logs.length - 2) * 36);
    }
  }
}

function drawGlitch(ctx: CanvasRenderingContext2D, accent: string, logs: string[]) {
  ctx.fillStyle = accent; ctx.globalAlpha = 0.7; ctx.fillRect(0, 0, 256, 36);
  ctx.fillStyle = '#04060a'; ctx.globalAlpha = 1;
  ctx.font = 'bold 13px monospace'; ctx.fillText(logs[0].split(' ')[0].toUpperCase(), 10, 18);
  ctx.fillStyle = accent; ctx.globalAlpha = 0.85; ctx.font = '12px monospace';
  for (let i = 1; i < logs.length; i++) ctx.fillText(logs[i], 10, 48 + (i - 1) * 36);

  const imgData = ctx.getImageData(0, 0, 256, 256);
  ctx.clearRect(0, 0, 256, 256);
  const yStride = 4 + Math.floor(Math.random() * 12);
  for (let y = 0; y < 256; y += yStride) {
    const shiftX = Math.random() < 0.3 ? Math.floor((Math.random() - 0.5) * 30) : 0;
    const h = Math.min(yStride, 256 - y);
    ctx.putImageData(imgData, shiftX, y, 0, y, 256, h);
  }
  if (Math.random() < 0.6) {
    const ry = Math.floor(Math.random() * 200);
    ctx.fillStyle = 'rgba(255,50,50,0.25)'; ctx.fillRect(Math.random() * 10, ry, 256, 3);
    ctx.fillStyle = 'rgba(50,255,255,0.25)'; ctx.fillRect(-Math.random() * 10, ry + 6, 256, 3);
  }
  if (Math.random() < 0.4) {
    ctx.fillStyle = 'rgba(' + (Math.random()>0.5?'255':'0') + ',' + (Math.random()>0.5?'255':'0') + ',' + (Math.random()>0.5?'255':'0') + ',0.15)';
    ctx.fillRect(Math.random() * 200, Math.random() * 200, Math.random() * 60, Math.random() * 20);
  }
  for (let y = 0; y < 256; y += 8) {
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(0, y, 256, 1);
  }
}

function RackScreen({ accent, rackId, height }: { accent: string; rackId: string; height: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const texRef = useRef<THREE.CanvasTexture | null>(null);
  const logs = useMemo(() => BOOT_LOGS[rackId] || [rackId + ' login:', '[  OK  ] system running', rackId + ':~# _'], [rackId]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    canvasRef.current = canvas;
    ctxRef.current = canvas.getContext('2d')!;
  }, []);

  useFrame(() => {
    const mesh = meshRef.current;
    const ctx = ctxRef.current;
    if (!mesh || !ctx) return;
    const mat = mesh.material as THREE.MeshBasicMaterial;

    if (!texRef.current) {
      texRef.current = new THREE.CanvasTexture(canvasRef.current!);
      texRef.current.minFilter = THREE.LinearFilter;
      mat.map = texRef.current;
      mat.needsUpdate = true;
    }

    const phase = sceneState._flashPhase;
    const p = sceneState._flashProgress;

    ctx.clearRect(0, 0, 256, 256);
    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, 256, 256);
    if (phase === 0) { /* off — true black */ }
    else if (phase === 1) drawBoot(ctx, accent, logs, p, true);
    else if (phase === 2) drawBoot(ctx, accent, logs, 1.0, false);
    else if (phase === 3) drawGlitch(ctx, accent, logs);
    else if (phase === 4) { ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, 256, 256); }
    texRef.current.needsUpdate = true;
  });

  const screenH = height * 0.62; // proportional to rack height

  return (
    <mesh ref={meshRef} position={[0, 0, 0.455]}>
      <planeGeometry args={[0.72, screenH]} />
      <meshBasicMaterial color="#ffffff" />
    </mesh>
  );
}

// ─── Rack indicator (unique per-rack blink pattern) ────────────────────────

function RackIndicator({ accent, rackId, warning }: { accent: string; rackId: string; warning?: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const blinkOffset = useRef(rackId.charCodeAt(2) * 0.3 % 2);
  const color = warning ? WARN_ACCENT : accent;
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const baseRate = warning ? 3.5 : 1.2 + (rackId.charCodeAt(1) % 7) * 0.25;
    const rate = baseRate + sceneState.spin * 8;
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    // Flash boost
    let flashEmit = 0;
    const phase = sceneState._flashPhase;
    if (phase === 1) flashEmit = sceneState._flashProgress * 12;
    else if (phase === 2) flashEmit = 12;
    else if (phase === 3) flashEmit = Math.random() * 12;
    else if (phase === 4) flashEmit = 12 * (1 - sceneState._flashProgress);
    mat.emissiveIntensity = 1.0 + Math.sin(t * rate + blinkOffset.current) * 0.7 + flashEmit;
  });
  return (
    <mesh ref={ref} position={[0, 0.68, 0]}>
      <sphereGeometry args={[0.055, 12, 12]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.3} />
    </mesh>
  );
}

// ─── Rack LEDs (layered waveforms, unique per rack) ────────────────────────

const RACK_LED_PATTERNS: Record<string, number[]> = {
  VM110: [0.5, 0.3, 0.7],
  CT101: [0.3, 0.2, 0.4],
  CT102: [0.7, 0.0, 0.2],
  CT104: [1.0, 0.0, 0.0],
  CT106: [0.4, 0.5, 0.3],
  CT107: [0.2, 0.6, 0.1],
  CT111: [0.35, 0.15, 0.5],
  CT113: [0.0, 0.0, 0.0],
};

function RackLights({ accent, rackId }: { accent: string; rackId: string }) {
  const refs = useRef<Array<THREE.Mesh | null>>([]);
  const pattern = RACK_LED_PATTERNS[rackId] || [0.3, 0.3, 0.3];
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const spinBoost = sceneState.spin * 3;
    const phase = sceneState._flashPhase;
    const p = sceneState._flashProgress;
    refs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const base = Math.sin(t * (1.0 + pattern[i] * 2) + i) * 0.3;
      const harmonic = Math.sin(t * (2.5 + pattern[i] * 0.8) + i * 2.7) * 0.12;
      const activity = Math.min(sceneState.spin * 0.2, 0.3);
      // Flash burst per phase
      let flash = 0;
      if (phase === 1) flash = 0.45 + p * 14; // power-on surge 0.45→14.45
      else if (phase === 2) flash = 14 + Math.sin(t * 15 + i) * 0.5; // steady bright + shimmer
      else if (phase === 3) flash = 0.3 + Math.random() * 14; // glitch flicker
      else if (phase === 4) flash = 14 * (1 - p); // fade 14→0
      mat.emissiveIntensity = 0.45 + (base + harmonic + activity + spinBoost * 0.1 + flash);
    });
  });
  return (
    <group>
      {[0, 1, 2].map(i => (
        <mesh key={i} ref={m => { refs.current[i] = m }} position={[-0.24 + i * 0.24, 0, 0]}>
          <sphereGeometry args={[0.032, 8, 8]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Rack (body + screen + indicator + lights + label) ─────────────────────

function Rack({ rack }: { rack: RackDef }) {
  const accent = rack.gateway ? GATEWAY_ACCENT : ACCENT;
  const bodyColor = rack.gateway ? '#221f2e' : '#17171f';
  const h = rack.height;
  const halfH = h / 2;
  return (
    <group position={[rack.x, 0, rack.z]}>
      <mesh position={[0, halfH, 0]}>
        <boxGeometry args={[1, h, 0.9]} />
        <meshStandardMaterial color={bodyColor} metalness={0.6} roughness={0.35} emissive={accent} emissiveIntensity={0.08} />
      </mesh>
      <group position={[0, halfH, 0]}>
        <RackScreen accent={accent} rackId={rack.id} height={h} />
        <RackIndicator accent={accent} rackId={rack.id} warning={rack.warning} />
        <group position={[0, -(h * 0.31) - 0.06, 0.46]}>
          <RackLights accent={accent} rackId={rack.id} />
        </group>
      </group>
      <Html position={[0, h + 0.5, 0]} center zIndexRange={[40, 0]} style={{ pointerEvents: 'none' }} className="hidden sm:block">
        <div className="pointer-events-none flex select-none items-center gap-1.5 whitespace-nowrap rounded-full border border-white/10 bg-[#0a0a0f]/70 px-2.5 py-1 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: rack.warning ? WARN_ACCENT : accent, boxShadow: `0 0 6px ${rack.warning ? WARN_ACCENT : accent}` }} />
          <span className="text-[10px] font-medium tracking-wider text-zinc-300">{rack.name}</span>
        </div>
      </Html>
    </group>
  );
}

// ─── Static cables ─────────────────────────────────────────────────────────

const CABLE_PAIRS: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [4, 5], [5, 6], [6, 7], [0, 4], [1, 5], [2, 6], [3, 7],
];

function cableEndpoints(a: RackDef, b: RackDef): [THREE.Vector3, THREE.Vector3] {
  const dx = b.x - a.x, dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  const nx = dx / len, nz = dz / len;
  const half = 0.54;
  return [
    new THREE.Vector3(a.x + nx * half, a.height * 0.7, a.z + nz * half),
    new THREE.Vector3(b.x - nx * half, b.height * 0.7, b.z - nz * half),
  ];
}

function StaticCable({ from, to }: { from: THREE.Vector3; to: THREE.Vector3 }) {
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
  return <group>{cables.map(c => <StaticCable key={c.key} from={c.from} to={c.to} />)}</group>;
}

// ════════════════════════════════════════════════════════════════════════════
// LAYER 1: AIRFLOW — directed cold-air drift through rack aisles
// ════════════════════════════════════════════════════════════════════════════

let _flowTex: THREE.Texture | null = null;
function getFlowTex() {
  if (_flowTex) return _flowTex;
  if (typeof document === 'undefined') return new THREE.Texture();
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.3)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  _flowTex = new THREE.CanvasTexture(canvas);
  _flowTex.needsUpdate = true;
  return _flowTex;
}

const FLOW_COUNT = 200;

let _noise2d: ReturnType<typeof createNoise2D> | null = null;
function noise2d() {
  if (!_noise2d) _noise2d = createNoise2D();
  return _noise2d;
}

function AirflowLayer() {
  const geometry = useMemo(() => {
    const rand = mulberry32(0x64ffda);
    const pos = new Float32Array(FLOW_COUNT * 3);
    for (let i = 0; i < FLOW_COUNT; i++) {
      pos[i * 3] = (rand() - 0.5) * 12;
      pos[i * 3 + 1] = -0.5 + rand() * 1.5;
      pos[i * 3 + 2] = (rand() - 0.5) * 6;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  const seedX = useMemo(() => {
    const rand = mulberry32(0xcafe01);
    const arr = new Float32Array(FLOW_COUNT);
    for (let i = 0; i < FLOW_COUNT; i++) arr[i] = rand() * 100;
    return arr;
  }, []);
  const seedY = useMemo(() => {
    const rand = mulberry32(0xcafe02);
    const arr = new Float32Array(FLOW_COUNT);
    for (let i = 0; i < FLOW_COUNT; i++) arr[i] = rand() * 100;
    return arr;
  }, []);

  useFrame((state, delta) => {
    const attr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const t = state.clock.getElapsedTime();
    const dt = Math.min(delta, 0.1);
    const n2d = noise2d();
    const orbX = sceneState.dcRotY * 0.15;
    const orbZ = sceneState.dcRotX * 0.15;

    for (let i = 0; i < FLOW_COUNT; i++) {
      const idx = i * 3;
      // Directed airflow through aisles — Z is the aisle direction
      const nx = n2d(seedX[i] + t * 0.06, seedY[i]) * 0.3;
      const nz = 0.15 + n2d(seedX[i], seedY[i] + t * 0.06) * 0.2;
      const jitterX = n2d(seedX[i] + 5, seedY[i] + 5 + t * 0.05) * 0.08;
      const jitterZ = n2d(seedX[i] + 8, seedY[i] + 8 + t * 0.05) * 0.08;
      arr[idx] += (nx + orbX + jitterX) * dt;
      arr[idx + 1] += 0.04 * dt;
      arr[idx + 2] += (nz + orbZ + jitterZ) * dt;
      if (arr[idx + 1] > 1.8) { arr[idx + 1] = -0.5; arr[idx] = (Math.random() - 0.5) * 10; arr[idx + 2] = (Math.random() - 0.5) * 5; }
      if (Math.abs(arr[idx]) > 7 || Math.abs(arr[idx + 2]) > 5) { arr[idx] = (Math.random() - 0.5) * 8; arr[idx + 1] = -0.3 + Math.random(); arr[idx + 2] = (Math.random() - 0.5) * 4; }
    }
    attr.needsUpdate = true;
  });

  return (
    <points geometry={geometry}>
      <pointsMaterial map={getFlowTex()} color={ACCENT} size={0.12} sizeAttenuation transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// LAYER 3: CABLE PULSES — data packets traveling between racks
// ════════════════════════════════════════════════════════════════════════════

const PULSE_COUNT = 50; // max simultaneous pulses (expanded during flash)

function CablePulses() {
  const geometry = useMemo(() => {
    const pos = new Float32Array(PULSE_COUNT * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  const curves = useMemo(() =>
    CABLE_PAIRS.map(([ai, bi]) => {
      const [from, to] = cableEndpoints(RACKS[ai], RACKS[bi]);
      const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
      mid.y += 0.55;
      return new THREE.CatmullRomCurve3([from, mid, to]);
    }), []);

  const pulses = useRef<Array<{ pair: number; t: number; speed: number }>>([]);
  const matRef = useRef<THREE.PointsMaterial>(null);

  useFrame((_, delta) => {
    const attr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const dt = Math.min(delta, 0.1);
    const phase = sceneState._flashPhase;
    const active = phase > 0;
    const maxPulses = active ? 40 : 8;
    const spawnRate = active ? dt * 25 : dt * 2;
    const baseSpeed = active ? 0.7 : 0.2;

    // Spawn
    if (pulses.current.length < maxPulses && Math.random() < spawnRate) {
      pulses.current.push({
        pair: Math.floor(Math.random() * curves.length),
        t: 0,
        speed: baseSpeed * (0.6 + Math.random() * 0.8),
      });
    }

    // Move
    for (let i = pulses.current.length - 1; i >= 0; i--) {
      const p = pulses.current[i];
      p.t += p.speed * dt;
      if (p.t >= 1) { pulses.current.splice(i, 1); continue; }
      const pt = curves[p.pair].getPointAt(p.t);
      arr[i * 3] = pt.x;
      arr[i * 3 + 1] = pt.y;
      arr[i * 3 + 2] = pt.z;
    }

    for (let i = pulses.current.length; i < PULSE_COUNT; i++) {
      arr[i * 3] = arr[i * 3 + 1] = arr[i * 3 + 2] = -100;
    }
    attr.needsUpdate = true;

    // Flash-reactive material
    if (matRef.current) {
      matRef.current.size = active ? 0.32 : 0.10;
      matRef.current.opacity = active ? 0.95 : 0.8;
    }
  });

  return (
    <points geometry={geometry}>
      <pointsMaterial ref={matRef} map={getFlowTex()} color="#ffffff" size={0.10} sizeAttenuation transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DATACENTER — parent group, writes to sceneState
// ════════════════════════════════════════════════════════════════════════════

function Datacenter() {
  const group = useRef<THREE.Group>(null);
  const { gl } = useThree();
  const flashState = useRef<PhaseState>({ phase: 0, timer: 0 });
  const lastClick = useRef(0);
  useEffect(() => {
    const canvas = gl.domElement;
    const handler = (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const now = performance.now();
      if (now - lastClick.current < 400) {
        if (flashState.current.phase === 0) {
          flashState.current = { phase: 1, timer: 0 };
        }
        lastClick.current = 0;
      } else {
        lastClick.current = now;
      }
    };
    canvas.addEventListener('pointerdown', handler, { capture: true });
    return () => canvas.removeEventListener('pointerdown', handler, { capture: true });
  }, [gl]);
  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const g = group.current;
    if (!g) return;
    smoothedPointer.x += (pointer.x - smoothedPointer.x) * LERP;
    smoothedPointer.y += (pointer.y - smoothedPointer.y) * LERP;
    if (!drag.active) {
      drag.velocityY *= 0.92;
      drag.velocityX *= 0.92;
    }
    const autoY = Math.sin(t * 0.12) * 0.4;
    const mouseY = (smoothedPointer.x - 0.5) * 0.8;
    g.rotation.y = autoY + mouseY + drag.targetY;
    g.rotation.x = (smoothedPointer.y - 0.5) * -0.25 + drag.targetX;
    g.position.y = Math.sin(t * 0.55) * 0.06;
    sceneState.dcRotY = g.rotation.y;
    sceneState.dcRotX = g.rotation.x;
    sceneState.spin = Math.hypot(drag.velocityX, drag.velocityY);
    sceneState.mouseX = smoothedPointer.x;
    sceneState.mouseY = smoothedPointer.y;
    // Phase machine
    const fs = flashState.current;
    const dt = Math.min(delta, 0.1);
    flashState.current = advancePhase(fs, dt);
    sceneState._flashPhase = flashState.current.phase;
    sceneState._flashProgress = phaseProgress(flashState.current);
  });
  return (
    <group ref={group}>
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[9.4, 0.08, 4.2]} />
        <meshStandardMaterial color="#0d0d14" metalness={0.4} roughness={0.6} transparent opacity={0.55} emissive={ACCENT} emissiveIntensity={0.03} />
      </mesh>
      {RACKS.map(rack => <Rack key={rack.id} rack={rack} />)}
      <Cables />
      <CablePulses />
    </group>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORT — three intentional layers: airflow → atmosphere, vents → machines,
//          cursor → interaction, datacenter → physical object
// ════════════════════════════════════════════════════════════════════════════

export default function HeroScene() {
  initPointer();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: '100px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={wrapRef} style={{ width: '100%', height: '100%' }}>
    <Canvas
      flat
      dpr={[1, 2]}
      frameloop={inView ? 'always' : 'never'}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false }}
      camera={{ position: [7, 7, 7], fov: 35, near: 0.1, far: 200 }}
      onCreated={({ gl }) => { gl.domElement.tabIndex = -1; gl.domElement.style.outline = 'none'; }}
      style={{ touchAction: 'pan-y', WebkitTapHighlightColor: 'transparent', width: '100%', height: '100%', background: '#0a0a0f', cursor: 'none' }}
    >
      <Suspense fallback={null}>
        <GrabHandler />
        <CameraRig />
        <SceneFog />
        <ambientLight intensity={0.4} />
        <directionalLight position={[6, 9, 5]} intensity={1.2} />
        <directionalLight position={[-6, 5, -4]} intensity={0.35} color={ACCENT} />
        <SceneLighting />
        <AirflowLayer />
        <Datacenter />
      </Suspense>
    </Canvas>
    </div>
  );
}
