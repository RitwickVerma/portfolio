"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { bestReach, reachBox, reachReport, type MonitorReach, type Rect } from "@/lib/frameAuthority";
import {
  ACTORS,
  GAP_MS,
  MONITOR,
  GONE_MONITOR,
  PRESETS,
  initialFigure,
  monitorsFor,
  play,
  presetScene,
  ruleSentence,
  type Actor,
  type Gap,
  type Played,
  type Scene,
} from "@/lib/kwinFigure";
import { Actions, FigureFrame, Fold, Presets, QuietAction, Segmented, Verdict } from "./kit";

// The decision kwin-canvas makes when a window it parked moves and the move
// was not its own: put it back, or take the new place as the window's own.
// The window is yours to place; the button plays the part of whatever moves
// it. The verdict comes from frameAuthority.ts, a port of the effect's own
// functions, and every number in the six checks is one that code compared.
//
// The labels on the drawing are HTML laid over the SVG by percentage, so they
// are real CSS pixels at any width and the server HTML already has them.
// On touch a vertical swipe still scrolls the page (touch-action: pan-y), so
// the window is also placed with the arrow keys or the two number fields.

// Left of BREAK the drawing is to scale. Right of it, distances are squeezed to a fifth so a window parked
// thousands of pixels away still fits at a size the screen can be read at; every number is the real one.
const BREAK = 2300;
const SQUEEZE = 0.2;
const mx = (x: number) => (x <= BREAK ? x : BREAK + (x - BREAK) * SQUEEZE);
const unmx = (x: number) => (x <= BREAK ? x : BREAK + (x - BREAK) / SQUEEZE);
const VB = { x: -600, y: -800, w: 4100, h: 2750 };
const LIMIT = { x0: -500, x1: 4300, y0: -300, y1: 1100 };
// The squeeze line is drawn only above the screen's own height; below it a tint says the same, so a label can sit beside a window over there.
const BREAK_TOP = -450;
const BREAK_BOTTOM = 1930;
const BREAK_STUBS: [number, number][] = [[BREAK_TOP, -80]];
const STEP = 20;
const BIG_STEP = 200;

/** The four cases worth a first tap; all eight are under "All test cases". */
const FIRST_IDS = ["pull-far", "on-screen", "resize", "insists"] as const;
const FIRST = FIRST_IDS.map((id) => PRESETS.find((p) => p.id === id)!);

