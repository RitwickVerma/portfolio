"use client";

import { useEffect, useRef } from "react";
import { sceneState } from "@/lib/sceneState";

const COUNT = 120;
const R = 100;
const G = 255;
const B = 218;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
  blinkSpeed: number;
}

export default function ParticleOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const particles: Particle[] = [];
    let animId = 0;
    let lastT = 0;

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const p of particles) {
        p.x = Math.random() * w;
        p.y = Math.random() * h;
      }
    };

    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: Math.random() * 0.2 - 0.4,
        size: 1.2 + Math.random() * 2.8,
        alpha: 0.18 + Math.random() * 0.32,
        phase: Math.random() * Math.PI * 2,
        blinkSpeed: 0.5 + Math.random() * 2.5,
      });
    }

    window.addEventListener("resize", resize);

    const animate = (t: number) => {
      const dt = Math.min((t - lastT) / 1000, 0.1);
      lastT = t;

      // Wind from shared sceneState — rotates with drag direction
      const windAngle = sceneState.windAngle;
      const spin = sceneState.spin;
      const baseWind = 0.3 + spin * 0.8;
      const wx = Math.cos(windAngle) * baseWind;
      const wy = Math.sin(windAngle) * baseWind;

      const cw = window.innerWidth;
      const ch = window.innerHeight;

      ctx.clearRect(0, 0, cw, ch);

      for (const p of particles) {
        // Wind following + turbulence amplified by spin
        const turb = (Math.random() - 0.5) * (0.03 + spin * 0.15);
        p.vx += (wx - p.vx) * dt * 1.2 + turb;
        p.vy += (wy - p.vy) * dt * 1.2 + (Math.random() - 0.5) * 0.02;

        // Speed cap
        const speed = Math.hypot(p.vx, p.vy);
        const maxSpeed = 0.6 + spin * 1.5;
        if (speed > maxSpeed) {
          const s = maxSpeed / speed;
          p.vx *= s;
          p.vy *= s;
        }

        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;

        const margin = 40;
        if (p.x < -margin) p.x = cw + margin;
        if (p.x > cw + margin) p.x = -margin;
        if (p.y < -margin) p.y = ch + margin;
        if (p.y > ch + margin) p.y = -margin;

        // Firefly blink — independent per particle
        const blink = Math.sin(t * 0.001 * p.blinkSpeed + p.phase) * 0.35 + 0.65;
        const spinBoost = 1 + spin * 1.5;
        const a = Math.min(p.alpha * blink * spinBoost, 0.85);

        const outerR = p.size * (2.5 + spin * 2);
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, outerR);
        gradient.addColorStop(0, `rgba(${R},${G},${B},${a.toFixed(3)})`);
        gradient.addColorStop(0.35, `rgba(${R},${G},${B},${(a * 0.4).toFixed(3)})`);
        gradient.addColorStop(1, "rgba(100,255,218,0)");

        ctx.beginPath();
        ctx.arc(p.x, p.y, outerR, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
      aria-hidden
    />
  );
}
