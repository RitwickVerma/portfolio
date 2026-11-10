"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Actions, FigureFrame, Presets, QuietAction, Verdict } from "./kit";

// What TizenAmbilight does, in miniature. A frame plays; every tick the edge
// of the frame is cut into zones, each zone's pixels are averaged, and the
// average drives one LED. The film here is three drifting lights drawn on a
// canvas. The sampling is real: the LEDs are computed from the canvas pixels,
// at the 24 frames a second the TV manages.
//
// It is a picture of the idea, not the TV's code: no NV12, no PQ, no tone map.

const FPS = 24;

// Two layouts. The demo (home page) is a sketch: 50 LEDs on a 64 by 36 frame. The note's
// layout is the real strip: 73 zones, 23 along the top, 13 down each side, 24 along the
// bottom, each reading a band 8% of the frame deep.
interface Layout {
  FW: number;
  FH: number;
  TOP: number;
  BOTTOM: number;
  SIDE: number;
  /** Pixels in from the left and right edges that a side zone reads. */
  DX: number;
  /** Pixels in from the top and bottom edges that a top or bottom zone reads. */
  DY: number;
}
const DEMO: Layout = { FW: 64, FH: 36, TOP: 16, BOTTOM: 16, SIDE: 9, DX: 6, DY: 6 };
const TV: Layout = { FW: 192, FH: 108, TOP: 23, BOTTOM: 24, SIDE: 13, DX: 15, DY: 9 };

type Rgb = [number, number, number];

