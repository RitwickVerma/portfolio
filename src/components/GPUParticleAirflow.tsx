'use client';
/* eslint-disable react-hooks/immutability */

// GPUParticleAirflow — WebGPU-only plume of compute motes rising over the rack
// cluster. Entire lifecycle lives on the GPU:
//   - origin/meta storage buffers are seeded by a one-shot compute pass
//   - a per-frame compute pass ages every mote (deltaTime) and respawns it
//     (age > life → age = 0, wrap back to its anchor)
//   - position is derived in the vertex stage: anchor + rise(lifeT) + wobble +
//     swirl (spin uniform from sceneState.spin) — no CPU particle loop.
// r185 style single-pass per-element read/modify/write (no pingpong needed),
// mirroring the official webgpu_compute_particles_rain example.

import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three/webgpu';
import {
  Fn,
  If,
  clamp,
  cos,
  deltaTime,
  float,
  hash,
  instancedArray,
  instanceIndex,
  max,
  pow,
  sin,
  time,
  uint,
  uniform,
  uv,
  vec2,
  vec3,
} from 'three/tsl';
import { sceneState } from '@/lib/sceneState';
import { pickGpuMoteTier, type GpuMoteTier } from '@/lib/gpu';

// Mote field (world units — rack cluster spans x ∈ [-3.2, 3.35], z ∈ [-1.35, 1.35])
const ANCHOR_X = 3.0; // half-width of anchor strip over the rack area
const ANCHOR_Z = 1.05; // half-depth of anchor strip
const BASE_Y_MIN = 0.9; // motes spawn low, over the rack bodies
const BASE_Y_SPAN = 0.8;
const RISE_HEIGHT = 2.9; // ...and die above the cluster
const LIFE_MIN = 2.5; // life ~= rise time, so age>life ⇔ reached plume top
const LIFE_SPAN = 3.0;

type GpuRendererLike = { compute: (node: unknown) => void };

type FlowApi = {
  spin: { value: number };
  computeInit: unknown;
  computeUpdate: unknown;
  teardown: () => void;
};

const TEAL = vec3(0x64 / 255, 0xff / 255, 0xda / 255); // #64ffda

