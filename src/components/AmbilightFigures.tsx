"use client";

import { useState } from "react";
import { ZONE_SAMPLE, ZONES } from "@/lib/cases";

/* ------------------------------------------------------------------ */
/* Fig. 2 — the pipeline                                               */
/* ------------------------------------------------------------------ */

const STAGES = [
  { k: "Capture", v: "Video plane, 960×540 NV12", n: "native call, in memory" },
  { k: "Zones", v: "73 perimeter averages", n: "in YUV, not RGB" },
  { k: "Colour", v: "Matrix ×73 per frame", n: "BT.2020 + PQ for HDR" },
  { k: "Smooth", v: "EMA · ring blur · fade", n: "no flicker on cuts" },
  { k: "Tone", v: "Black level · gamma", n: "per zone" },
  { k: "Out", v: "UDP → WLED, 75 LEDs", n: "no hub, no hop" },
];

export function PipelineFig() {
  return (
    <ol className="pipe">
      {STAGES.map((s, i) => (
        <li key={s.k} className="pipe-stage" style={{ ["--d" as string]: i * 120 }}>
          <span className="label label-signal">{String(i + 1).padStart(2, "0")} · {s.k}</span>
          <span className="pipe-v">{s.v}</span>
          <span className="pipe-n">{s.n}</span>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* Fig. 3 — the measurement trap (schematic; endpoints measured)       */
/* ------------------------------------------------------------------ */

export function MeasurementTrapFig() {
  // x: 0..100 time, change ships at x=40. y: ms (0..110), inverted.
  const W = 620;
  const H = 250;
  const L = 46;
  const R = 16;
  const T = 16;
  const Bm = 34;
  const x = (t: number) => L + (t / 100) * (W - L - R);
  const y = (ms: number) => T + (1 - ms / 110) * (H - T - Bm);
  const real = `M${x(0)} ${y(98)}L${x(40)} ${y(98)}L${x(42)} ${y(13)}L${x(100)} ${y(13)}`;
  // lifetime mean of the zone stage barely moves (the trap): stays ~11 ms
  const cumul = `M${x(0)} ${y(11.6)}C${x(40)} ${y(11.4)} ${x(60)} ${y(11.0)} ${x(100)} ${y(10.6)}`;
  return (
    <svg className="drawing" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Schematic: the real frame time fell from about 98 to 13 milliseconds when the change shipped, while the app's lifetime-average counter stayed flat near 11 milliseconds.">
      {[0, 25, 50, 75, 100].map((ms) => (
        <g key={ms}>
          <path d={`M${L} ${y(ms)}H${W - R}`} className="leader" />
          <text x={L - 8} y={y(ms) + 3} textAnchor="end" className="t-small">{ms}</text>
        </g>
      ))}
      <text x={L} y={H - 8} className="t-small">time →</text>
      <text x={L - 8} y={T - 4} textAnchor="end" className="t-small">ms</text>
      <path d={`M${x(41)} ${T}V${H - Bm}`} className="stroke thin" style={{ strokeDasharray: "3 3" }} />
      <text x={x(41) + 6} y={T + 10} className="t-small">change ships</text>
      <path d={real} className="path-signal draw" pathLength={1} />
      <path d={cumul} className="stroke draw" pathLength={1} style={{ strokeWidth: 1.6, ["--d" as string]: 300 }} />
      <text x={x(4)} y={y(98) - 10} className="t-label" style={{ fill: "var(--signal-text)" }}>real frame time ~98 ms</text>
      <text x={x(46)} y={y(13) - 30} className="t-label" style={{ fill: "var(--signal-text)" }}>→ ~13 ms after the change</text>
      <text x={x(50)} y={y(11.6) + 20} className="t-label halo">lifetime-mean counter: flat ~11 ms throughout</text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Fig. 4 — zone sampling explorer (measured points only)              */
/* ------------------------------------------------------------------ */

const MAX_FPS = 80;
const GRID = 12;

export function ZoneSampleFig() {
  const [i, setI] = useState(1);
  const cur = ZONE_SAMPLE[i];
  const ERR_MAX = 8;
  return (
    <div className="zs">
      <div className="zs-controls">
        <span className="label">Sample every Nth pixel per axis</span>
        <div className="seg" role="group" aria-label="Zone sampling step">
          {ZONE_SAMPLE.map((z, j) => (
            <button key={z.zs} aria-pressed={i === j} onClick={() => setI(j)}>
              zs = {z.zs}
            </button>
          ))}
        </div>
      </div>

      <div className="zs-body">
        <svg viewBox={`0 0 ${GRID * 14} ${GRID * 14}`} className="zs-grid" role="img" aria-label={`One zone's pixels; every ${cur.zs} pixel per axis is read`}>
          {Array.from({ length: GRID * GRID }, (_, k) => {
            const cx = k % GRID;
            const cy = Math.floor(k / GRID);
            const read = cx % cur.zs === 0 && cy % cur.zs === 0;
            return (
              <rect
                key={k}
                x={cx * 14 + 1.5}
                y={cy * 14 + 1.5}
                width={11}
                height={11}
                style={{
                  fill: read ? "var(--ink)" : "transparent",
                  stroke: read ? "var(--ink)" : "var(--rule)",
                  strokeWidth: 1,
                  transition: "fill .35s",
                }}
              />
            );
          })}
        </svg>

        <dl className="zs-stats">
          <div>
            <dt className="label">Frame rate · measured · bar 0–{MAX_FPS} fps</dt>
            <dd className="spec-value num" aria-live="polite">
              {cur.fps.toFixed(1)} <span className="unit">fps</span>
            </dd>
            <div className="bar-track"><div className="bar-fill signal" style={{ width: `${(cur.fps / MAX_FPS) * 100}%` }} /></div>
          </div>
          <div>
            <dt className="label">Mean colour error vs every pixel · bar 0–{ERR_MAX}</dt>
            <dd className="spec-value num">
              {cur.meanErr === 0 ? "0" : `${cur.zs >= 4 ? "≈" : ""}${cur.meanErr}`}{" "}
              <span className="unit">{cur.meanErr === 0 ? "reference" : "mean error"}</span>
            </dd>
            <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.max((cur.meanErr / ERR_MAX) * 100, 0.5)}%` }} /></div>
          </div>
          <p className="muted" style={{ fontSize: 14 }}>{cur.note}</p>
        </dl>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fig. 5 — designed vs shipped: the side-zone duplication I found     */
/* ------------------------------------------------------------------ */

// An illustrative frame: warm sky top, cool water bottom, a bright object
// on the right. Only the GEOMETRY (zone counts, duplication) is measured.
function frameColour(u: number, v: number) {
  const sky = [255 - v * 120, 150 - v * 60, 70 + v * 40];
  const sea = [30 + u * 40, 90 + u * 50, 150 + u * 60];
  const t = Math.min(Math.max((v - 0.45) * 3, 0), 1);
  let c = sky.map((s, k) => s * (1 - t) + sea[k] * t);
  const d = Math.hypot(u - 0.82, v - 0.38);
  if (d < 0.18) c = c.map((ch) => ch + (1 - d / 0.18) * 90);
  return `rgb(${c.map((ch) => Math.round(Math.min(Math.max(ch, 0), 255))).join(",")})`;
}

export function SideZonesFig() {
  const [shipped, setShipped] = useState(true);
  const W = 520;
  const H = 300;
  const pad = 22;
  const tv = { x: pad + 14, y: pad + 14, w: W - 2 * (pad + 14), h: H - 2 * (pad + 14) };
  const cells: { x: number; y: number; w: number; h: number; c: string }[] = [];
  const t = 9; // strip thickness
  for (let k = 0; k < ZONES.top; k++) {
    const u = (k + 0.5) / ZONES.top;
    cells.push({ x: tv.x + (k * tv.w) / ZONES.top, y: tv.y - t - 4, w: tv.w / ZONES.top - 1.5, h: t, c: frameColour(u, 0.04) });
  }
  for (let k = 0; k < ZONES.bottom; k++) {
    const u = (k + 0.5) / ZONES.bottom;
    cells.push({ x: tv.x + (k * tv.w) / ZONES.bottom, y: tv.y + tv.h + 4, w: tv.w / ZONES.bottom - 1.5, h: t, c: frameColour(u, 0.96) });
  }
  for (const side of ["left", "right"] as const) {
    for (let k = 0; k < ZONES[side]; k++) {
      const v = (k + 0.5) / ZONES[side];
      const u = side === "left" ? 0.03 : 0.97;
      // As shipped, every side zone averaged the same full-height strip; only
      // the corner-adjacent ones differ (the ring blur mixes in top/bottom).
      const vv = shipped && k > 0 && k < ZONES[side] - 1 ? 0.5 : v;
      cells.push({
        x: side === "left" ? tv.x - t - 4 : tv.x + tv.w + 4,
        y: tv.y + (k * tv.h) / ZONES[side],
        w: t,
        h: tv.h / ZONES[side] - 1.5,
        c: frameColour(u, vv),
      });
    }
  }
  return (
    <div>
      <div className="seg" role="group" aria-label="Zone geometry" style={{ marginBottom: 18 }}>
        <button aria-pressed={shipped} onClick={() => setShipped(true)}>As shipped</button>
        <button aria-pressed={!shipped} onClick={() => setShipped(false)}>As designed</button>
      </div>
      <svg className="drawing" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`TV with ${ZONES.top + ZONES.bottom + ZONES.left + ZONES.right} perimeter zones; ${shipped ? "as shipped, 11 zones on each side show the same colour" : "as designed, each side zone has its own colour"}`}>
        <defs>
          <linearGradient id="frame-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgb(250,150,75)" />
            <stop offset="0.45" stopColor="rgb(200,120,95)" />
            <stop offset="0.6" stopColor="rgb(60,120,180)" />
            <stop offset="1" stopColor="rgb(50,110,190)" />
          </linearGradient>
          <radialGradient id="sun-g" cx="0.82" cy="0.38" r="0.2">
            <stop offset="0" stopColor="rgba(255,240,200,.9)" />
            <stop offset="1" stopColor="rgba(255,240,200,0)" />
          </radialGradient>
        </defs>
        <rect x={tv.x} y={tv.y} width={tv.w} height={tv.h} fill="url(#frame-g)" opacity={0.85} />
        <rect x={tv.x} y={tv.y} width={tv.w} height={tv.h} fill="url(#sun-g)" />
        <rect x={tv.x} y={tv.y} width={tv.w} height={tv.h} className="stroke" />
        {cells.map((c, k) => (
          <rect key={k} x={c.x} y={c.y} width={c.w} height={c.h} style={{ fill: c.c, transition: "fill .5s" }} />
        ))}
        {shipped && (
          <>
            <text x={tv.x + 10} y={tv.y + tv.h / 2} className="t-label halo" style={{ fill: "var(--signal-text)", fontWeight: 500 }}>← 11 zones, one colour</text>
            <text x={tv.x + tv.w - 10} y={tv.y + tv.h / 2} textAnchor="end" className="t-label halo" style={{ fill: "var(--signal-text)", fontWeight: 500 }}>11 zones, one colour →</text>
          </>
        )}
        <text x={tv.x} y={H - 6} className="t-small">
          {ZONES.top} top · {ZONES.bottom} bottom · {ZONES.left} + {ZONES.right} sides = 73 zones → 75 LEDs
        </text>
      </svg>
    </div>
  );
}
