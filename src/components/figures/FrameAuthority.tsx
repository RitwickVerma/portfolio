"use client";

import { useEffect, useId, useRef, useState } from "react";
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

// The decision kwin-canvas makes when a window it parked moves and the move
// was not its own: put it back, or take the new place as the window's own.
// The window is yours to place; the button plays the part of whatever moves
// it. The verdict comes from frameAuthority.ts, a port of the effect's own
// functions, and every number in the table is one that code compared.
//
// On touch a vertical swipe still scrolls the page (touch-action: pan-y), so
// the window is also placed with the arrow keys or the two number fields.

const VB = { x: -1000, y: -450, w: 5800, h: 2200 };
const LIMIT = { x0: -900, x1: 4300, y0: -400, y1: 1300 };
const STEP = 20;
const BIG_STEP = 200;

interface State {
  scene: Scene;
  /** The last move played, or null once the window, the actor or the monitors changed since. */
  played: Played | null;
  preset: string | null;
}

/** A triangle at the middle of the moved window, pointing the way the move went. */
function arrowHead(from: Rect, to: Rect): string {
  const cx = to.x + to.width / 2;
  const cy = to.y + to.height / 2;
  const dx = cx - (from.x + from.width / 2);
  const dy = cy - (from.y + from.height / 2);
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const L = 190;
  const W = 90;
  return `${cx},${cy} ${cx - ux * L - uy * W},${cy - uy * L + ux * W} ${cx - ux * L + uy * W},${cy - uy * L - ux * W}`;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const signed = (n: number) => (n > 0 ? `+${fmt(n)}` : fmt(n));

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

export default function FrameAuthority() {
  const [state, setState] = useState<State>(() => {
    const f = initialFigure();
    return { scene: f.scene, played: f.played, preset: f.preset };
  });
  const [focused, setFocused] = useState(false);
  /** The drawing's width in CSS pixels, so a label can be drawn at a size a reader can read at any width. */
  const [px, setPx] = useState(700);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: number; dx: number; dy: number } | null>(null);
  const hintId = useId();

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setPx(Math.max(200, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
    const r = play(presetScene(p, scene.gap));
    setState({ scene: r.scene, played: r.played, preset: id });
  };

  const world = (e: React.PointerEvent) => {
    const box = svgRef.current!.getBoundingClientRect();
    return { x: VB.x + ((e.clientX - box.left) / box.width) * VB.w, y: VB.y + ((e.clientY - box.top) / box.height) * VB.h };
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    const k = e.shiftKey ? BIG_STEP : STEP;
    const d: Record<string, [number, number]> = { ArrowLeft: [-k, 0], ArrowRight: [k, 0], ArrowUp: [0, -k], ArrowDown: [0, k] };
    const m = d[e.key];
    if (!m) return;
    e.preventDefault();
    place(frame.x + m[0], frame.y + m[1]);
  };

  const box = reachBox(frame, MONITOR);
  // A target at least 24 px across on screen whatever the window's size: at 320 px wide one screen pixel is about 20 world units.
  const hit = { w: Math.max(frame.width, 600), h: Math.max(frame.height, 600) };
  const u = VB.w / px; // world units to a CSS pixel
  const fs = 11 * u;
  const verdict = played ? played.result.verdict : null;
  const detail = played ? rowsOf(played) : null;
  const here = bestReach(reachReport(frame, monitors));

  return (
    <figure className="mt-0 mb-8">
      <div className="relative border-2 border-fg rounded-[var(--r-box)] bg-surface overflow-hidden">
        {/* The verdict again, where the eye already is; the live region below is what a screen reader hears. */}
        <p aria-hidden="true" className={`absolute left-3 top-2 z-10 wd-semi text-[clamp(1rem,3.4vw,1.5rem)] font-extrabold leading-none pointer-events-none ${verdict ? "text-fg" : "text-muted"}`}>
          {verdict === "revert" ? "Revert" : verdict === "adopt" ? "Adopt" : "Not played"}
        </p>
        <svg
          ref={svgRef}
          viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
          role="group"
          aria-label="A canvas of screens with one window on it. Solid: where the canvas holds the window. Dashed outline: where it was moved to."
          className="block w-full h-auto touch-pan-y select-none"
        >
          {/* The monitor, and the box its reach rule leaves for a window's top-left corner. */}
          <rect x={MONITOR.x} y={MONITOR.y} width={MONITOR.width} height={MONITOR.height} fill="var(--bg)" stroke="var(--fg)" strokeWidth={3} vectorEffect="non-scaling-stroke" />
          {scene.gone && (
            <rect x={GONE_MONITOR.x} y={GONE_MONITOR.y} width={GONE_MONITOR.width} height={GONE_MONITOR.height} fill="none" stroke="var(--fg)" strokeOpacity={0.5} strokeWidth={2} strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />
          )}
          <rect x={box.x} y={box.y} width={box.width} height={box.height} fill="var(--fg)" fillOpacity={0.06} stroke="var(--muted)" strokeWidth={1.5} strokeDasharray="1 4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />

          {/* The move, once played: where it went, drawn dashed, and the line from where the canvas held it. */}
          {played && (
            <g aria-hidden="true">
              <line x1={played.was.x + played.was.width / 2} y1={played.was.y + played.was.height / 2} x2={played.now.x + played.now.width / 2} y2={played.now.y + played.now.height / 2} stroke="var(--fg)" strokeOpacity={0.6} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
              <polygon points={arrowHead(played.was, played.now)} fill="var(--fg)" fillOpacity={0.6} />
              <rect x={played.now.x} y={played.now.y} width={played.now.width} height={played.now.height} fill="none" stroke="var(--fg)" strokeWidth={2} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
            </g>
          )}

          <g aria-hidden="true" fill="var(--muted)" fontSize={fs} stroke="var(--bg)" strokeWidth={4 * u} strokeLinejoin="round" paintOrder="stroke" className="wd-narrow pointer-events-none">
            <text x={MONITOR.x + 8 * u} y={MONITOR.y + MONITOR.height - 8 * u}>monitor</text>
            {played && (
              <text x={played.now.x + played.now.width / 2} y={played.now.y + played.now.height + 14 * u} textAnchor="middle">
                moved to
              </text>
            )}
          </g>

          {/* The window: the canvas's frame for it. Drag it, or focus it and use the arrow keys. */}
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
            <rect x={frame.x + frame.width / 2 - hit.w / 2} y={frame.y + frame.height / 2 - hit.h / 2} width={hit.w} height={hit.h} fill="transparent" />
            <rect x={frame.x} y={frame.y} width={frame.width} height={frame.height} fill="var(--bg)" stroke="var(--fg)" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
            <rect x={frame.x} y={frame.y} width={frame.width} height={80} fill="var(--fg)" fillOpacity={0.22} />
            <text x={frame.x + frame.width / 2} y={frame.y - 7 * u} textAnchor="middle" fontSize={fs} fill="var(--fg)" stroke="var(--bg)" strokeWidth={4 * u} strokeLinejoin="round" paintOrder="stroke" className="wd-narrow" aria-hidden="true">
              window
            </text>
            {focused && <rect x={frame.x - 40} y={frame.y - 40} width={frame.width + 80} height={frame.height + 80} fill="none" stroke="var(--accent)" strokeWidth={3} vectorEffect="non-scaling-stroke" />}
          </g>
        </svg>
      </div>
      <p className="fact mt-2">Solid: the window as the canvas holds it. Dashed: where it was moved to. Dotted: where its top-left corner must lie to stay in reach.</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" className="btn" onClick={move}>
          Move it
        </button>
        <button type="button" className="btn-quiet" onClick={() => choose(preset ?? PRESETS[0].id)}>
          Reset
        </button>
        <span className="fact">
          {ACTORS.find((a) => a.id === scene.actor)!.label}, {scene.gap === "quick" ? "right after the last move" : "after a pause"}
        </span>
      </div>

      <div aria-live="polite" aria-atomic="true" className="mt-4 min-h-[7.5rem]">
        {played && verdict ? (
          <>
            <p className="wd-semi text-[1.75rem] font-extrabold leading-none">{verdict === "revert" ? "Revert" : "Adopt"}</p>
            <p className="mt-2 leading-snug">
              At {played.t} ms {ACTORS.find((a) => a.id === played.actor)!.says}: from {fmt(played.was.x)}, {fmt(played.was.y)} to {fmt(played.now.x)}, {fmt(played.now.y)}. {ruleSentence(played.result, played.final)}
            </p>
          </>
        ) : (
          <>
            <p className="wd-semi text-[1.75rem] font-extrabold leading-none text-muted">Not played</p>
            <p className="mt-2 leading-snug">
              The canvas holds the window at {frame.x}, {frame.y}. It is {here?.ok ? "in" : "out of"} reach: {here ? `${here.across >= 0 ? `${fmt(here.across)} px over the monitor` : `${fmt(-here.across)} px clear of the monitor`}, ${fmt(here.need)} needed, top ${fmt(here.top)} against ${fmt(here.topMin)} to ${fmt(here.topMax)}` : "no monitor"}. Press Move it.
            </p>
          </>
        )}
      </div>

      {played && detail ? (
        <>
        <p className="fact mt-3">{verdict === "revert" ? "Every check says pull." : "Stopped at the highlighted check."}</p>
        <ol className="mt-1 border-t border-fg">
          {detail.rows.map((row, i) => {
            const decisive = verdict === "adopt" && i === detail.decided;
            return (
              <li key={row.q} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-0.5 py-2 border-b border-border">
                <span className="wd-narrow text-[0.95rem] leading-snug">{decisive ? <mark>{row.q}</mark> : row.q}</span>
                <span className="wd-narrow text-[0.95rem] font-semibold text-right">
                  {row.answer === null ? <span className="font-normal text-muted">not asked</span> : decisive ? <mark>{row.answer}</mark> : row.answer}
                </span>
                <span className="col-span-2 font-mono text-[0.68rem] leading-snug text-muted [overflow-wrap:anywhere]">{row.numbers}</span>
              </li>
            );
          })}
        </ol>
        </>
      ) : (
        <p className="fact mt-3 border-t border-fg pt-2">The checks and the numbers they compare appear here once the move is played.</p>
      )}

      <div className="mt-6" role="group" aria-label="Test cases from the project's unit tests">
        <p className="fact mb-1">Test cases from the project</p>
        <ul className="flex flex-wrap gap-x-1 gap-y-1">
          {PRESETS.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                aria-pressed={preset === p.id}
                onClick={() => choose(p.id)}
                className={`wd-narrow text-[0.95rem] min-h-7 px-2 py-0.5 border rounded-[var(--r-chip)] ${preset === p.id ? "border-fg font-semibold text-fg" : "border-transparent underline underline-offset-4 decoration-fg/30 hover:text-fg text-fg/80"}`}
              >
                {p.label}
              </button>
            </li>
          ))}
        </ul>
        {chosen && (
          <p className="fact mt-2">
            From <span className="font-mono text-[0.68rem]">logic.test.js</span>: &ldquo;{chosen.test}&rdquo;.{chosen.hint ? ` ${chosen.hint}` : ""}
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <div className="min-w-0 space-y-4">
          <fieldset className="min-w-0">
            <legend id={hintId} className="fact mb-1">Place the window: drag it, tab to it and use the arrow keys (Shift: 200 px), or type</legend>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 wd-narrow text-[0.95rem]">
                x
                <input type="number" step={STEP} value={frame.x} onChange={(e) => Number.isFinite(e.target.valueAsNumber) && place(e.target.valueAsNumber, frame.y)} className="w-24 min-h-8 border border-fg bg-background px-2 font-mono text-sm" />
              </label>
              <label className="flex items-center gap-2 wd-narrow text-[0.95rem]">
                y
                <input type="number" step={STEP} value={frame.y} onChange={(e) => Number.isFinite(e.target.valueAsNumber) && place(frame.x, e.target.valueAsNumber)} className="w-24 min-h-8 border border-fg bg-background px-2 font-mono text-sm" />
              </label>
            </div>
          </fieldset>
          <fieldset className="min-w-0">
            <legend className="fact mb-1">The monitors</legend>
            <label className="flex items-center gap-2 min-h-7 wd-narrow text-[0.95rem]">
              <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={scene.gone} onChange={(e) => change({ gone: e.target.checked })} />
              A second monitor was just unplugged
            </label>
          </fieldset>
        </div>
        <div className="min-w-0 space-y-4">
          <fieldset className="min-w-0">
            <legend className="fact mb-1">What moves it</legend>
            <div className="flex flex-col">
              {ACTORS.map((a) => (
                <label key={a.id} className="flex items-center gap-2 min-h-7 wd-narrow text-[0.95rem]">
                  <input type="radio" name="kwin-actor" className="size-5 accent-[var(--accent)]" checked={scene.actor === a.id} onChange={() => change({ actor: a.id as Actor })} />
                  {a.label}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="min-w-0">
            <legend className="fact mb-1">When it moves again</legend>
            <div className="flex flex-col">
              {([
                ["quick", `Right after the last move (${GAP_MS.quick} ms)`],
                ["pause", `After a pause (${GAP_MS.pause} ms)`],
              ] as [Gap, string][]).map(([g, label]) => (
                <label key={g} className="flex items-center gap-2 min-h-7 wd-narrow text-[0.95rem]">
                  <input type="radio" name="kwin-gap" className="size-5 accent-[var(--accent)]" checked={scene.gap === g} onChange={() => change({ gap: g })} />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </div>

      <figcaption className="wd-narrow mt-6 text-[0.95rem] leading-snug text-fg/80">
        <strong className="font-semibold text-fg">The classifier is real and KWin is a stand-in.</strong> The verdict comes from a TypeScript port of kwin-canvas&apos;s own functions (<span className="font-mono text-[0.68rem]">inReach</span>,{" "}
        <span className="font-mono text-[0.68rem]">isPull</span> and <span className="font-mono text-[0.68rem]">fightStep</span>, in the order its classifier calls them), and each number in the table is one they
        compared. KWin is not running: its rule here is a stand-in written from my measurements in a nested KWin, for one 1920 by 1080 monitor, and which monitor it picks when there are two was not measured. The
        effect also asks the scene about a hand on the window, a maximized or fullscreen window and the FollowActivation setting; those are left out. The times are the figure&apos;s own clock, not a real one.
      </figcaption>
    </figure>
  );
}
