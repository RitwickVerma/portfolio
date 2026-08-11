'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

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

// Shared scene state — every component reads this for connected reactivity
const sceneState = { spin: 0, dcRotY: 0, dcRotX: 0, mouseX: 0, mouseY: 0, windAngle: 0 };

function SceneLighting() {
  const lightRef = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (lightRef.current) {
      const pulse = Math.sin(clock.getElapsedTime() * 1.2) * 0.3 + 0.7;
      lightRef.current.intensity = 10 + sceneState.spin * 30 + pulse * 2;
    }
  });
  return <pointLight ref={lightRef} position={[0, 2.5, 0]} intensity={10} distance={18} color={ACCENT} />;
}

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
  useFrame(() => {
    const cam = camera as THREE.PerspectiveCamera;
    // FOV kick on spin — lens feels the inertia, settles back
    const target = 35 + sceneState.spin * 14;
    cam.fov += (target - cam.fov) * 0.06;
    cam.updateProjectionMatrix();
  });
  return null;
}

function RackLights({ accent, phase }: { accent: string; phase: number }) {
  const refs = useRef<Array<THREE.Mesh | null>>([]);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const rate = 1.8 + sceneState.spin * 20;
    const amp = 0.3 + sceneState.spin * 0.5;
    refs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.55 + Math.sin(t * rate + i * 2.2 + phase) * amp;
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

function RackScreen({ accent, rackId }: { accent: string; rackId: string }) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    canvasRef.current = canvas;
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    if (matRef.current) {
      matRef.current.map = tex;
      matRef.current.needsUpdate = true;
    }
  }, []);
  useFrame(({ clock }) => {
    const canvas = canvasRef.current;
    const mat = matRef.current;
    if (!canvas || !mat) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const t = clock.getElapsedTime();
    const rows = 7;
    const rowH = 256 / rows;
    // Scanline sweep — moves with scene life
    const sweep = (t * 0.25 + sceneState.spin * 0.8) % 1;
    ctx.fillStyle = '#05070c';
    ctx.fillRect(0, 0, 256, 256);
    ctx.font = '12px monospace';
    ctx.textBaseline = 'middle';
    for (let r = 0; r < rows; r++) {
      // Scroll text by time — looks like live logs
      const scroll = Math.floor(t * 2.2 + r * 3.7 + sceneState.spin * 40);
      const msg = `${rackId} [${String((scroll * 7) % 100).padStart(3, '0')}] ${Math.abs(Math.sin(scroll * 0.13) * 100).toFixed(1)}%`;
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t * 0.8 + r * 0.9);
      ctx.fillText(msg, 6, r * rowH + rowH * 0.5);
      ctx.globalAlpha = 1;
    }
    // Scanline highlight
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, sweep * 256, 256, 2);
    mat.map!.needsUpdate = true;
  });
  return (
    <mesh position={[0, 0.1, 0.457]}>
      <planeGeometry args={[0.72, 1.6]} />
      <meshBasicMaterial ref={matRef} color="#0a0f14" />
    </mesh>
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
      <RackScreen accent={accent} rackId={rack.id} />
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
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!meshRef.current) return;
    const sway = sceneState.spin * 0.3;
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    mid.y += 0.55;
    mid.x += sway;
    const geom = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([from, mid, to]), 20, 0.022, 6, false);
    meshRef.current.geometry.dispose();
    meshRef.current.geometry = geom;
  });
  const geometry = useMemo(() => {
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    mid.y += 0.55;
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3([from, mid, to]), 20, 0.022, 6, false);
  }, [from, to]);
  return (
    <mesh ref={meshRef} geometry={geometry}>
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

/** Round particle texture — built lazily on client after mount */
let _particleTex: THREE.Texture | null = null;
function getParticleTex() {
  if (_particleTex) return _particleTex;
  if (typeof document === 'undefined') return new THREE.Texture(); // SSR fallback, NOT cached
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.08, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.5)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  _particleTex = new THREE.CanvasTexture(canvas);
  _particleTex.needsUpdate = true;
  return _particleTex;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Organic firefly particles — each blinks independently, swells with spin */
function DriftParticles({ count = 300 }: { count?: number }) {
  const rand = useMemo(() => mulberry32(0x64ffda), []);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    return geo;
  }, [count]);

  const vel = useMemo(() => new Float32Array(count * 3), [count]);
  const life = useMemo(() => new Float32Array(count), [count]);
  const blinkSpeed = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) arr[i] = 0.5 + rand() * 3;
    return arr;
  }, [count, rand]);
  const blinkPhase = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) arr[i] = rand() * Math.PI * 2;
    return arr;
  }, [count, rand]);
  const curlPhase = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) arr[i] = rand() * Math.PI * 2;
    return arr;
  }, [count, rand]);

  const seeded = useRef(false);
  if (!seeded.current) {
    seeded.current = true;
    const arr = (geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
    for (let i = 0; i < count; i++) spawnFirefly(arr, vel, life, i, rand, 0);
  }

  useFrame((state, delta) => {
    const attr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const sizeAttr = geometry.getAttribute('size') as THREE.BufferAttribute;
    const sizeArr = sizeAttr.array as Float32Array;
    const alphaAttr = geometry.getAttribute('alpha') as THREE.BufferAttribute;
    const alphaArr = alphaAttr.array as Float32Array;
    const t = state.clock.getElapsedTime();

    const cx = (smoothedPointer.x - 0.5) * 8;
    const cz = (smoothedPointer.y - 0.5) * 5;
    const spin = Math.hypot(drag.velocityX, drag.velocityY);

    // Orbital forces from datacenter rotation — particles swirl with the scene
    const orbX = sceneState.dcRotY * 1.5;
    const orbZ = sceneState.dcRotX * 1.5;

    // Wind — follows evolving windAngle from sceneState
    const windStrength = 0.04;
    const windX = Math.cos(sceneState.windAngle) * windStrength;
    const windZ = Math.sin(sceneState.windAngle) * windStrength;

    const dt = Math.min(delta, 0.1);
    for (let i = 0; i < count; i++) {
      life[i] -= dt;
      if (life[i] <= 0) {
        spawnFirefly(arr, vel, life, i, rand, spin);
        continue;
      }

      const idx = i * 3;
      const px = arr[idx], py = arr[idx + 1], pz = arr[idx + 2];

      // Firefly blinking
      const pulse = Math.sin(t * blinkSpeed[i] + blinkPhase[i]) * 0.5 + 0.5;
      const baseSize = 0.14 + spin * 4;
      sizeArr[i] = baseSize * (0.5 + pulse * 0.5);
      alphaArr[i] = 0.55 + pulse * 0.35 + spin * 5;

      // Organic curling
      const curlX = Math.sin(py * 0.7 + t * 0.5 + curlPhase[i]) * 0.6;
      const curlZ = Math.cos(px * 0.7 + t * 0.5 + curlPhase[i]) * 0.6;

      const dx = cx - px, dz = cz - pz;
      const dist = Math.hypot(dx, dz) + 0.3;
      const cursorForce = 1.5 / (dist * dist + 0.5);

      const vortexForce = spin * 15;
      const vortexX = -pz * vortexForce;
      const vortexZ = px * vortexForce;

      vel[idx] += (dx * cursorForce + curlX + vortexX + orbX + windX) * dt;
      vel[idx + 2] += (dz * cursorForce + curlZ + vortexZ + orbZ + windZ) * dt;
      vel[idx + 1] += (0.15 + spin * 5) * dt;

      vel[idx] *= 0.995;
      vel[idx + 1] *= 0.995;
      vel[idx + 2] *= 0.995;

      arr[idx] += vel[idx] * dt;
      arr[idx + 1] += vel[idx + 1] * dt;
      arr[idx + 2] += vel[idx + 2] * dt;

      if (Math.abs(arr[idx]) > 8 || arr[idx + 1] > 5 || arr[idx + 1] < -3 || Math.abs(arr[idx + 2]) > 6) {
        spawnFirefly(arr, vel, life, i, rand, spin);
      }
    }
    attr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
  });

  const shader = useMemo(() => ({
    uniforms: {
      uColor: { value: new THREE.Color(ACCENT) },
      uTexture: { value: getParticleTex() },
    },
    vertexShader: /* glsl */`
      attribute float size;
      attribute float alpha;
      varying float vAlpha;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (500.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
        vAlpha = alpha;
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uColor;
      uniform sampler2D uTexture;
      varying float vAlpha;
      void main() {
        vec4 tex = texture2D(uTexture, gl_PointCoord);
        float a = tex.a * clamp(vAlpha, 0.0, 1.0);
        gl_FragColor = vec4(uColor * 1.4, a);
      }
    `,
  }), []);

  return (
    <points geometry={geometry}>
      <shaderMaterial
        uniforms={shader.uniforms}
        vertexShader={shader.vertexShader}
        fragmentShader={shader.fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function spawnFirefly(
  arr: Float32Array, vel: Float32Array, life: Float32Array,
  i: number, rand: () => number, spin: number
) {
  const idx = i * 3;
  const r = 1 + spin * 2;
  arr[idx] = (rand() - 0.5) * 10 * r;
  arr[idx + 1] = -1.5 + rand() * 4.5;
  arr[idx + 2] = (rand() - 0.5) * 7 * r;
  vel[idx] = (rand() - 0.5) * 0.3;
  vel[idx + 1] = 0.1 + rand() * 0.4;
  vel[idx + 2] = (rand() - 0.5) * 0.3;
  life[i] = 3 + rand() * 5;
}

function GridFloor() {
  const gridRef = useRef<THREE.GridHelper>(null);
  useFrame(({ clock }) => {
    if (gridRef.current) {
      const t = clock.getElapsedTime();
      // Grid pulses with scene energy
      const mat = gridRef.current.material as THREE.Material;
      mat.transparent = true;
      mat.opacity = 0.22 + Math.min(sceneState.spin * 2, 0.35) + Math.sin(t * 0.6) * 0.04;
      gridRef.current.position.y = -0.06 + Math.sin(t * 0.4) * 0.015;
    }
  });
  return (
    <group>
      <gridHelper ref={gridRef} args={[16, 24, ACCENT, '#1a2b33']} position={[0, -0.06, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[20, 14]} />
        <meshBasicMaterial color="#04070c" transparent opacity={0.6} />
      </mesh>
    </group>
  );
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
    sceneState.dcRotY = g.rotation.y;
    sceneState.dcRotX = g.rotation.x;
    sceneState.spin = Math.hypot(drag.velocityX, drag.velocityY);
    sceneState.mouseX = smoothedPointer.x;
    sceneState.mouseY = smoothedPointer.y;
    // Wind angle: meanders slowly, gets pushed by spin direction
    const baseAngle = t * 0.15 + Math.sin(t * 0.07) * 1.2;
    const spinAngle = Math.atan2(drag.velocityY, drag.velocityX);
    const targetAngle = isNaN(spinAngle) || sceneState.spin < 0.001
      ? baseAngle
      : spinAngle;
    const lerpSpeed = 0.02 + sceneState.spin * 0.15;
    let diff = targetAngle - sceneState.windAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    sceneState.windAngle += diff * lerpSpeed;
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
  return (
    <Canvas flat dpr={[1, 1.75]} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} camera={{ position: [7,7,7], fov: 35, near: 0.1, far: 200 }} style={{ width:'100%', height:'100%' }}>
      <Suspense fallback={null}>
        <GrabHandler />
        <CameraRig />
        <ambientLight intensity={0.4} />
        <directionalLight position={[6,9,5]} intensity={1.2} />
        <directionalLight position={[-6,5,-4]} intensity={0.35} color={ACCENT} />
        <SceneLighting />
        <GridFloor />
        <Datacenter />
        <DriftParticles />
        <EffectComposer>
          <Bloom intensity={0.85} luminanceThreshold={0.55} luminanceSmoothing={0.3} mipmapBlur radius={0.7} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
