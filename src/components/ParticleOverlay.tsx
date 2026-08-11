"use client";

import { useEffect, useRef } from "react";
import { sceneState } from "@/lib/sceneState";

const COUNT = 150;
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
  blinkSpeed: number;
  blinkPhase: number;
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
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: 1.0 + Math.random() * 2.5,
        alpha: 0.15 + Math.random() * 0.25,
        blinkSpeed: 0.5 + Math.random() * 2.5,
        blinkPhase: Math.random() * Math.PI * 2,
      });
    }

    window.addEventListener("resize", resize);

    const animate = (t: number) => {
      const dt = Math.min((t - lastT) / 1000, 0.1);
      lastT = t;

      const spin = sceneState.spin;
      const windAngle = sceneState.windAngle;
      const baseWind = 0.35 + spin * 0.8;
      const wx = Math.cos(windAngle) * baseWind;
      const wy = Math.sin(windAngle) * baseWind;

      const cw = window.innerWidth;
      const ch = window.innerHeight;

      // Black background with lighter composite = additive mode
      ctx.globalCompositeOperation = "lighter";
      ctx.clearRect(0, 0, cw, ch);

      for (const p of particles) {
        // Wind + turbulence
        const turb = (Math.random() - 0.5) * (0.04 + spin * 0.12);
        p.vx += (wx - p.vx) * dt * 1.0 + turb;
        p.vy += (wy - p.vy) * dt * 1.0 + (Math.random() - 0.5) * 0.025;

        const speed = Math.hypot(p.vx, p.vy);
        const maxSpeed = 0.5 + spin * 1.2;
        if (speed > maxSpeed) {
          const s = maxSpeed / speed;
          p.vx *= s;
          p.vy *= s;
        }

        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;

        const m = 40;
        if (p.x < -m) p.x = cw + m;
        if (p.x > cw + m) p.x = -m;
        if (p.y < -m) p.y = ch + m;
        if (p.y > ch + m) p.y = -m;

        // Firefly blink — per-particle
        const blink = Math.sin(t * 0.001 * p.blinkSpeed + p.blinkPhase) * 0.35 + 0.65;
        const spinBoost = 1 + spin * 1.5;
        const a = Math.min(p.alpha * blink * spinBoost, 0.7);

        // Glow via radial gradient — additive makes overlapping glow stack
        const outerR = p.size * (2.5 + spin * 2);
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, outerR);
        grad.addColorStop(0, `rgba(${R},${G},${B},${a.toFixed(3)})`);
        grad.addColorStop(0.4, `rgba(${R},${G},${B},${(a * 0.4).toFixed(3)})`);
        grad.addColorStop(1, "rgba(100,255,218,0)");

        ctx.beginPath();
        ctx.arc(p.x, p.y, outerR, 0, Math.PI * 2);
        ctx.fillStyle = grad;
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
