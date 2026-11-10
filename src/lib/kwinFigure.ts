import { classify, inReach, type Chain, type Classification, type Rect } from "./frameAuthority";

// The state machine behind the frame-authority figure. Not ported from
// kwin-canvas: this is what the figure needs around the ported classifier.
// KWin itself is not running in the page. `kwinReach` is a stand-in for its
// reachability rule, written from the measurements in kwin-canvas's
// docs/architecture.md ("Frame authority"): a window with under 100 px of its
// width over a monitor goes to exactly 100 px (1840 and 4000 on a 1920 px
// screen both ended at 1820; -400 for a 460 px window ended at -360); a top
// above the monitor goes to 0 and a top in the last 28 px to the height minus
// 28 (1060 ended at 1052). Which monitor it picks when there are several was
// not measured: the stand-in takes the nearest.

/** The one monitor, as in the unit tests of kwin-canvas (logic.test.js, "the frame authority"). */
export const MONITOR: Rect = { x: 0, y: 0, width: 1920, height: 1080 };
/** A second monitor to the right, for the case of one just unplugged. */
export const GONE_MONITOR: Rect = { x: 1920, y: 0, width: 1920, height: 1080 };
/** The window of those tests: R(x, y) is 460 by 420. */
export const SIZE = { width: 460, height: 420 };
/** Where the script of the figure puts a window ("a move between two places on the screen", logic.test.js). */
export const SCRIPT_TO = { x: 700, y: 400 };
/** How much wider the app makes the window when it resizes it (the "a resize is not" test: 460 to 500). */
export const RESIZE_TO = { width: 500, height: 420 };
/** The sub-pixel snap of the "a sub-pixel snap is not" test. */
export const SNAP = 0.4;

export const GAP_MS = { quick: 200, pause: 2000 } as const;
export type Gap = keyof typeof GAP_MS;
export type Actor = "kwin" | "script" | "resize" | "snap";

export const ACTORS: { id: Actor; label: string; says: string }[] = [
  { id: "kwin", label: "KWin looks at it again", says: "KWin applies its reachability rule to the window" },
  { id: "script", label: "A script moves it", says: `a script moves the window to ${SCRIPT_TO.x}, ${SCRIPT_TO.y}` },
  { id: "resize", label: "Its app resizes it", says: `the app resizes the window to ${RESIZE_TO.width} by ${RESIZE_TO.height}, after KWin's rule moved it` },
  { id: "snap", label: "A sub-pixel snap", says: `the compositor snaps the window by ${SNAP} px` },
];

function gapBetween(r: Rect, o: Rect): number {
  const dx = Math.max(0, o.x - (r.x + r.width), r.x - (o.x + o.width));
  const dy = Math.max(0, o.y - (r.y + r.height), r.y - (o.y + o.height));
  return Math.hypot(dx, dy);
}

/** The stand-in for KWin's rule: where it leaves a window. A window already in reach stays where it is. */
export function kwinReach(r: Rect, monitors: readonly Rect[]): Rect {
  if (monitors.length === 0 || inReach(r, monitors)) return { ...r };
  let o = monitors[0];
  for (const m of monitors) if (gapBetween(r, m) < gapBetween(r, o)) o = m;
  const need = Math.min(100, r.width);
  const across = Math.min(r.x + r.width, o.x + o.width) - Math.max(r.x, o.x);
  let x = r.x;
  if (across < need) x = r.x < o.x ? o.x - r.width + need : o.x + o.width - need;
  let y = r.y;
  if (y < o.y) y = o.y;
  else if (y > o.y + o.height - 28) y = o.y + o.height - 28;
  return { x, y, width: r.width, height: r.height };
}

export function monitorsFor(gone: boolean): { now: Rect[]; before: Rect[] } {
  return gone ? { now: [MONITOR], before: [MONITOR, GONE_MONITOR] } : { now: [MONITOR], before: [MONITOR] };
}

/** What the actor does to a window the canvas holds at `was`. */
export function moveOf(actor: Actor, was: Rect, monitorsNow: readonly Rect[]): Rect {
  switch (actor) {
    case "kwin":
      return kwinReach(was, monitorsNow);
    case "script":
      return { x: SCRIPT_TO.x, y: SCRIPT_TO.y, width: was.width, height: was.height };
    case "resize": {
      const moved = kwinReach(was, monitorsNow);
      return { x: moved.x, y: moved.y, width: RESIZE_TO.width, height: RESIZE_TO.height };
    }
    case "snap":
      return { x: was.x + SNAP, y: was.y, width: was.width, height: was.height };
  }
}

export interface Scene {
  /** The window as the canvas holds it. */
  frame: Rect;
  gone: boolean;
  actor: Actor;
  gap: Gap;
  /** The fight detector's chain for this window, and the figure's clock in ms. */
  chain: Chain | null;
  clock: number;
}