interface State {
  scene: Scene;
  /** The last move played, or null once the window, the actor or the monitors changed since. */
  played: Played | null;
  preset: string | null;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const signed = (n: number) => (n > 0 ? `+${fmt(n)}` : fmt(n));
const at = (r: Rect) => `${fmt(r.x)}, ${fmt(r.y)}`;

const BUTTON: Record<Actor, string> = {
  kwin: "Let KWin move it",
  script: "Let the script move it",
  resize: "Let its app resize it",
  snap: "Let the desktop snap it",
};
const MOVES: Record<Actor, string> = {
  kwin: "KWin moves it",
  script: "A script moves it",
  resize: "Its app resizes it",
  snap: "The desktop snaps it",
};
const GHOST: Record<Actor, string> = {
  kwin: "KWin moved it to",
  script: "A script moved it to",
  resize: "Its app resized it at",
  snap: "Snapped to",
};

/** A triangle halfway along the move, pointing the way it went; halfway so it never hides on a box. */
function arrowHead(from: Rect, to: Rect): string {
  const fx = from.x + from.width / 2;
  const fy = from.y + from.height / 2;
  const dx = to.x + to.width / 2 - fx;
  const dy = to.y + to.height / 2 - fy;
  const cx = fx + dx * 0.55;
  const cy = fy + dy * 0.55;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const L = Math.min(240, len * 0.28);
  const W = L / 2;
  return `${cx},${cy} ${cx - ux * L - uy * W},${cy - uy * L + ux * W} ${cx - ux * L + uy * W},${cy - uy * L - ux * W}`;
}

/** The box around a polygon given as "x,y x,y ...". */
function pointsBox(points: string): Box {
  const xy = points.split(" ").map((p) => p.split(",").map(Number));
  return { x0: Math.min(...xy.map((p) => p[0])), y0: Math.min(...xy.map((p) => p[1])), x1: Math.max(...xy.map((p) => p[0])), y1: Math.max(...xy.map((p) => p[1])) };
}

// ---- Labels -------------------------------------------------------------
// A label is HTML laid over the SVG, so it is real CSS pixels at any width. Each
// one is put beside the shape it names: the first of its candidate places (right,
// left, below, above, then further out) that crosses no line of the drawing, no
// other shape and no other label. Sizes are estimated for a phone-width drawing,
// so on a wide screen the labels only get more room than the check assumed.

type Box = { x0: number; y0: number; x1: number; y1: number };
type Seg = [number, number, number, number];
interface Spec {
  /** The lines of the label; the first is the strong one. */
  lines: string[];
}
interface Placed {
  box: Box;
  /** The width in px the text wraps to. */
  maxPx: number;
  /** Anchor point and which corner of the label sits on it, 0 to 1 on each axis. */
  x: number;
  y: number;
  ax: number;
  ay: number;
}

/** The drawing's width in px before it is measured: a phone. */
const DRAWN_DEFAULT = 320;
const CHAR_PX = 6.6;
const LABEL_MAX_PX = 112;
const LINE_PX = 16;

/** Widths a label may wrap to, widest first: a narrower one is taller but fits a tighter gap. */
const LABEL_WIDTHS = [LABEL_MAX_PX, 88, 68, 56];

function sizeOf(spec: Spec, maxPx: number, ppu: number): { w: number; h: number } {
  const text = maxPx - 8;
  const longest = Math.max(...spec.lines.map((l) => l.length * CHAR_PX));
  const rows = spec.lines.reduce((n, l) => n + Math.max(1, Math.ceil((l.length * CHAR_PX) / text)), 0);
  return { w: Math.min(maxPx, longest + 8) / ppu, h: (rows * LINE_PX + 2) / ppu };
}

function rectEdges(r: Rect): Seg[] {
  return [
    [r.x, r.y, r.x + r.width, r.y],
    [r.x, r.y + r.height, r.x + r.width, r.y + r.height],
    [r.x, r.y, r.x, r.y + r.height],
    [r.x + r.width, r.y, r.x + r.width, r.y + r.height],
  ];
}
const boxOf = (r: Rect): Box => ({ x0: r.x, y0: r.y, x1: r.x + r.width, y1: r.y + r.height });
const overlap = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
const inside = (b: Box) => b.x0 >= VB.x + 20 && b.y0 >= VB.y + 20 && b.x1 <= VB.x + VB.w - 20 && b.y1 <= VB.y + VB.h - 20;
/** Whether a segment passes through a box (Liang-Barsky). */
function hits(sg: Seg, b: Box): boolean {
  const [x0, y0, x1, y1] = sg;
  const dx = x1 - x0;
  const dy = y1 - y0;
  let t0 = 0;
  let t1 = 1;
  for (const [p, q] of [
    [-dx, x0 - b.x0],
    [dx, b.x1 - x0],
    [-dy, y0 - b.y0],
    [dy, b.y1 - y0],
  ]) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const r = q / p;
      if (p < 0) t0 = Math.max(t0, r);
      else t1 = Math.min(t1, r);
      if (t0 > t1) return false;
    }
  }
  return true;
}

/** Candidate places for a label of size w by h beside a shape, nearest and most natural first. */
function candidates(r: Box, spec: Spec, ppu: number): Placed[] {
  const out: Placed[] = [];
  const gap = 5 / ppu;
  const midY = (r.y0 + r.y1) / 2;
  const midX = (r.x0 + r.x1) / 2;
  for (const ring of [1, 3, 6]) {
   for (const maxPx of LABEL_WIDTHS) {
    const { w, h } = sizeOf(spec, maxPx, ppu);
    const g = gap * ring;
    for (const dy of [0, -h / 2, h / 2, -h, h]) {
      out.push({ maxPx, x: r.x1 + g, y: midY + dy, ax: 0, ay: 0.5, box: { x0: r.x1 + g, x1: r.x1 + g + w, y0: midY + dy - h / 2, y1: midY + dy + h / 2 } });
      out.push({ maxPx, x: r.x0 - g, y: midY + dy, ax: 1, ay: 0.5, box: { x0: r.x0 - g - w, x1: r.x0 - g, y0: midY + dy - h / 2, y1: midY + dy + h / 2 } });
    }
    // Below and above: slide along the shape until the label is clear of every line.
    const xs: number[] = [];
    for (let x0 = r.x0 - w + 150; x0 <= r.x1 - 150; x0 += 50) xs.push(x0);
    // Flush with either end of the drawing, for a shape squeezed against it.
    for (const x0 of [VB.x + VB.w - 20 - w, VB.x + 20]) if (x0 < r.x1 - 150 && x0 + w > r.x0 + 150) xs.push(x0);
    xs.sort((a, b) => Math.abs(a + w / 2 - midX) - Math.abs(b + w / 2 - midX));
    for (const x0 of xs) {
      out.push({ maxPx, x: x0, y: r.y1 + g, ax: 0, ay: 0, box: { x0, x1: x0 + w, y0: r.y1 + g, y1: r.y1 + g + h } });
      out.push({ maxPx, x: x0, y: r.y0 - g, ax: 0, ay: 1, box: { x0, x1: x0 + w, y0: r.y0 - g - h, y1: r.y0 - g } });
    }
   }
  }
  return out;
}

