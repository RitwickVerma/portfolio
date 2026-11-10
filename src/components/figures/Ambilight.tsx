"use client";

import { useEffect, useRef, useState } from "react";

// What TizenAmbilight does, in miniature. A frame plays; every tick the edge
// of the frame is cut into zones, each zone's pixels are averaged, and the
// average drives one LED. The film here is three drifting lights drawn on a
// canvas. The sampling is real: the LEDs are computed from the canvas pixels,
// at the 24 frames a second the TV manages.
//
// It is a picture of the idea, not the TV's code: no NV12, no PQ, no tone map.

const FW = 64;
const FH = 36;
const TOP = 16;
const SIDE = 9;
const DEPTH = 6; // how many pixels in from the edge a zone reads
const FPS = 24;

type Rgb = [number, number, number];

function drawFilm(ctx: CanvasRenderingContext2D, t: number) {
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#05070a";
  ctx.fillRect(0, 0, FW, FH);
  ctx.globalCompositeOperation = "lighter";
  const lights: [number, number, number, string][] = [
    [0.5 + 0.42 * Math.sin(t * 0.37), 0.5 + 0.38 * Math.cos(t * 0.29), 30, "255,120,40"],
    [0.5 + 0.45 * Math.cos(t * 0.23 + 1), 0.5 + 0.4 * Math.sin(t * 0.41 + 2), 26, "40,140,255"],
    [0.5 + 0.4 * Math.sin(t * 0.31 + 4), 0.5 + 0.42 * Math.sin(t * 0.19 + 1), 22, "230,60,160"],
  ];
  for (const [cx, cy, r, rgb] of lights) {
    const g = ctx.createRadialGradient(cx * FW, cy * FH, 0, cx * FW, cy * FH, r);
    g.addColorStop(0, `rgba(${rgb},0.95)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FW, FH);
  }
}

/** Mean colour of a rectangle of the frame. */
function zone(data: Uint8ClampedArray, x0: number, y0: number, w: number, h: number): Rgb {
  let r = 0, g = 0, b = 0;
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const i = (y * FW + x) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
  }
  const n = w * h;
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

/** Every zone, in strip order: along the top, then the bottom, then each side. */
function sample(data: Uint8ClampedArray): { top: Rgb[]; bottom: Rgb[]; left: Rgb[]; right: Rgb[] } {
  const zw = FW / TOP;
  const zh = FH / SIDE;
  const top: Rgb[] = [], bottom: Rgb[] = [], left: Rgb[] = [], right: Rgb[] = [];
  for (let i = 0; i < TOP; i++) {
    top.push(zone(data, i * zw, 0, zw, DEPTH));
    bottom.push(zone(data, i * zw, FH - DEPTH, zw, DEPTH));
  }
  for (let i = 0; i < SIDE; i++) {
    left.push(zone(data, 0, i * zh, DEPTH, zh));
    right.push(zone(data, FW - DEPTH, i * zh, DEPTH, zh));
  }
  return { top, bottom, left, right };
}

export default function Ambilight() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(true);
  const [zones, setZones] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !wrap || !ctx) return;
    const leds = [...wrap.querySelectorAll<HTMLElement>("[data-led]")];
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const paint = (t: number) => {
      drawFilm(ctx, t);
      const s = sample(ctx.getImageData(0, 0, FW, FH).data);
      const all = [...s.top, ...s.bottom, ...s.left, ...s.right];
      leds.forEach((el, i) => {
        const [r, g, b] = all[i];
        el.style.backgroundColor = `rgb(${r} ${g} ${b})`;
        el.style.boxShadow = `0 0 18px 6px rgb(${r} ${g} ${b} / 0.55)`;
      });
    };

    paint(7);
    if (!playing || still) return;

    let raf = 0;
    let last = 0;
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(wrap);
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!visible || now - last < 1000 / FPS) return;
      last = now;
      paint(7 + now / 1000);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [playing]);

  const led = "block rounded-[1px]";
  return (
    <figure>
      {/* The wall behind the TV is dark in either theme: the glow needs it. */}
      <div ref={wrapRef} className="relative bg-[#090b0e] rounded-[var(--r-box)] p-7 sm:p-10 overflow-hidden">
        <div className="relative">
          <div className="absolute -top-2.5 inset-x-0 flex gap-1" aria-hidden="true">
            {Array.from({ length: TOP }, (_, i) => <span key={i} data-led className={`${led} flex-1 h-1.5`} />)}
          </div>
          <div className="absolute -bottom-2.5 inset-x-0 flex gap-1" aria-hidden="true">
            {Array.from({ length: TOP }, (_, i) => <span key={i} data-led className={`${led} flex-1 h-1.5`} />)}
          </div>
          <div className="absolute -left-2.5 inset-y-0 flex flex-col gap-1" aria-hidden="true">
            {Array.from({ length: SIDE }, (_, i) => <span key={i} data-led className={`${led} flex-1 w-1.5`} />)}
          </div>
          <div className="absolute -right-2.5 inset-y-0 flex flex-col gap-1" aria-hidden="true">
            {Array.from({ length: SIDE }, (_, i) => <span key={i} data-led className={`${led} flex-1 w-1.5`} />)}
          </div>
          <canvas
            ref={canvasRef}
            width={FW}
            height={FH}
            role="img"
            aria-label="A simulated film frame with a strip of LEDs around it, each LED taking the average colour of the nearest edge of the frame"
            className="relative block w-full aspect-video rounded-[2px] [image-rendering:auto]"
          />
          {zones && (
            <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-x-0 top-0 h-[16.7%] flex">
                {Array.from({ length: TOP }, (_, i) => <span key={i} className="flex-1 border-r border-b border-white/25 first:border-l" />)}
              </div>
              <div className="absolute inset-x-0 bottom-0 h-[16.7%] flex">
                {Array.from({ length: TOP }, (_, i) => <span key={i} className="flex-1 border-r border-t border-white/25 first:border-l" />)}
              </div>
              <div className="absolute inset-y-0 left-0 w-[9.4%] flex flex-col">
                {Array.from({ length: SIDE }, (_, i) => <span key={i} className="flex-1 border-b border-r border-white/25 first:border-t" />)}
              </div>
              <div className="absolute inset-y-0 right-0 w-[9.4%] flex flex-col">
                {Array.from({ length: SIDE }, (_, i) => <span key={i} className="flex-1 border-b border-l border-white/25 first:border-t" />)}
              </div>
            </div>
          )}
        </div>
      </div>
      <figcaption className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-2">
        <span className="fact flex-1 min-w-[16rem]">
          A simulation of the idea: {TOP * 2 + SIDE * 2} LEDs, each the mean colour of one zone of the frame, at {FPS} frames a second. The real one reads the
          TV&apos;s decoded video plane and holds 20 to 25.
        </span>
        <button type="button" className="fact underline decoration-fg/30 underline-offset-4 hover:text-fg" onClick={() => setPlaying((p) => !p)}>
          {playing ? "Pause" : "Play"}
        </button>
        <button type="button" className="fact underline decoration-fg/30 underline-offset-4 hover:text-fg" aria-pressed={zones} onClick={() => setZones((z) => !z)}>
          {zones ? "Hide zones" : "Show zones"}
        </button>
      </figcaption>
    </figure>
  );
}