export interface Played {
  t: number;
  actor: Actor;
  gone: boolean;
  was: Rect;
  now: Rect;
  /** Where the canvas leaves the window: back at `was` on a revert, at `now` when it adopts. */
  final: Rect;
  result: Classification;
}

/** The compositor's part: the actor moves the window, the classifier decides, the canvas acts. */
export function play(scene: Scene): { scene: Scene; played: Played } {
  const { now: monitors, before } = monitorsFor(scene.gone);
  const t = scene.clock + GAP_MS[scene.gap];
  const was = scene.frame;
  const now = moveOf(scene.actor, was, monitors);
  const result = classify(was, now, monitors, before, scene.chain, t);
  const final = result.verdict === "revert" ? { ...was } : now;
  return {
    scene: { ...scene, frame: final, chain: result.chain, clock: t },
    played: { t, actor: scene.actor, gone: scene.gone, was, now, final, result },
  };
}

export interface Preset {
  id: string;
  label: string;
  /** The name of the unit test in kwin-canvas (tests/unit/logic.test.js) this case comes from. */
  test: string;
  frame: { x: number; y: number };
  actor: Actor;
  gone?: boolean;
  /** What to do after choosing it, when one move is not the whole case. */
  hint?: string;
  expect: Classification["verdict"];
}

export const PRESETS: Preset[] = [
  {
    id: "pull-far",
    label: "Pulled in from far away",
    test: "KWin's pull from far away is a pull (4000 -> 1820, the d112 case)",
    frame: { x: 4000, y: 300 },
    actor: "kwin",
    expect: "revert",
  },
  {
    id: "pull-80",
    label: "80 px over to 100",
    test: "from 80 px over to 100 px over is a pull",
    frame: { x: 1840, y: 300 },
    actor: "kwin",
    expect: "revert",
  },
  {
    id: "pull-top",
    label: "A top above the screen",
    test: "a top edge brought to the top is a pull",
    frame: { x: 300, y: -60 },
    actor: "kwin",
    expect: "revert",
  },
  {
    id: "on-screen",
    label: "A move on the screen",
    test: "a move between two places on the screen is not",
    frame: { x: 100, y: 120 },
    actor: "script",
    expect: "adopt",
  },
  {
    id: "resize",
    label: "A resize",
    test: "a resize is not",
    frame: { x: 4000, y: 300 },
    actor: "resize",
    expect: "adopt",
  },
  {
    id: "snap",
    label: "A sub-pixel snap",
    test: "a sub-pixel snap is not",
    frame: { x: 4000, y: 300 },
    actor: "snap",
    expect: "adopt",
  },
  {
    id: "rescue",
    label: "A monitor went away",
    test: "a rescue from a monitor that went away is not (it was in reach before)",
    frame: { x: 2220, y: 200 },
    actor: "kwin",
    gone: true,
    expect: "adopt",
  },
  {
    id: "insists",
    label: "A window that insists",
    test: "the third running is the window insisting: adopted",
    frame: { x: 4000, y: 300 },
    actor: "kwin",
    hint: "Press Move it twice more, quickly.",
    expect: "revert",
  },
];

export function presetScene(p: Preset, gap: Gap = "quick"): Scene {
  return {
    frame: { x: p.frame.x, y: p.frame.y, ...SIZE },
    gone: !!p.gone,
    actor: p.actor,
    gap,
    chain: null,
    clock: 800,
  };
}

/** What the figure shows before anyone has touched it: the first case, already played, so the page says something without scripts. */
export function initialFigure(): { scene: Scene; played: Played; preset: string } {
  const p = PRESETS[0];
  const r = play(presetScene(p));
  return { scene: r.scene, played: r.played, preset: p.id };
}

/** One sentence for what decided, in the figure's words. */
export function ruleSentence(c: Classification, final: Rect): string {
  switch (c.rule) {
    case "size-changed":
      return "The size changed. KWin's rule moves a window without resizing it, so this is a hand or an app. Adopted.";
    case "not-moved":
      return "It moved by under a pixel on both axes. There is nothing to undo. Adopted.";
    case "was-in-reach":
      return "It left a place that was in reach. KWin only pulls windows that were out of reach. Adopted.";
    case "was-in-reach-before":
      return "It was in reach before the last layout change: a window rescued from a monitor that went away is KWin's to place. Adopted.";
    case "lands-out-of-reach":
      return "It did not land in reach, so this is not KWin's rule. Adopted.";
    case "insists":
      return "It has the shape of a pull, but it is the third in a row within 500 ms: a rule or a script insists, and the canvas stops fighting. Adopted.";
    case "pull":
      return `Same size, from out of reach to in reach: the shape of KWin's rule. Reverted, the canvas writes the window back to ${Math.round(final.x)}, ${Math.round(final.y)}.`;
  }
}