/** The first candidate that is clear, or the first one when none is. */
function settle(owner: Box, spec: Spec, ppu: number, lines: Seg[], solids: Box[], taken: Box[]): Placed {
  const all = candidates(owner, spec, ppu);
  return pick(all, lines, solids, taken);
}

/** A row of places along a band above or below the drawing, starting at one end and stepping away from it. */
function along(spec: Spec, ppu: number, from: number, dir: 1 | -1, y: number, ay: 0 | 1): Placed[] {
  return Array.from({ length: 30 }, (_, i) => LABEL_WIDTHS.map((maxPx) => fixed(from + dir * i * 150, y, dir === 1 ? 0 : 1, ay, spec, ppu, maxPx))).flat();
}

/** How badly a place breaks the rules: 0 is clear. */
function faults(c: Placed, lines: Seg[], solids: Box[], taken: Box[]): number {
  const b = { x0: c.box.x0 - 15, x1: c.box.x1 + 15, y0: c.box.y0 - 15, y1: c.box.y1 + 15 };
  return (inside(c.box) ? 0 : 8) + 4 * lines.filter((l) => hits(l, b)).length + 3 * solids.filter((o) => overlap(o, b)).length + 3 * taken.filter((o) => overlap(o, b)).length;
}

/** The first of some places that is clear; when none is, the least bad. */
function pick(all: Placed[], lines: Seg[], solids: Box[], taken: Box[]): Placed {
  let best = all[0];
  let worst = Infinity;
  for (const c of all) {
    const f = faults(c, lines, solids, taken);
    if (f === 0) return c;
    if (f < worst) {
      worst = f;
      best = c;
    }
  }
  return best;
}

/** A label laid over the drawing at a placed anchor. */
function PlacedLabel({ at: p, spec, strong }: { at: Placed; spec: Spec; strong?: boolean }) {
  const style: CSSProperties = {
    left: `${((p.x - VB.x) / VB.w) * 100}%`,
    top: `${((p.y - VB.y) / VB.h) * 100}%`,
    transform: `translate(${-p.ax * 100}%, ${-p.ay * 100}%)`,
    maxWidth: p.maxPx,
  };
  return (
    <span
      aria-hidden="true"
      style={style}
      className={`pointer-events-none absolute w-max rounded-[2px] bg-background/90 px-1 text-xs sm:text-[0.8125rem] leading-tight text-fg ${p.ax === 1 ? "text-right" : p.ax === 0.5 ? "text-center" : "text-left"}`}
    >
      {spec.lines.map((l, i) => (
        <span key={i} className={`block ${i === 0 && strong ? "font-semibold" : i > 0 ? "text-fg/75" : ""}`}>
          {l}
        </span>
      ))}
    </span>
  );
}

/** A label at a fixed anchor beside what it names (the screen, the dotted box, the squeeze line). */
function fixed(x: number, y: number, ax: 0 | 1, ay: 0 | 1, spec: Spec, ppu: number, maxPx = LABEL_MAX_PX): Placed {
  const { w, h } = sizeOf(spec, maxPx, ppu);
  const x0 = ax === 0 ? x : x - w;
  const y0 = ay === 0 ? y : y - h;
  return { maxPx, x, y, ax, ay, box: { x0, x1: x0 + w, y0, y1: y0 + h } };
}

/** What one monitor's check compared, in the figure's words. */
function reachNumbers(report: MonitorReach[]): string {
  const m = bestReach(report);
  if (!m) return "no monitor";
  const over = m.across >= 0 ? `${fmt(m.across)} px over it` : `${fmt(-m.across)} px clear of it`;
  return `${over}, ${fmt(m.need)} needed; top ${fmt(m.top)}, allowed ${fmt(m.topMin)} to ${fmt(m.topMax)}`;
}

interface Row {
  q: string;
  numbers: string;
  /** "yes" or "no", or null when the classifier never got to this check. */
  answer: "yes" | "no" | null;
}