export default function GPUParticleAirflow() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const [tier, setTier] = useState<GpuMoteTier | null>(null);
  const apiRef = useRef<FlowApi | null>(null);

  // Resolve the mote tier once (adapter limits + pixel ratio).
  useEffect(() => {
    let alive = true;
    void pickGpuMoteTier().then((t) => {
      if (alive) setTier(t);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Build the GPU pipeline once the tier (and thus buffer sizes) is known.
  useEffect(() => {
    if (!tier) return;
    const gpu = gl as unknown as GpuRendererLike;

    // ── Storage buffers (live GPU memory, no CPU mirrors) ────────────────
    // origin: vec3 (anchorX, anchorZ, baseY) — read-mostly, rewrite on spawn
    // meta:   vec4 (age, life, size, phase) — compute-owned lifecycle
    // vel:    vec3 drift written every frame by compute, read at the vertex
    const origin = instancedArray(tier, 'vec3');
    const meta = instancedArray(tier, 'vec4');
    const vel = instancedArray(tier, 'vec3');

    // ── One-shot seeding pass ─────────────────────────────────────────────
    const computeInit = Fn(() => {
      const o = origin.element(instanceIndex);
      const m = meta.element(instanceIndex);
      const r1 = hash(instanceIndex);
      const r2 = hash(instanceIndex.add(uint(101)));
      const r3 = hash(instanceIndex.add(uint(202)));
      const r4 = hash(instanceIndex.add(uint(303)));
      const r5 = hash(instanceIndex.add(uint(404)));
      const r6 = hash(instanceIndex.add(uint(505)));
      const r7 = hash(instanceIndex.add(uint(606)));

      o.x = r1.mul(ANCHOR_X * 2).add(-ANCHOR_X);
      o.y = r2.mul(ANCHOR_Z * 2).add(-ANCHOR_Z);
      o.z = r3.mul(BASE_Y_SPAN).add(BASE_Y_MIN);

      // life first so the initial age spread can be a fraction of it
      m.y = r4.mul(LIFE_SPAN).add(LIFE_MIN);
      m.x = r5.mul(m.y); // scatter ages → plume fully populated on frame 1
      m.z = r6.mul(0.1).add(0.05); // sprite world size 0.05–0.15
      m.w = r7.mul(6.28318); // wobble phase
    })().compute(tier).setName('airflow-init');
    gpu.compute(computeInit);

    // ── Per-frame update: drift vel, age, wrap-respawn in compute ────────
    const spinU = uniform(0);
    const computeUpdate = Fn(() => {
      const m = meta.element(instanceIndex);
      const v = vel.element(instanceIndex);

      // Gentle curl that follows the swirl handedness of the spin direction.
      v.x = sin(time.mul(0.55).add(m.w)).mul(0.03);
      v.z = cos(time.mul(0.4).add(m.w.mul(1.7))).mul(0.03);

      m.x = m.x.add(deltaTime); // age
      If(m.x.greaterThan(m.y), () => {
        // wrap-respawn: back to the anchor, plume already has motion spread
        m.x = float(0);
      });
    })().compute(tier).setName('airflow-update');

    // ── Sprite material: position read from storage, computed per mote ───
    const oAttr = origin.toAttribute();
    const mAttr = meta.toAttribute();
    const vAttr = vel.toAttribute();

    const rise = max(mAttr.x.div(mAttr.y), float(0)).min(float(1));
    const phase = mAttr.w;

    // Wobble grows slightly with altitude.
    const wobX = sin(time.mul(0.9).add(phase)).mul(0.05).mul(rise);
    const wobZ = cos(time.mul(0.75).add(phase.mul(1.6))).mul(0.05).mul(rise);

    // Swirl: rotate the anchor around the plume axis, strength ← sceneState.spin.
    const ang = spinU.mul(rise).mul(1.7);
    const ca = cos(ang);
    const sa = sin(ang);
    const swirlX = oAttr.x.mul(ca).add(oAttr.y.mul(sa));
    const swirlZ = oAttr.y.mul(ca).sub(oAttr.x.mul(sa));

    const material = new THREE.SpriteNodeMaterial();
    material.colorNode = TEAL;
    material.positionNode = vec3(
      swirlX.add(wobX).add(vAttr.x),
      oAttr.z.add(float(RISE_HEIGHT).mul(rise)),
      swirlZ.add(wobZ).add(vAttr.z),
    );
    material.scaleNode = mAttr.z;
    // Soft round sprite + fade in/out near spawn & death.
    const d = vec2(uv().x.sub(0.5), uv().y.sub(0.5)).length().mul(2.0);
    const softDot = pow(clamp(float(1).sub(d), float(0), float(1)), float(2.5));
    const edgeFade = clamp(rise.mul(5.0), float(0), float(1)).mul(
      clamp(float(1).sub(rise).mul(5.0), float(0), float(1)),
    );
    material.opacityNode = softDot.mul(edgeFade).mul(0.9);
    material.transparent = true;
    material.depthWrite = false;
    material.blending = THREE.AdditiveBlending;

    const sprite = new THREE.Sprite(material);
    sprite.count = tier;
    sprite.frustumCulled = false;

    const group = new THREE.Group();
    group.add(sprite);
    scene.add(group);

    apiRef.current = {
      spin: spinU,
      computeInit,
      computeUpdate,
      teardown: () => {
        scene.remove(group);
        material.dispose();
        origin.dispose();
        meta.dispose();
        vel.dispose();
      },
    };
    return () => {
      apiRef.current?.teardown();
      apiRef.current = null;
    };
  }, [tier, gl]);

  // Drive the compute pass ahead of the frame render; push drag spin in.
  useFrame(() => {
    const api = apiRef.current;
    if (!api) return;
    api.spin.value = Math.min(sceneState.spin, 4);
    (gl as unknown as GpuRendererLike).compute(api.computeUpdate);
  });

  return null;
}
