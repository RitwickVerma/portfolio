"use client";
/* eslint-disable react-hooks/refs */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { vertexShader, fragmentShader } from "@/lib/shaders";

function ShaderPlane() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size, viewport } = useThree();
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const scrollRef = useRef(0);
  const sectionRef = useRef(0);

  const uniformsRef = useRef({
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uScroll: { value: 0 },
    uSection: { value: 0 },
    uResolution: { value: new THREE.Vector2(size.width, size.height) },
  });

  useEffect(() => {
    const sections = ["hero", "about", "projects", "homelab", "terminal"];

    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      scrollRef.current = h > 0 ? window.scrollY / h : 0;

      // Determine which section is in view
      const vh = window.innerHeight;
      let currentSection = 0;
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i]);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top < vh * 0.6) {
            currentSection = i;
            break;
          }
        }
      }
      sectionRef.current = currentSection / Math.max(sections.length - 1, 1);
    };

    const onMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX / window.innerWidth;
      mouseRef.current.y = 1.0 - e.clientY / window.innerHeight;
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  useFrame(({ clock }) => {
    // eslint-disable-next-line
    const mat = meshRef.current?.material as THREE.ShaderMaterial | undefined;
    if (!mat) return;
    mat.uniforms.uTime.value = clock.getElapsedTime();
    mat.uniforms.uMouse.value.set(mouseRef.current.x, mouseRef.current.y);
    mat.uniforms.uScroll.value = scrollRef.current;
    mat.uniforms.uSection.value = sectionRef.current;
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
        camera={{ position: [0, 0, 1], near: 0.1, far: 10, zoom: 1 }}
        gl={{ antialias: true, alpha: true }}
        style={{ width: "100%", height: "100%" }}
      >
        <ShaderPlane />
      </Canvas>
    </div>
  );
}