function drawFilm(ctx: CanvasRenderingContext2D, t: number, FW: number, FH: number) {
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
    // The radii were drawn for a 64 pixel frame; scale them to whichever size is in use.
    const rr = (r * FW) / 64;
    const g = ctx.createRadialGradient(cx * FW, cy * FH, 0, cx * FW, cy * FH, rr);
    g.addColorStop(0, `rgba(${rgb},0.95)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FW, FH);
  }
}

/** Mean colour of a rectangle of the frame. */
function zone(data: Uint8ClampedArray, FW: number, x0: number, y0: number, w: number, h: number): Rgb {
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

/**
 * Every zone, in strip order: along the top, then the bottom, then each side. With `whole`, every
 * side zone reads the full height instead of its own segment: the lazy version, where all of an
 * edge's zones are the same average by construction.
 */
function sample(data: Uint8ClampedArray, L: Layout, whole: boolean): { top: Rgb[]; bottom: Rgb[]; left: Rgb[]; right: Rgb[] } {
  const { FW, FH, TOP, BOTTOM, SIDE, DX, DY } = L;
  const top: Rgb[] = [], bottom: Rgb[] = [], left: Rgb[] = [], right: Rgb[] = [];
  const edge = (i: number, n: number, len: number) => [Math.round((i * len) / n), Math.round(((i + 1) * len) / n)];
  for (let i = 0; i < TOP; i++) {
    const [a, b] = edge(i, TOP, FW);
    top.push(zone(data, FW, a, 0, b - a, DY));
  }
  for (let i = 0; i < BOTTOM; i++) {
    const [a, b] = edge(i, BOTTOM, FW);
    bottom.push(zone(data, FW, a, FH - DY, b - a, DY));
  }
  for (let i = 0; i < SIDE; i++) {
    const [a, b] = whole ? [0, FH] : edge(i, SIDE, FH);
    left.push(zone(data, FW, 0, a, DX, b - a));
    right.push(zone(data, FW, FW - DX, a, DX, b - a));
  }
  return { top, bottom, left, right };
}

const REDUCED = "(prefers-reduced-motion: reduce)";
function subscribeReduced(onChange: () => void) {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const SIDES = [
  { id: "whole", label: "One band per side, the lazy way" },
  { id: "own", label: "Each LED its own patch, as built" },
] as const;

/**
 * `note` is the version inside the tizen note: the real 73-zone layout, built from the figure kit,
 * and it does not play until the visitor presses Play. Without it this is the home-page sketch.
 */
export default function Ambilight({ note = false }: { note?: boolean }) {
  const L = note ? TV : DEMO;
  const { FW, FH, TOP, BOTTOM, SIDE, DX, DY } = L;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  // The film plays by itself unless the visitor asked their OS for less motion. Whatever they press
  // afterwards wins, so Play under reduced motion plays: that is the visitor acting.
  const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED).matches, () => false);
  const [choice, setChoice] = useState<"play" | "pause" | null>(null);
  const playing = choice ? choice === "play" : !reduced && !note;
  /** Film time in seconds. Kept across pauses so Pause freezes the frame it is on. */
  const filmTime = useRef(7);
  const [zones, setZones] = useState(true);
  const [sides, setSides] = useState<"whole" | "own">("own");
  /** How many different colours the right-hand edge shows right now. */
  const [distinct, setDistinct] = useState<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !wrap || !ctx) return;
    const leds = [...wrap.querySelectorAll<HTMLElement>("[data-led]")];

    const paint = (t: number) => {
      drawFilm(ctx, t, FW, FH);
      const s = sample(ctx.getImageData(0, 0, FW, FH).data, L, sides === "whole");
      const all = [...s.top, ...s.bottom, ...s.left, ...s.right];
      leds.forEach((el, i) => {
        const [r, g, b] = all[i];
        el.style.backgroundColor = `rgb(${r} ${g} ${b})`;
        el.style.boxShadow = `0 0 18px 6px rgb(${r} ${g} ${b} / 0.55)`;
      });
      if (note) {
        const d = new Set(s.right.map((c) => c.join(","))).size;
        setDistinct((prev) => (prev === d ? prev : d));
      }
    };

    paint(filmTime.current);
    if (!playing) return;

    let raf = 0;
    let last = 0;
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(wrap);
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!visible) {
        last = 0;
        return;
      }
      if (now - last < 1000 / FPS) return;
      // Advance by the time actually played, so the film resumes where it stopped.
      if (last > 0) filmTime.current += (now - last) / 1000;
      last = now;
      paint(filmTime.current);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [playing, sides, note, L, FW, FH]);

  const led = "block rounded-[1px]";
  const gap = note ? "gap-px" : "gap-1";
  const ledT = "h-1.5";
  const ledS = "w-1.5";
  const pctX = (DX / FW) * 100;
  const pctY = (DY / FH) * 100;
  const stage = (
    // The wall behind the TV is dark in either theme: the glow needs it.
    <div ref={wrapRef} className={`relative bg-[#090b0e] rounded-[var(--r-box)] overflow-hidden ${note ? "p-4 sm:p-8" : "p-7 sm:p-10"}`}>
      <div className="relative">
        <div className={`absolute ${note ? "-top-2" : "-top-2.5"} inset-x-0 flex ${gap}`} aria-hidden="true">
          {Array.from({ length: TOP }, (_, i) => <span key={i} data-led className={`${led} flex-1 ${ledT}`} />)}
        </div>
        <div className={`absolute ${note ? "-bottom-2" : "-bottom-2.5"} inset-x-0 flex ${gap}`} aria-hidden="true">
          {Array.from({ length: BOTTOM }, (_, i) => <span key={i} data-led className={`${led} flex-1 ${ledT}`} />)}
        </div>
        <div className={`absolute ${note ? "-left-2" : "-left-2.5"} inset-y-0 flex flex-col ${gap}`} aria-hidden="true">
          {Array.from({ length: SIDE }, (_, i) => <span key={i} data-led className={`${led} flex-1 ${ledS}`} />)}
        </div>
        <div className={`absolute ${note ? "-right-2" : "-right-2.5"} inset-y-0 flex flex-col ${gap}`} aria-hidden="true">
          {Array.from({ length: SIDE }, (_, i) => <span key={i} data-led className={`${led} flex-1 ${ledS}`} />)}
        </div>
        <canvas
          ref={canvasRef}
          width={FW}
          height={FH}
          role="img"
          aria-label={`A simulated film frame with a strip of ${TOP + BOTTOM + SIDE * 2} LEDs around it, each LED taking the average colour of the nearest edge of the frame`}
          className="relative block w-full aspect-video rounded-[2px] [image-rendering:auto]"
        />
        {zones && (
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-x-0 top-0 flex" style={{ height: `${pctY}%` }}>
              {Array.from({ length: TOP }, (_, i) => <span key={i} className="flex-1 border-r border-b border-white/25 first:border-l" />)}
            </div>
            <div className="absolute inset-x-0 bottom-0 flex" style={{ height: `${pctY}%` }}>
              {Array.from({ length: BOTTOM }, (_, i) => <span key={i} className="flex-1 border-r border-t border-white/25 first:border-l" />)}
            </div>
            <div className="absolute inset-y-0 left-0 flex flex-col" style={{ width: `${pctX}%` }}>
              {Array.from({ length: SIDE }, (_, i) => <span key={i} className={`flex-1 border-b border-r border-white/25 first:border-t ${note && sides === "whole" ? "border-b-transparent" : ""}`} />)}
            </div>
            <div className="absolute inset-y-0 right-0 flex flex-col" style={{ width: `${pctX}%` }}>
              {Array.from({ length: SIDE }, (_, i) => <span key={i} className={`flex-1 border-b border-l border-white/25 first:border-t ${note && sides === "whole" ? "border-b-transparent" : ""}`} />)}
            </div>
          </div>
        )}
      </div>
      {note && (
        <p className="mt-5 text-center text-[0.8125rem] leading-snug text-white/70">
          {TOP + BOTTOM + SIDE * 2} LEDs: {TOP} along the top, {SIDE} down each side, {BOTTOM} along the bottom
        </p>
      )}
    </div>
  );

  if (note) {
    const n = SIDE;
    const verdict =
      distinct === null
        ? { tone: "plain" as const, title: "Each LED shows the average of its own patch of the picture's edge." }
        : distinct === 1
          ? { tone: "warn" as const, title: `Right edge: ${n} LEDs, 1 colour. They all average the same band, so ${n - 1} of them add nothing.` }
          : { tone: "ok" as const, title: `Right edge: ${n} LEDs, ${distinct} different colours.` };
    return (
      <FigureFrame
        claim="Each LED shows the average colour of its own patch of the picture's edge."
        how="Press the lazy way and watch the side LEDs turn into copies of each other."
        caption={<>A simulation: three moving lights drawn on a canvas stand in for the film, the averaging is real, and the real app reads the TV&apos;s decoded frame at 20 to 25 frames a second.</>}
        about={
          <>
            <p>
              The strip has {TOP + BOTTOM + SIDE * 2} zones here: {TOP} along the top, {SIDE} down each side, {BOTTOM} along the bottom. Each averages a band {Math.round((DX / FW) * 100)}% of the frame deep, cut from the pixels on the canvas at {FPS} frames a second.
            </p>
            <p>It is a picture of the idea, not the TV&apos;s code: no NV12 plane, no PQ, no tone map, and the film is made up.</p>
          </>
        }
      >
        <Presets label="Try" items={SIDES} active={sides} onPick={setSides} />
        {stage}
        <Verdict tone={verdict.tone} title={verdict.title}>
          {sides === "whole"
            ? "Every side LED reads the full height of the picture, so each edge is one colour repeated."
            : "Each side LED reads only its own segment of the edge, so the edge can change colour from top to bottom."}
        </Verdict>
        <Actions>
          <QuietAction onClick={() => setChoice(playing ? "pause" : "play")}>{playing ? "Pause the film" : "Play the film"}</QuietAction>
          <QuietAction onClick={() => setZones((z) => !z)}>{zones ? "Hide the zone outlines" : "Show the zone outlines"}</QuietAction>
        </Actions>
      </FigureFrame>
    );
  }

  return (
    <figure>
      {stage}
      <figcaption className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-2">
        <span className="fact flex-1 min-w-[16rem]">
          A simulation of the idea: {TOP + BOTTOM + SIDE * 2} LEDs, each the mean colour of one zone of the frame, at {FPS} frames a second. The real one reads the
          TV&apos;s decoded video plane and holds 20 to 25.
        </span>
        <button type="button" className="fact underline decoration-fg/30 underline-offset-4 hover:text-fg max-sm:min-h-11 max-sm:min-w-11 max-sm:px-1" onClick={() => setChoice(playing ? "pause" : "play")}>
          {playing ? "Pause" : "Play"}
        </button>
        <button type="button" className="fact underline decoration-fg/30 underline-offset-4 hover:text-fg max-sm:min-h-11 max-sm:min-w-11 max-sm:px-1" onClick={() => setZones((z) => !z)}>
          {zones ? "Hide zones" : "Show zones"}
        </button>
      </figcaption>
    </figure>
  );
}