/** The checks in the order the classifier makes them, with the one that decided. */
function rowsOf(p: Played): { rows: Row[]; decided: number } {
  const r = p.result;
  const t = r.trace;
  const decided = { "size-changed": 0, "not-moved": 1, "was-in-reach": 2, "was-in-reach-before": 3, "lands-out-of-reach": 4, pull: 5, insists: 5 }[r.rule];
  const answers: ("yes" | "no")[] = [
    Math.abs(t.dw) > 1 || Math.abs(t.dh) > 1 ? "yes" : "no",
    Math.abs(t.dx) < 1 && Math.abs(t.dy) < 1 ? "no" : "yes",
    t.wasNow.some((m) => m.ok) ? "yes" : "no",
    t.wasBefore.some((m) => m.ok) ? "yes" : "no",
    t.nowNow.some((m) => m.ok) ? "yes" : "no",
    r.fight && !r.fight.allow ? "yes" : "no",
  ];
  const f = r.fight;
  const rows: Row[] = [
    { q: "Did the size change?", numbers: `width ${signed(t.dw)}, height ${signed(t.dh)}; over 1 px is a resize`, answer: null },
    { q: "Did it move?", numbers: `x ${signed(t.dx)}, y ${signed(t.dy)}; a pixel or more counts`, answer: null },
    { q: "Was it in reach?", numbers: reachNumbers(t.wasNow), answer: null },
    { q: "Was it in reach before the layout change?", numbers: p.gone ? reachNumbers(t.wasBefore) : "the monitors have not changed", answer: null },
    { q: "Does it land in reach?", numbers: reachNumbers(t.nowNow), answer: null },
    {
      q: "Is it the third revert in a row?",
      numbers: f
        ? `${f.before ? f.before.n : 0} before it${f.sinceLast === null ? "" : `, the last ${f.sinceLast} ms ago`}; a chain continues within ${f.limit} ms`
        : "not asked: only a pull reaches this check",
      answer: null,
    },
  ];
  return { rows: rows.map((row, i) => (i <= decided ? { ...row, answer: answers[i] } : row)), decided };
}

/** The call in one plain sentence; the rule behind it is the verdict's body. */
function titleOf(p: Played): string {
  switch (p.result.rule) {
    case "pull":
      return "The canvas puts it back: this move has the shape of KWin's rule";
    case "insists":
      return "The canvas keeps it: the window insists, so it stops fighting";
    case "size-changed":
      return "The canvas keeps it: an app resized the window";
    case "not-moved":
      return "The canvas keeps it: the window hardly moved";
    case "was-in-reach":
      return "The canvas keeps it: the window moved itself";
    case "was-in-reach-before":
      return "The canvas keeps it: KWin was rescuing a window from a screen that went away";
    case "lands-out-of-reach":
      return "The canvas keeps it: this is not KWin's rule";
  }
}

