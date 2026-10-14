"use client";
/* eslint-disable react-hooks/refs */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { vertexShader, fragmentShader } from "@/lib/shaders";
import { usePointer } from "./PointerProvider";

function ShaderPlane() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size, viewport } = useThree();
  const pointer = usePointer();
  const scrollRef = useRef(0);
  const heroRef = useRef(1);

  const uniformsRef = useRef({
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uScroll: { value: 0 },
    uHero: { value: 1 },
    uResolution: { value: new THREE.Vector2(size.width, size.height) },
  });

  // The canvas resizes with the window; the shader's aspect must follow.
  useEffect(() => {
    uniformsRef.current.uResolution.value.set(size.width, size.height);
  }, [size.width, size.height]);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      scrollRef.current = h > 0 ? window.scrollY / h : 0;
      // 1 at the top → 0 after ~one viewport of scroll (the hero's pin window)
      heroRef.current = Math.min(Math.max(1 - window.scrollY / (window.innerHeight * 0.9), 0), 1);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useFrame(({ clock }) => {
    const mat = meshRef.current?.material as THREE.ShaderMaterial | undefined;
    if (!mat) return;
    mat.uniforms.uTime.value = clock.getElapsedTime();
    mat.uniforms.uMouse.value.set(pointer.current.x, pointer.current.y);
    mat.uniforms.uScroll.value = scrollRef.current;
    mat.uniforms.uHero.value = heroRef.current;
  });

  return (
    <mesh ref={meshRef} scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniformsRef.current}
        transparent
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}

export default function ShaderBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      <Canvas
        orthographic
        // A soft full-viewport field: 1x is indistinguishable from 2x and costs
        // a quarter of the fragment work on retina screens. No edges to smooth.
        dpr={1}
        camera={{ position: [0, 0, 1], near: 0.1, far: 10, zoom: 1 }}
        gl={{ antialias: false, alpha: true }}
        style={{ pointerEvents: "none", width: "100%", height: "100%" }}
      >
        <ShaderPlane />
      </Canvas>
    </div>
  );
}
