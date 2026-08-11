"use client";
/* eslint-disable react-hooks/immutability, react-hooks/refs */

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { sceneState } from "@/lib/sceneState";

const COUNT = 200;

/** Round particle texture — built lazily on client, SSR-safe (never caches fallback) */
let _tex: THREE.Texture | null = null;
function getTexture(): THREE.Texture {
  if (_tex) return _tex;
  if (typeof document === "undefined") return new THREE.Texture();
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.08, "rgba(255,255,255,1)");
  g.addColorStop(0.3, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  _tex = new THREE.CanvasTexture(canvas);
  _tex.needsUpdate = true;
  return _tex;
}

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

function Particles() {
  const rand = useMemo(() => mulberry32(0x64ffda), []);

  const geometry = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const sizes = new Float32Array(COUNT);
    const alphas = new Float32Array(COUNT);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute("alpha", new THREE.BufferAttribute(alphas, 1));
    return geo;
  }, []);

  const vel = useMemo(() => new Float32Array(COUNT * 3), []);
  const life = useMemo(() => new Float32Array(COUNT), []);
  const blinkSpeed = useMemo(() => {
    const a = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) a[i] = 0.5 + rand() * 3;
    return a;
  }, [rand]);
  const blinkPhase = useMemo(() => {
    const a = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) a[i] = rand() * Math.PI * 2;
    return a;
  }, [rand]);

  const seeded = useRef(false);
  if (!seeded.current) {
    seeded.current = true;
    const arr = (geometry.getAttribute("position") as THREE.BufferAttribute).array as Float32Array;
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = 0; i < COUNT; i++) {
      const idx = i * 3;
      arr[idx] = (rand() - 0.5) * w;
      arr[idx + 1] = (rand() - 0.5) * h;
      arr[idx + 2] = 0;
      vel[idx] = (rand() - 0.5) * 0.3;
      vel[idx + 1] = rand() * 0.2 - 0.4;
      vel[idx + 2] = 0;
      life[i] = 3 + rand() * 5;
    }
  }

  useFrame((state, delta) => {
    const attr = geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const sizeAttr = geometry.getAttribute("size") as THREE.BufferAttribute;
    const sizeArr = sizeAttr.array as Float32Array;
    const alphaAttr = geometry.getAttribute("alpha") as THREE.BufferAttribute;
    const alphaArr = alphaAttr.array as Float32Array;
    const t = state.clock.getElapsedTime();

    const spin = sceneState.spin;
    const windAngle = sceneState.windAngle;
    const baseWind = 0.35 + spin * 0.8;
    const wx = Math.cos(windAngle) * baseWind;
    const wy = Math.sin(windAngle) * baseWind;

    const cw = window.innerWidth;
    const ch = window.innerHeight;
    const dt = Math.min(delta, 0.1);

    for (let i = 0; i < COUNT; i++) {
      life[i] -= dt;
      if (life[i] <= 0) {
        const idx = i * 3;
        arr[idx] = (rand() - 0.5) * cw;
        arr[idx + 1] = (rand() - 0.5) * ch;
        arr[idx + 2] = 0;
        vel[idx] = (rand() - 0.5) * 0.3;
        vel[idx + 1] = rand() * 0.2 - 0.4;
        vel[idx + 2] = 0;
        life[i] = 3 + rand() * 5;
        continue;
      }

      const idx = i * 3;
      const turb = (rand() - 0.5) * (0.03 + spin * 0.15);
      vel[idx] += (wx - vel[idx]) * dt * 1.0 + turb;
      vel[idx + 1] += (wy - vel[idx + 1]) * dt * 1.0 + (rand() - 0.5) * 0.02;

      const speed = Math.hypot(vel[idx], vel[idx + 1]);
      const maxSpeed = 0.5 + spin * 1.2;
      if (speed > maxSpeed) {
        const s = maxSpeed / speed;
        vel[idx] *= s;
        vel[idx + 1] *= s;
      }

      arr[idx] += vel[idx] * dt * 60;
      arr[idx + 1] += vel[idx + 1] * dt * 60;

      if (arr[idx] < -cw / 2 - 40) arr[idx] = cw / 2 + 40;
      if (arr[idx] > cw / 2 + 40) arr[idx] = -cw / 2 - 40;
      if (arr[idx + 1] < -ch / 2 - 40) arr[idx + 1] = ch / 2 + 40;
      if (arr[idx + 1] > ch / 2 + 40) arr[idx + 1] = -ch / 2 - 40;

      const pulse = Math.sin(t * blinkSpeed[i] + blinkPhase[i]) * 0.5 + 0.5;
      const spinBoost = 1 + spin * 1.5;
      sizeArr[i] = (1.0 + pulse * 1.2) * spinBoost;
      alphaArr[i] = Math.min((0.25 + pulse * 0.25) * spinBoost, 0.85);
    }

    attr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
  });

  const shader = useMemo(
    () => ({
      uniforms: {
        uColor: { value: new THREE.Color("#64ffda") },
        uTexture: { value: getTexture() },
      },
      vertexShader: /* glsl */ `
        attribute float size;
        attribute float alpha;
        varying float vAlpha;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * 3.0;
          gl_Position = projectionMatrix * mvPosition;
          vAlpha = alpha;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform sampler2D uTexture;
        varying float vAlpha;
        void main() {
          vec4 tex = texture2D(uTexture, gl_PointCoord);
          float a = tex.a * clamp(vAlpha, 0.0, 1.0);
          gl_FragColor = vec4(uColor * 1.3, a);
        }
      `,
    }),
    [],
  );

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

export default function FullPageParticles() {
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }}>
      <Canvas
        orthographic
        camera={{ position: [0, 0, 1], near: 0.1, far: 10, zoom: 1 }}
        gl={{ antialias: true, alpha: true }}
        style={{ pointerEvents: "none", width: "100%", height: "100%" }}
      >
        <Particles />
      </Canvas>
    </div>
  );
}
