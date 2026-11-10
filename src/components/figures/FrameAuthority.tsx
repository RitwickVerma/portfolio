"use client";

import { useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
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
const VB = { x: -600, y: -650, w: 3800, h: 2400 };
const LIMIT = { x0: -500, x1: 4300, y0: -300, y1: 1100 };
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

/** A label laid over the drawing at a world position (already squeezed); flips its anchor near an edge so it never leaves the box. */
function Label({ x, y, below, children, strong, wrap, side: forced }: { x: number; y: number; below?: boolean; children: ReactNode; strong?: boolean; wrap?: boolean; side?: "left" | "right" }) {
  const px = ((x - VB.x) / VB.w) * 100;
  const py = ((y - VB.y) / VB.h) * 100;
  const side = forced ?? (px < 20 ? "left" : px > 62 ? "right" : "mid");
  const style: CSSProperties = {
    left: `${px}%`,
    top: `${py}%`,
    transform: `translate(${side === "left" ? "0" : side === "right" ? "-100%" : "-50%"}, ${below ? "3px" : "calc(-100% - 3px)"})`,
  };
  return (
    <span
      aria-hidden="true"
      style={style}
      className={`pointer-events-none absolute rounded-[2px] bg-background/85 px-1 text-xs sm:text-[0.8125rem] leading-tight text-fg ${wrap ? "w-max max-w-[94%] whitespace-normal" : "whitespace-nowrap"} ${strong ? "font-semibold" : ""} ${side === "right" ? "text-right" : side === "left" ? "text-left" : "text-center"}`}
    >
      {children}
    </span>
  );
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
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: number; dx: number; dy: number } | null>(null);
  const hintId = useId();

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
  // The lower of the two windows gets its label underneath and the higher one above, so a label never lands on the other window.
  const farSide = frame.x > BREAK || (!!ghost && ghost.x > BREAK);
  const solidBelow = !!ghost && frame.y > ghost.y;

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

          {/* Where the drawing turns from to scale to squeezed. */}
          {farSide && <line aria-hidden="true" x1={BREAK} y1={-450} x2={BREAK} y2={1120} stroke="var(--fg)" strokeOpacity={0.5} strokeWidth={1.5} strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />}

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
            <g aria-hidden="true" stroke="var(--bg)" strokeOpacity={0.55} strokeWidth={2.5} strokeLinecap="round" vectorEffect="non-scaling-stroke">
              <line x1={fx + frame.width * 0.3} y1={frame.y + frame.height * 0.55} x2={fx + frame.width * 0.7} y2={frame.y + frame.height * 0.55} vectorEffect="non-scaling-stroke" />
              <line x1={fx + frame.width * 0.3} y1={frame.y + frame.height * 0.72} x2={fx + frame.width * 0.7} y2={frame.y + frame.height * 0.72} vectorEffect="non-scaling-stroke" />
            </g>
            <circle cx={fx} cy={frame.y} r={90} fill="var(--bg)" stroke="var(--fg)" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
            {focused && <rect x={fx - 60} y={frame.y - 60} width={frame.width + 120} height={frame.height + 120} fill="none" stroke="var(--accent)" strokeWidth={3} vectorEffect="non-scaling-stroke" />}
          </g>
        </svg>

        <Label x={MONITOR.x + MONITOR.width} y={MONITOR.y} strong side="right">
          Screen
        </Label>
        {scene.gone && (
          <Label x={GONE_MONITOR.x + 60} y={GONE_MONITOR.y} side="left">
            Unplugged
          </Label>
        )}
        <Label x={zone.x} y={MONITOR.y + MONITOR.height + 30} below side="left">
          Dotted box: safe for the dot
        </Label>
        {farSide && (
          <Label x={BREAK - 40} y={VB.y + 20} below side="right">
            Squeezed beyond this line
          </Label>
        )}
        {played && ghost ? (
          <>
            <Label x={fx + frame.width / 2} y={solidBelow ? frame.y + frame.height : frame.y} below={solidBelow} strong>
              Window {verdict === "revert" ? "put back at" : "kept at"} {at(frame)}
            </Label>
            <Label x={mx(ghost.x) + ghost.width / 2} y={solidBelow ? ghost.y : ghost.y + ghost.height} below={!solidBelow}>
              {verdict === "revert" ? `${GHOST[played.actor]} ${at(ghost)}` : `Was at ${at(ghost)}`}
            </Label>
          </>
        ) : (
          <Label x={fx + frame.width / 2} y={frame.y} strong>
            Window at {at(frame)} · drag me
          </Label>
        )}
        </div>
        <p className="fact mt-1.5 max-w-[60ch]">The screen is 1920 × 1080. The window stays put while its top-left corner (the dot) is inside the dotted box.</p>
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
            <p className="fact mt-1">Press “{BUTTON.kwin}” twice more, quickly: the third pull in a row is the window insisting.</p>
          ) : null}
        </Verdict>
      ) : (
        <Verdict title={`No call yet: the window is at ${at(frame)}, ${here?.ok ? "in" : "out of"} reach`}>
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
              <p className="fact">{verdict === "revert" ? "Every check says pull." : "The classifier stopped at the highlighted check."}</p>
              <ol className="mt-1 border-t border-fg">
                {detail.rows.map((row, i) => {
                  const decisive = verdict === "adopt" && i === detail.decided;
                  return (
                    <li key={row.q} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-0.5 py-2 border-b border-border">
                      <span className="wd-narrow text-[0.95rem] leading-snug">{decisive ? <mark>{row.q}</mark> : row.q}</span>
                      <span className="wd-narrow text-[0.95rem] font-semibold text-right">
                        {row.answer === null ? <span className="font-normal text-muted">not asked</span> : decisive ? <mark>{row.answer}</mark> : row.answer}
                      </span>
                      <span className="col-span-2 font-mono text-xs leading-snug text-muted [overflow-wrap:anywhere]">{row.numbers}</span>
                    </li>
                  );
                })}
              </ol>
            </>
          ) : (
            <p className="fact">The checks and the numbers they compare appear here once the move is played.</p>
          )}
        </Fold>
        <Fold summary="More controls">
          <div className="space-y-4">
            <p id={hintId} className="fact max-w-[60ch]">
              Place the window by dragging it, or tab to it and use the arrow keys (Shift: 200 px), or type its place. On a phone a vertical swipe scrolls the page, so use the numbers for the height.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 wd-narrow text-[0.95rem]">
                x
                <input type="number" step={STEP} value={frame.x} onChange={(e) => Number.isFinite(e.target.valueAsNumber) && place(e.target.valueAsNumber, frame.y)} className="w-24 min-h-11 sm:min-h-9 border border-fg bg-background px-2 font-mono text-sm" />
              </label>
              <label className="flex items-center gap-2 wd-narrow text-[0.95rem]">
                y
                <input type="number" step={STEP} value={frame.y} onChange={(e) => Number.isFinite(e.target.valueAsNumber) && place(frame.x, e.target.valueAsNumber)} className="w-24 min-h-11 sm:min-h-9 border border-fg bg-background px-2 font-mono text-sm" />
              </label>
            </div>
            <label className="flex items-center gap-2 min-h-11 sm:min-h-9 wd-narrow text-[0.95rem]">
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
              <p className="fact max-w-[62ch]">
                From <span className="font-mono text-xs">logic.test.js</span>: &ldquo;{chosen.test}&rdquo;.
              </p>
            )}
          </div>
        </Fold>
      </div>
    </FigureFrame>
  );
}