export default function FrameAuthority() {
  const [state, setState] = useState<State>(() => {
    const f = initialFigure();
    return { scene: f.scene, played: f.played, preset: f.preset };
  });
  const [focused, setFocused] = useState(false);
  const [drawn, setDrawn] = useState(DRAWN_DEFAULT);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: number; dx: number; dy: number } | null>(null);
  const hintId = useId();

  // Labels are placed for the width the drawing really has; until it is measured, a phone's.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const read = () => setDrawn(Math.max(200, Math.floor(svg.getBoundingClientRect().width / 8) * 8));
    read();
    const ro = new ResizeObserver(read);
    ro.observe(svg);
    return () => ro.disconnect();
  }, []);
  const ppu = drawn / VB.w;

  const { scene, played, preset } = state;
  const { frame } = scene;
  const { now: monitors } = monitorsFor(scene.gone);
  const chosen = PRESETS.find((p) => p.id === preset);

  const place = (x: number, y: number) =>
    setState((s) => ({
      ...s,
      scene: { ...s.scene, frame: { ...s.scene.frame, x: clamp(Math.round(x), LIMIT.x0, LIMIT.x1), y: clamp(Math.round(y), LIMIT.y0, LIMIT.y1) } },
      played: null,
      preset: null,
    }));
  const change = (patch: Partial<Scene>) => setState((s) => ({ ...s, scene: { ...s.scene, ...patch }, played: null }));
  const move = () =>
    setState((s) => {
      const r = play(s.scene);
      return { ...s, scene: r.scene, played: r.played };
    });
  const choose = (id: string) => {
    const p = PRESETS.find((q) => q.id === id)!;
    // A preset is a whole scene, its timing included: "A window that insists" needs the quick gap,
    // and keeping a slower one chosen earlier made its own hint untrue.
    const r = play(presetScene(p));
    setState({ scene: r.scene, played: r.played, preset: id });
  };

  const world = (e: PointerEvent) => {
    const box = svgRef.current!.getBoundingClientRect();
    return { x: unmx(VB.x + ((e.clientX - box.left) / box.width) * VB.w), y: VB.y + ((e.clientY - box.top) / box.height) * VB.h };
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const k = e.shiftKey ? BIG_STEP : STEP;
    const d: Record<string, [number, number]> = { ArrowLeft: [-k, 0], ArrowRight: [k, 0], ArrowUp: [0, -k], ArrowDown: [0, k] };
    const m = d[e.key];
    if (!m) return;
    e.preventDefault();
    place(frame.x + m[0], frame.y + m[1]);
  };

  const zone = reachBox(frame, MONITOR);
  const fx = mx(frame.x);
  // A target at least 44 px across on screen whatever the window's size: at 390 px one screen pixel is about 16 world units.
  const hit = { w: Math.max(frame.width, 600), h: Math.max(frame.height, 600) };
  const verdict = played ? played.result.verdict : null;
  const detail = played ? rowsOf(played) : null;
  const here = bestReach(reachReport(frame, monitors));
  // The solid block is where the canvas leaves the window; the other place is drawn as a dashed ghost.
  const ghost = played ? (verdict === "revert" ? played.now : played.was) : null;
  const farSide = frame.x > BREAK || (!!ghost && ghost.x > BREAK);

  // Where each label goes: beside its shape, clear of every line and of the other labels.
  const winRect: Rect = { x: fx, y: frame.y, width: frame.width, height: frame.height };
  const ghostRect: Rect | null = ghost ? { x: mx(ghost.x), y: ghost.y, width: ghost.width, height: ghost.height } : null;
  const goneRect: Rect = { x: GONE_MONITOR.x, y: GONE_MONITOR.y, width: mx(GONE_MONITOR.x + GONE_MONITOR.width) - GONE_MONITOR.x, height: GONE_MONITOR.height };
  const arrow = played && ghost ? arrowHead({ ...played.was, x: mx(played.was.x) }, { ...played.now, x: mx(played.now.x) }) : null;
  const lines: Seg[] = [...rectEdges(MONITOR), ...rectEdges(zone), ...(scene.gone ? rectEdges(goneRect) : []), ...(farSide ? BREAK_STUBS.map(([y0, y1]): Seg => [BREAK, y0, BREAK, y1]) : [])];
  if (played && ghost) lines.push([mx(played.was.x) + played.was.width / 2, played.was.y + played.was.height / 2, mx(played.now.x) + played.now.width / 2, played.now.y + played.now.height / 2]);
  const solids: Box[] = [boxOf(winRect), { x0: fx - 160, y0: frame.y - 160, x1: fx + 160, y1: frame.y + 160 }];
  if (ghostRect) solids.push(boxOf(ghostRect));
  if (arrow) solids.push(pointsBox(arrow));

  const SPEC = {
    screen: { lines: ["Screen"] },
    zone: { lines: ["Dotted box: safe for the dot"] },
    squeeze: { lines: ["Squeezed beyond this line"] },
    gone: { lines: ["Unplugged"] },
  } satisfies Record<string, Spec>;
  const squeezeAt = farSide ? fixed(BREAK - 40, VB.y + 20, 1, 0, SPEC.squeeze, ppu) : null;
  const taken: Box[] = squeezeAt ? [squeezeAt.box] : [];
  const winSpec: Spec = { lines: [played && ghost ? `Window ${verdict === "revert" ? "put back at" : "kept at"} ${at(frame)}` : `Window at ${at(frame)}`] };
  const winAt = settle(boxOf(winRect), winSpec, ppu, lines, solids, taken);
  taken.push(winAt.box);
  const ghostSpec: Spec | null = played && ghost ? { lines: [verdict === "revert" ? `${GHOST[played.actor]} ${at(ghost)}` : `Was at ${at(ghost)}`] } : null;
  const ghostAt = ghostSpec && ghostRect ? settle(boxOf(ghostRect), ghostSpec, ppu, lines, solids, taken) : null;
  if (ghostAt) taken.push(ghostAt.box);
  // The fixed furniture of the drawing takes what is left: its usual corner first, then the others.
  const above = MONITOR.y - 60;
  const below = MONITOR.y + MONITOR.height + 60;
  const screenAt = pick([...along(SPEC.screen, ppu, MONITOR.x + MONITOR.width, -1, above, 1), ...along(SPEC.screen, ppu, MONITOR.x + MONITOR.width, -1, below, 0), fixed(MONITOR.x + MONITOR.width - 60, 60, 1, 0, SPEC.screen, ppu), fixed(MONITOR.x + 60, 60, 0, 0, SPEC.screen, ppu)], lines, solids, taken);
  taken.push(screenAt.box);
  const goneAt = scene.gone ? settle(boxOf(goneRect), SPEC.gone, ppu, lines, solids, taken) : null;
  if (goneAt) taken.push(goneAt.box);
  const zoneAt = pick([...along(SPEC.zone, ppu, zone.x, 1, above, 1), ...along(SPEC.zone, ppu, zone.x, 1, below, 0), ...LABEL_WIDTHS.flatMap((w) => [fixed(60, zone.y + zone.height - 60, 0, 1, SPEC.zone, ppu, w), fixed(zone.x + zone.width - 60, zone.y + zone.height - 60, 1, 1, SPEC.zone, ppu, w)])], lines, solids, taken);

  return (
    <FigureFrame
      claim="The canvas undoes KWin's pulls and keeps every other window move."
      how="kwin-canvas parks windows far off-screen on an infinite canvas, and KWin, the desktop's window manager, drags them back. The first case below is already played: tap another, or drag the window sideways and press the button."
      caption="KWin is not running here: its rule is a stand-in written from my measurements for one 1920 by 1080 screen, while the decision is a port of the project's own code."
      about={
        <>
          <p>
            The verdict comes from a TypeScript port of kwin-canvas&apos;s own functions (<span className="font-mono text-xs">inReach</span>, <span className="font-mono text-xs">isPull</span> and{" "}
            <span className="font-mono text-xs">fightStep</span>, in the order its classifier calls them), and each number in the six checks is one they compared.
          </p>
          <p>
            KWin&apos;s rule here is a stand-in written from my measurements in a nested KWin, for one 1920 by 1080 monitor; which monitor it picks when there are two was not measured. The effect also asks the scene about a hand on
            the window, a maximized or fullscreen window and the FollowActivation setting; those are left out. The times are the figure&apos;s own clock, not a real one.
          </p>
        </>
      }
    >
      <Presets label="Try" items={FIRST} active={preset as (typeof FIRST_IDS)[number] | null} onPick={choose} />

      <div>
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
          role="group"
          aria-label="A canvas of screens with one window on it. Solid block: the window as the canvas holds it. Dashed outline: the other place it was, before or after the move."
          className="block w-full h-auto touch-pan-y select-none"
        >
          {/* The screen, and the box the reach rule leaves for a window's top-left corner. */}
          <rect x={MONITOR.x} y={MONITOR.y} width={MONITOR.width} height={MONITOR.height} fill="var(--surface)" stroke="var(--fg)" strokeWidth={3} vectorEffect="non-scaling-stroke" />
          {scene.gone && (
            <rect x={GONE_MONITOR.x} y={GONE_MONITOR.y} width={mx(GONE_MONITOR.x + GONE_MONITOR.width) - GONE_MONITOR.x} height={GONE_MONITOR.height} fill="none" stroke="var(--fg)" strokeOpacity={0.6} strokeWidth={2} strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />
          )}
          <rect x={zone.x} y={zone.y} width={zone.width} height={zone.height} fill="var(--fg)" fillOpacity={0.08} stroke="var(--fg)" strokeOpacity={0.7} strokeWidth={2} strokeDasharray="2 4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />

          {/* Where the drawing turns from to scale to squeezed: a tint beyond the line, and the line as a stub above the screen. */}
          {farSide && (
            <g aria-hidden="true">
              <rect x={BREAK} y={BREAK_TOP} width={VB.x + VB.w - BREAK} height={BREAK_BOTTOM - BREAK_TOP} fill="var(--fg)" fillOpacity={0.05} />
              {BREAK_STUBS.map(([y0, y1]) => (
                <line key={y0} x1={BREAK} y1={y0} x2={BREAK} y2={y1} stroke="var(--fg)" strokeOpacity={0.6} strokeWidth={2} strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
              ))}
            </g>
          )}

          {/* The other place the window was, and the line between the two. */}
          {played && ghost && (
            <g aria-hidden="true">
              <line x1={mx(played.was.x) + played.was.width / 2} y1={played.was.y + played.was.height / 2} x2={mx(played.now.x) + played.now.width / 2} y2={played.now.y + played.now.height / 2} stroke="var(--fg)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
              <polygon points={arrowHead({ ...played.was, x: mx(played.was.x) }, { ...played.now, x: mx(played.now.x) })} fill="var(--fg)" />
              <rect x={mx(ghost.x)} y={ghost.y} width={ghost.width} height={ghost.height} fill="var(--fg)" fillOpacity={0.14} stroke="var(--fg)" strokeWidth={2.5} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
            </g>
          )}

          {/* The window, as the canvas holds it. Drag it, or focus it and use the arrow keys. */}
          <g
            tabIndex={0}
            role="group"
            aria-roledescription="movable window"
            aria-label={`Window at ${frame.x}, ${frame.y}, ${frame.width} by ${frame.height}`}
            aria-describedby={hintId}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              const w = world(e);
              drag.current = { id: e.pointerId, dx: w.x - frame.x, dy: w.y - frame.y };
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (!d || d.id !== e.pointerId) return;
              const w = world(e);
              place(w.x - d.dx, w.y - d.dy);
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            className="cursor-grab active:cursor-grabbing outline-none touch-pan-y"
          >
            <rect x={fx + frame.width / 2 - hit.w / 2} y={frame.y + frame.height / 2 - hit.h / 2} width={hit.w} height={hit.h} fill="transparent" />
            <rect x={fx} y={frame.y} width={frame.width} height={frame.height} fill="var(--fg)" stroke="var(--fg)" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
            <rect x={fx} y={frame.y} width={frame.width} height={90} fill="var(--bg)" fillOpacity={0.35} />
            {/* A four-way arrow: this is the part you drag. */}
            <path
              aria-hidden="true"
              d={`M${fx + frame.width / 2 - 110},${frame.y + frame.height * 0.62} h220 M${fx + frame.width / 2},${frame.y + frame.height * 0.62 - 110} v220 M${fx + frame.width / 2 + 70},${frame.y + frame.height * 0.62 - 40} l40,40 l-40,40 M${fx + frame.width / 2 - 70},${frame.y + frame.height * 0.62 - 40} l-40,40 l40,40 M${fx + frame.width / 2 - 40},${frame.y + frame.height * 0.62 - 70} l40,-40 l40,40 M${fx + frame.width / 2 - 40},${frame.y + frame.height * 0.62 + 70} l40,40 l40,-40`}
              fill="none"
              stroke="var(--bg)"
              strokeOpacity={0.85}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {/* The corner dot: a dark point inside a light ring, so it shows on the window and off it. */}
            <circle cx={fx} cy={frame.y} r={150} fill="var(--bg)" stroke="var(--fg)" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
            <circle cx={fx} cy={frame.y} r={62} fill="var(--fg)" />
            {focused && <rect x={fx - 60} y={frame.y - 60} width={frame.width + 120} height={frame.height + 120} fill="none" stroke="var(--accent)" strokeWidth={3} vectorEffect="non-scaling-stroke" />}
          </g>
        </svg>

        <PlacedLabel at={screenAt} spec={SPEC.screen} strong />
        {goneAt && <PlacedLabel at={goneAt} spec={SPEC.gone} />}
        <PlacedLabel at={zoneAt} spec={SPEC.zone} />
        {squeezeAt && <PlacedLabel at={squeezeAt} spec={SPEC.squeeze} />}
        <PlacedLabel at={winAt} spec={winSpec} strong />
        {ghostAt && ghostSpec && <PlacedLabel at={ghostAt} spec={ghostSpec} />}
        </div>
        <p className="mt-1.5 max-w-[62ch] text-[0.8125rem] leading-snug text-fg/75">
          <span className="font-semibold text-fg">Drag the window</span> (the block with the four arrows) to move it. The screen is {MONITOR.width} × {MONITOR.height}. The window stays put while its top-left corner (the dot) is inside the dotted box.
        </p>
      </div>

      {played && verdict ? (
        <Verdict title={titleOf(played)}>
          <p>
            <span className="sr-only">
              {MOVES[played.actor]} from {at(played.was)} to {at(played.now)}.{" "}
            </span>
            {ruleSentence(played.result, played.final).replace(/ Adopted\.$/, "")}
          </p>
          <p className="mt-1 text-[0.95rem] text-fg/80">In reach means at least 100 px of the window is over a screen and its top edge is on that screen.</p>
          {preset === "insists" && played.result.rule !== "insists" ? (
            <p className="text-[0.95rem] leading-snug text-fg/75 mt-1">Press “{BUTTON.kwin}” twice more, quickly: the third pull in a row is the window insisting.</p>
          ) : null}
        </Verdict>
      ) : (
        <Verdict quiet title={`No call yet: the window is at ${at(frame)}, ${here?.ok ? "in" : "out of"} reach`}>
          <p>
            {here
              ? `${here.across >= 0 ? `${fmt(here.across)} px of it is over the screen` : `It is ${fmt(-here.across)} px clear of the screen`}; 100 px must be over it. Press “${BUTTON[scene.actor]}” to see what the canvas does.`
              : "There is no screen."}
          </p>
        </Verdict>
      )}

      <Actions>
        <button type="button" className="btn min-h-11 sm:min-h-0" onClick={move}>
          {BUTTON[scene.actor]}
          {played ? " again" : ""}
        </button>
        <QuietAction onClick={() => choose(preset ?? PRESETS[0].id)}>Reset</QuietAction>
      </Actions>

      <div>
        <Fold summary="Why: the six checks">
          {played && detail ? (
            <>
              <p className="text-[0.95rem] leading-snug text-fg/75">{verdict === "revert" ? "Every check says pull." : "The classifier stopped at the highlighted check."}</p>
              <ol className="mt-1 border-t border-fg">
                {detail.rows.map((row, i) => {
                  const decisive = verdict === "adopt" && i === detail.decided;
                  return (
                    <li key={row.q} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-0.5 py-2 border-b border-border">
                      <span className="text-[0.95rem] leading-snug">{decisive ? <mark>{row.q}</mark> : row.q}</span>
                      <span className="text-[0.95rem] font-semibold text-right">
                        {row.answer === null ? <span className="font-normal text-fg/75">not asked</span> : decisive ? <mark>{row.answer}</mark> : row.answer}
                      </span>
                      <span className="col-span-2 font-mono text-xs leading-snug text-fg/75 [overflow-wrap:anywhere]">{row.numbers}</span>
                    </li>
                  );
                })}
              </ol>
            </>
          ) : (
            <p className="text-[0.95rem] leading-snug text-fg/75">The checks and the numbers they compare appear here once the move is played.</p>
          )}
        </Fold>
        <Fold summary="More controls">
          <div className="space-y-4">
            <p id={hintId} className="text-[0.95rem] leading-snug text-fg/75 max-w-[60ch]">
              Place the window by dragging it, or tab to it and use the arrow keys (Shift: 200 px), or type its place. On a phone a vertical swipe scrolls the page, so use the numbers for the height.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-[0.95rem]">
                x
                <input type="number" step={STEP} value={frame.x} onChange={(e) => Number.isFinite(e.target.valueAsNumber) && place(e.target.valueAsNumber, frame.y)} className="w-24 min-h-11 sm:min-h-9 border border-fg bg-background px-2 font-mono text-sm" />
              </label>
              <label className="flex items-center gap-2 text-[0.95rem]">
                y
                <input type="number" step={STEP} value={frame.y} onChange={(e) => Number.isFinite(e.target.valueAsNumber) && place(frame.x, e.target.valueAsNumber)} className="w-24 min-h-11 sm:min-h-9 border border-fg bg-background px-2 font-mono text-sm" />
              </label>
            </div>
            <label className="flex items-center gap-2 min-h-11 sm:min-h-9 text-[0.95rem]">
              <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={scene.gone} onChange={(e) => change({ gone: e.target.checked })} />
              A second screen was just unplugged
            </label>
            <Segmented label="What moves it" options={ACTORS.map((a) => ({ id: a.id, label: a.label }))} value={scene.actor} onChange={(id) => change({ actor: id as Actor })} />
            <Segmented
              label="When it moves again"
              options={(["quick", "pause"] as Gap[]).map((g) => ({ id: g, label: g === "quick" ? `Right after the last move (${GAP_MS.quick} ms)` : `After a pause (${GAP_MS.pause} ms)` }))}
              value={scene.gap}
              onChange={(id) => change({ gap: id as Gap })}
            />
          </div>
        </Fold>
        <Fold summary="All test cases">
          <div className="space-y-2">
            <Presets label="Test case" items={PRESETS} active={preset} onPick={choose} />
            {chosen && (
              <p className="text-[0.95rem] leading-snug text-fg/75 max-w-[62ch]">
                From <span className="font-mono text-xs">logic.test.js</span>: &ldquo;{chosen.test}&rdquo;.
              </p>
            )}
          </div>
        </Fold>
      </div>
    </FigureFrame>
  );
}
