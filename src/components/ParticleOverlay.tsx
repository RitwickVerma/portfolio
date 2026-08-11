"use client";

import { useEffect, useRef } from "react";

const COUNT = 120;
const ACCENT_R = 100;
const ACCENT_G = 255;
const ACCENT_B = 218;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
}

export default function ParticleOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const particles: Particle[] = [];
    let windAngle = 0;
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
      // Re-spread particles within new bounds
      for (const p of particles) {
        p.x = Math.random() * w;
        p.y = Math.random() * h;
      }
    };

    // Spawn
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
        vx: (Math.random() - 0.5) * 0.5,
        vy: Math.random() * 0.3 - 0.6,
        size: 1.2 + Math.random() * 2.8,
        alpha: 0.18 + Math.random() * 0.32,
        phase: Math.random() * Math.PI * 2,
      });
    }

    window.addEventListener("resize", resize);

    const animate = (t: number) => {
      const dt = Math.min((t - lastT) / 1000, 0.1);
      lastT = t;

      // Wind: slowly rotating direction, subtle speed changes
      windAngle += dt * 0.12;
      const wx = Math.cos(windAngle) * 0.5;
      const wy = Math.sin(windAngle) * 0.15 - 0.25; // slight upward bias

      const cw = window.innerWidth;
      const ch = window.innerHeight;

      ctx.clearRect(0, 0, cw, ch);

      for (const p of particles) {
        // Smooth wind following + gentle turbulence
        p.vx += (wx - p.vx) * dt * 1.2 + (Math.random() - 0.5) * 0.04;
        p.vy += (wy - p.vy) * dt * 1.2 + (Math.random() - 0.5) * 0.03;

        // Dampen
        const speed = Math.hypot(p.vx, p.vy);
        const maxSpeed = 0.8;
        if (speed > maxSpeed) {
          const scale = maxSpeed / speed;
          p.vx *= scale;
          p.vy *= scale;
        }

        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;

        // Wrap viewport
        const margin = 40;
        if (p.x < -margin) p.x = cw + margin;
        if (p.x > cw + margin) p.x = -margin;
        if (p.y < -margin) p.y = ch + margin;
        if (p.y > ch + margin) p.y = -margin;

        // Organic blink — soft, never fully off
        const blink = Math.sin(t * 0.0015 + p.phase) * 0.35 + 0.65;
        const a = p.alpha * blink;

        // Glow: radial gradient
        const outerR = p.size * 3;
        const gradient = ctx.createRadialGradient(
          p.x, p.y, 0,
          p.x, p.y, outerR,
        );
        gradient.addColorStop(0, `rgba(${ACCENT_R},${ACCENT_G},${ACCENT_B},${a.toFixed(3)})`);
        gradient.addColorStop(0.4, `rgba(${ACCENT_R},${ACCENT_G},${ACCENT_B},${(a * 0.5).toFixed(3)})`);
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
