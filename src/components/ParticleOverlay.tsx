"use client";

import { useEffect, useRef } from "react";

const PARTICLE_COUNT = 80;

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

    let windAngle = 0;
    let windSpeed = 0.3;
    const particles: Particle[] = [];
    let animId = 0;
    let lastT = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = document.documentElement.scrollHeight;
    };
    resize();

    window.addEventListener("resize", resize);
    // Keep height updated as content loads / user scrolls
    const onScroll = () => {
      const h = document.documentElement.scrollHeight;
      if (canvas.height !== h) canvas.height = h;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(() => {
      const h = document.documentElement.scrollHeight;
      if (canvas.height !== h) canvas.height = h;
    });
    ro.observe(document.body);

    // Spawn particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: 0,
        vy: 0,
        size: 0.6 + Math.random() * 1.8,
        alpha: 0.08 + Math.random() * 0.2,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const animate = (t: number) => {
      const dt = Math.min((t - lastT) / 1000, 0.1);
      lastT = t;

      // Evolve wind organically — never a fixed direction
      windAngle +=
        Math.sin(t * 0.0003) * 0.02 + Math.cos(t * 0.0007) * 0.015;
      windSpeed = 0.25 + Math.sin(t * 0.0005) * 0.15;

      const wx = Math.cos(windAngle) * windSpeed;
      const wy = Math.sin(windAngle) * windSpeed;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        // Wind + subtle orbital drift
        p.vx += (wx - p.vx) * 0.02 + Math.sin(t * 0.002 + p.phase) * 0.003;
        p.vy += (wy - p.vy) * 0.02 + Math.cos(t * 0.003 + p.phase) * 0.002;

        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;

        // Wrap around
        if (p.x < -20) p.x = canvas.width + 20;
        if (p.x > canvas.width + 20) p.x = -20;
        if (p.y < -20) p.y = canvas.height + 20;
        if (p.y > canvas.height + 20) p.y = -20;

        // Blink per-particle
        const blink = Math.sin(t * 0.003 + p.phase) * 0.5 + 0.5;
        const a = p.alpha * (0.4 + blink * 0.6);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100,255,218,${a.toFixed(3)})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      ro.disconnect();
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
