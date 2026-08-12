"use client";

import { useEffect, useRef } from "react";

export default function CursorGlow() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -100, y: -100 });
  const dotsRef = useRef<{ x: number; y: number; a: number }[]>([]);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = trailRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dots = dotsRef.current;

    const animate = () => {
      const { x, y } = mouseRef.current;
      dots.push({ x, y, a: 1 });
      if (dots.length > 18) dots.shift();

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        d.a *= 0.88;
        const s = 2 + (d.a * 2);
        ctx.beginPath();
        ctx.arc(d.x, d.y, s, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100,255,218,${d.a * 0.4})`;
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${e.clientX}px,${e.clientY}px,0)`;
      }
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("resize", resize);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <>
      <canvas ref={trailRef} className="fixed inset-0 pointer-events-none z-[9998]" aria-hidden />
      <div
        ref={cursorRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999] w-3 h-3 -ml-1.5 -mt-1.5 rounded-full sm:block"
        style={{
          background: "radial-gradient(circle, rgba(100,255,218,0.8) 0%, transparent 70%)",
          boxShadow: "0 0 16px rgba(100,255,218,0.3)",
          transition: "transform 0.06s ease-out",
        }}
        aria-hidden
      />
    </>
  );
}
