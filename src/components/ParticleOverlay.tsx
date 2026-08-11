"use client";

import { useEffect, useRef } from "react";
import { sceneState } from "@/lib/sceneState";

const COUNT = 200;
const R = 100, G = 255, B = 218;

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; alpha: number;
  blinkSpeed: number; blinkPhase: number;
  life: number;
}

export default function ParticleOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const particles: Particle[] = [];
    let animId = 0, lastT = 0;

    const resize = () => {
      const w = window.innerWidth, h = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const w = window.innerWidth, h = window.innerHeight;
    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: Math.random() * 0.2 - 0.4,
        size: 1.0 + Math.random() * 2.5,
        alpha: 0.15 + Math.random() * 0.25,
        blinkSpeed: 0.5 + Math.random() * 2.5,
        blinkPhase: Math.random() * Math.PI * 2,
        life: 2 + Math.random() * 4,
      });
    }

    const animate = (t: number) => {
      const dt = Math.min((t - lastT) / 1000, 0.1);
      lastT = t;

      const spin = sceneState.spin;
      const windAngle = sceneState.windAngle;

      // Wind — matches hero
      const baseWind = 0.35 + spin * 0.8;
      const wx = Math.cos(windAngle) * baseWind;
      const wy = Math.sin(windAngle) * baseWind;

      // Cursor
      const cw = window.innerWidth, ch = window.innerHeight;
      const cx = (sceneState.mouseX - 0.5) * cw;
      const cy = (sceneState.mouseY - 0.5) * ch;

      // Vortex + orbital
      const vortexForce = spin * 2.5;
      const orbX = sceneState.dcRotY * 0.6;
      const orbY = sceneState.dcRotX * 0.6;

      ctx.globalCompositeOperation = "lighter";
      ctx.clearRect(0, 0, cw, ch);

      for (const p of particles) {
        p.life -= dt;
        if (p.life <= 0) {
          p.x = Math.random() * cw;
          p.y = Math.random() * ch;
          p.vx = (Math.random() - 0.5) * 0.3;
          p.vy = Math.random() * 0.2 - 0.4;
          p.life = 2 + Math.random() * 4;
          continue;
        }

        // Cursor pull — same inverse-distance as hero
        const dx = cx - p.x, dy = cy - p.y;
        const dist = Math.hypot(dx, dy) + 0.3;
        const cursorPull = 1.2 / (dist * dist + 0.5);

        // Vortex around center
        const vx = -(p.y - ch / 2) * vortexForce;
        const vy = (p.x - cw / 2) * vortexForce;

        // Forces + turbulence
        const turb = (Math.random() - 0.5) * (0.03 + spin * 0.12);
        p.vx += (wx + dx * cursorPull + vx + orbX) * dt + turb;
        p.vy += (wy + dy * cursorPull + vy + orbY) * dt + (Math.random() - 0.5) * 0.02;

        // Damping — hero uses *= 0.995
        p.vx *= 0.995;
        p.vy *= 0.995;

        // Speed cap
        const speed = Math.hypot(p.vx, p.vy);
        const maxSpeed = 0.5 + spin * 1.2;
        if (speed > maxSpeed) {
          const s = maxSpeed / speed;
          p.vx *= s; p.vy *= s;
        }

        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;

        if (p.x < -40) p.x = cw + 40;
        if (p.x > cw + 40) p.x = -40;
        if (p.y < -40) p.y = ch + 40;
        if (p.y > ch + 40) p.y = -40;

        // Firefly blink — per-particle
        const blink = Math.sin(t * 0.001 * p.blinkSpeed + p.blinkPhase) * 0.35 + 0.65;
        const spinBoost = 1 + spin * 1.5;
        const a = Math.min(p.alpha * blink * spinBoost, 0.7);

        // Glow gradient — additive makes overlaps stack
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
