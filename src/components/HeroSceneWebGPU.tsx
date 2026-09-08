'use client';

// WebGPU mirror of HeroScene — same composition, WebGPURenderer + a TSL
// compute airflow layer. `three/webgpu` is imported ONLY here so the bundler
// splits the ~2MB WebGPU build into this dynamic chunk (never the WebGL2 path).

import { Suspense, useEffect, useRef, useState } from 'react';
import type { ComponentProps } from 'react';
import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { Canvas } from '@react-three/fiber';
import {
  GrabHandler,
  CameraRig,
  SceneFog,
  SceneLighting,
  AirflowLayer,
  Datacenter,
  ACCENT,
  initPointer,
} from '@/components/HeroScene';
import GPUParticleAirflow from '@/components/GPUParticleAirflow';
import { capPixelRatio } from '@/lib/gpu';

async function createWebGPURenderer(canvas: HTMLCanvasElement) {
  const renderer = new WebGPURenderer({
    canvas,
    antialias: true,
    forceWebGL: false,
  });
  await renderer.init();
  renderer.setPixelRatio(capPixelRatio());
  renderer.toneMapping = THREE.NoToneMapping;
  console.info('[renderer] webgpu');
  return renderer;
}

export default function HeroSceneWebGPU() {
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
      gl={createWebGPURenderer as unknown as ComponentProps<typeof Canvas>['gl']}
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
        <GPUParticleAirflow />
      </Suspense>
    </Canvas>
    </div>
  );
}
