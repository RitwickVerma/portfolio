"use client";

import { useEffect, useRef } from "react";

const TRAIL_POINTS = 24;

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
    let running = false;
    const trail: { x: number; y: number }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (e: PointerEvent) => {
      mouseX = e.clientX; mouseY = e.clientY;
      mouseInside = true;
      ensureRunning();
    };
    const onDown = (e: PointerEvent) => {
      mouseX = e.clientX; mouseY = e.clientY;
      mouseInside = true;
      ensureRunning();
    };
    const onUp = () => { mouseInside = false; };
    const onLeave = () => { mouseInside = false; };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointerleave", onLeave);

    const step = () => {
      if (mouseInside) {
        trail.push({ x: mouseX, y: mouseY });
        if (trail.length > TRAIL_POINTS) trail.shift();
      } else if (trail.length > 0) {
        // Mouse left — decay the tail, one point per frame.
        trail.shift();
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (trail.length >= 2) {
        // Draw smooth trail line — thick at head, thin at tail
        for (let i = 1; i < trail.length; i++) {
          const t = i / trail.length; // 0=old tail, 1=fresh head
          const alpha = t * 0.6;
          const width = 1 + t * 3; // 1px at tail, 4px at head

          ctx.beginPath();
          ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
          ctx.lineTo(trail[i].x, trail[i].y);
          ctx.strokeStyle = `rgba(100,255,218,${alpha})`;
          ctx.lineWidth = width;
          ctx.lineCap = "round";
          ctx.stroke();
        }
      }

      // Bright dot at cursor head
      if (trail.length > 0) {
        const head = trail[trail.length - 1];
        const grad = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 8);
        grad.addColorStop(0, "rgba(100,255,218,0.9)");
        grad.addColorStop(0.5, "rgba(100,255,218,0.3)");
        grad.addColorStop(1, "rgba(100,255,218,0)");
        ctx.beginPath();
        ctx.arc(head.x, head.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Keep animating only while the cursor is active or the trail is decaying.
      // Idle (mouse left AND trail empty) → loop stops, zero rAF cost.
      if (mouseInside || trail.length > 0) {
        animId = requestAnimationFrame(step);
      } else {
        running = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    function ensureRunning() {
      if (!running) {
        running = true;
        animId = requestAnimationFrame(step);
      }
    }

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointerleave", onLeave);
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
