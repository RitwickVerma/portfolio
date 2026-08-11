"use client";

import { useEffect, useRef } from "react";

const TRAIL_LENGTH = 12;
const DOT_RADIUS = 6;
const GLOW_RADIUS = 24;
const TRAIL_LIFE = 0.6;

interface TrailDot {
  x: number; y: number;
  age: number;
}

export default function CursorGlow() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let mouseX = -100, mouseY = -100;
    let mouseInside = false;
    let animId = 0;
    const trail: TrailDot[] = [];

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      mouseInside = true;
    };
    const onLeave = () => { mouseInside = false; };
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);

    let lastT = performance.now();
    const animate = (t: number) => {
      const dt = Math.min((t - lastT) / 1000, 0.1);
      lastT = t;

      if (mouseInside) {
        trail.push({ x: mouseX, y: mouseY, age: 0 });
      }

      // Age and remove old dots
      for (let i = trail.length - 1; i >= 0; i--) {
        trail[i].age += dt;
        if (trail[i].age > TRAIL_LIFE) trail.splice(i, 1);
      }
      // Keep at most TRAIL_LENGTH
      while (trail.length > TRAIL_LENGTH) trail.shift();

      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      // Draw trail — older = dimmer, smaller
      for (let i = 0; i < trail.length; i++) {
        const d = trail[i];
        const t = d.age / TRAIL_LIFE; // 0 → 1
        const alpha = 0.55 * (1 - t);
        const radius = DOT_RADIUS * (1 - t * 0.5);

        const grad = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, GLOW_RADIUS);
        grad.addColorStop(0, `rgba(100,255,218,${alpha})`);
        grad.addColorStop(0.25, `rgba(100,255,218,${alpha * 0.6})`);
        grad.addColorStop(1, "rgba(100,255,218,0)");

        ctx.beginPath();
        ctx.arc(d.x, d.y, GLOW_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 9999 }}
      aria-hidden
    />
  );
}
