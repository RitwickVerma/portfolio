// SPDX-FileCopyrightText: 2026 Ritwick Verma <verma1997@gmail.com>
// SPDX-License-Identifier: GPL-2.0-or-later
//
// The frame classifier of kwin-canvas, ported to TypeScript.
//
//   Source:  effect/contents/ui/logic.js, the functions inReach, isPull and
//            fightStep (commit 93e7e50, which moved them there from the
//            effect's main.qml, where 7fe6ce2 introduced them), and the way
//            classifyFrame in main.qml composes them (classify below).
//   Repo:    https://gitlab.com/ritwick7/kwin-canvas (a fork of
//            https://github.com/aaronsb/kwin-canvas; upstream has none of
//            this code: both commits are the fork's own work).
//   Licence: GPL-2.0-or-later, copyright Ritwick Verma.
//
// inReach, isPull and fightStep follow the original line for line; the only
// change is that the literals 100, 28 and 500 have names. Everything after
// the "explain" divider is new here: it reads the same numbers out so a
// figure can show them, and frameAuthority.test.ts pins every one of those
// readings to the ported functions, so the explanation cannot drift from
// the code it explains.

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The reverts so far in a burst: how many, and when the last one was. */
export interface Chain {
  n: number;
  at: number;
}

/** Pixels of a window's width that must lie over a monitor (all of a narrower window). main.qml's rule as measured on KWin 6.8. */
export const REACH_WIDTH = 100;
/** The top edge may sit this far above a monitor's bottom edge and no lower. */
export const REACH_BOTTOM = 28;
/** A revert within this many ms of the last continues the chain (main.qml `fightMs`). */
export const FIGHT_MS = 500;

// ---- the port -------------------------------------------------------------

/**
 * KWin keeps a window reachable: at least 100 px of its width (or all of a narrower window) over
 * a monitor, and its top edge from the monitor's top down to 28 px above its bottom (measured on
 * KWin 6.8).
 */
export function inReach(r: Rect, monitors: readonly Rect[]): boolean {
  for (let i = 0; i < monitors.length; ++i) {
    const o = monitors[i];
    const across = Math.min(r.x + r.width, o.x + o.width) - Math.max(r.x, o.x);
    if (across >= Math.min(REACH_WIDTH, r.width) && r.y >= o.y && r.y <= o.y + o.height - REACH_BOTTOM) return true;
  }
  return false;
}

/**
 * Whether a frame change has the shape of KWin's reachability rule, the only move of a window's
 * frame the canvas undoes: the same size (within a pixel), moved by a pixel or more, from a place
 * out of reach of the monitors as they are and as they were before the last layout change (a
 * window rescued from a monitor that went away is KWin's to place), to one in reach of the
 * monitors as they are.
 */
export function isPull(was: Rect, now: Rect, monitorsNow: readonly Rect[], monitorsBefore?: readonly Rect[] | null): boolean {
  if (Math.abs(now.width - was.width) > 1 || Math.abs(now.height - was.height) > 1) return false;
  if (Math.abs(now.x - was.x) < 1 && Math.abs(now.y - was.y) < 1) return false;
  if (inReach(was, monitorsNow) || inReach(was, monitorsBefore || [])) return false;
  return inReach(now, monitorsNow);
}

/**
 * The fight detector's step for one window. chain: { n, at } or null, the window's reverts so
 * far; now in ms. A revert within fightMs of the last one continues the chain; the third move of
 * a chain is the window insisting (a rule or a script) and is adopted. Returns the chain to keep
 * and whether this move may be reverted. The chain it was given is left alone.
 */
export function fightStep(chain: Chain | null, now: number, fightMs: number): { chain: Chain; allow: boolean } {
  const c: Chain = !chain || now - chain.at > fightMs ? { n: 0, at: now } : { n: chain.n, at: chain.at };
  c.at = now;
  const allow = c.n < 2;
  c.n++;
  return { chain: c, allow };
}

// ---- explain: the same decision, with its numbers ---------------------------

/** What inReach compared against one monitor. */
export interface MonitorReach {
  monitor: Rect;
  /** Pixels of the window's width over the monitor (negative: that far clear of it). */
  across: number;
  /** Pixels it must have: 100, or the whole width of a narrower window. */
  need: number;
  widthOk: boolean;
  top: number;
  /** The top edge may be anywhere from topMin to topMax, inclusive. */
  topMin: number;
  topMax: number;
  topOk: boolean;
  ok: boolean;
}

export function reachReport(r: Rect, monitors: readonly Rect[]): MonitorReach[] {
  return monitors.map((o) => {
    const across = Math.min(r.x + r.width, o.x + o.width) - Math.max(r.x, o.x);
    const need = Math.min(REACH_WIDTH, r.width);
    const topMin = o.y;
    const topMax = o.y + o.height - REACH_BOTTOM;
    const widthOk = across >= need;
    const topOk = r.y >= topMin && r.y <= topMax;
    return { monitor: o, across, need, widthOk, top: r.y, topMin, topMax, topOk, ok: widthOk && topOk };
  });
}

/** The monitor a report is best read against: the first one in reach, else the one with the most width over it. */
export function bestReach(report: readonly MonitorReach[]): MonitorReach | null {
  const ok = report.find((m) => m.ok);
  if (ok) return ok;
  let best: MonitorReach | null = null;
  for (const m of report) if (!best || m.across > best.across) best = m;
  return best;
}

export type PullRule = "size-changed" | "not-moved" | "was-in-reach" | "was-in-reach-before" | "lands-out-of-reach" | "pull";

export interface PullTrace {
  /** The first check of isPull that decided, or "pull" when none did. */
  rule: PullRule;
  pull: boolean;
  dw: number;
  dh: number;
  dx: number;
  dy: number;
  wasNow: MonitorReach[];
  wasBefore: MonitorReach[];
  nowNow: MonitorReach[];
}

/** isPull, answering with the check that decided and the numbers it compared. `pull` always equals isPull(...). */
export function explainPull(was: Rect, now: Rect, monitorsNow: readonly Rect[], monitorsBefore?: readonly Rect[] | null): PullTrace {
  const dw = now.width - was.width;
  const dh = now.height - was.height;
  const dx = now.x - was.x;
  const dy = now.y - was.y;
  const wasNow = reachReport(was, monitorsNow);
  const wasBefore = reachReport(was, monitorsBefore || []);
  const nowNow = reachReport(now, monitorsNow);
  let rule: PullRule = "pull";
  if (Math.abs(dw) > 1 || Math.abs(dh) > 1) rule = "size-changed";
  else if (Math.abs(dx) < 1 && Math.abs(dy) < 1) rule = "not-moved";
  else if (wasNow.some((m) => m.ok)) rule = "was-in-reach";
  else if (wasBefore.some((m) => m.ok)) rule = "was-in-reach-before";
  else if (!nowNow.some((m) => m.ok)) rule = "lands-out-of-reach";
  return { rule, pull: rule === "pull", dw, dh, dx, dy, wasNow, wasBefore, nowNow };
}

export type Verdict = "adopt" | "revert";
export type Rule = PullRule | "insists";

export interface Classification {
  verdict: Verdict;
  /** What decided: the failed check of isPull, "pull" (reverted), or "insists" (a pull the fight detector let through). */
  rule: Rule;
  trace: PullTrace;
  /** Set when the move was a pull and the fight detector was asked. */
  fight: { before: Chain | null; after: Chain; allow: boolean; sinceLast: number | null; limit: number } | null;
  /** The chain to keep for this window: changed only when the fight detector ran. */
  chain: Chain | null;
}

/**
 * "revert" or "adopt" for a frame that went from `was` to `now` at time t (ms), for a window the
 * canvas keeps on its plane. This is the order classifyFrame in main.qml uses: not a pull, adopt
 * (the fight detector is not asked); a pull, ask fightStep, and revert only while it allows.
 * What classifyFrame adds from the scene (a hand on the window, a maximized, tiled, fullscreen or
 * minimized window, chrome, FollowActivation off) is left out.
 */
export function classify(
  was: Rect,
  now: Rect,
  monitorsNow: readonly Rect[],
  monitorsBefore: readonly Rect[] | null,
  chain: Chain | null,
  t: number,
  fightMs: number = FIGHT_MS,
): Classification {
  const trace = explainPull(was, now, monitorsNow, monitorsBefore);
  if (!isPull(was, now, monitorsNow, monitorsBefore)) return { verdict: "adopt", rule: trace.rule, trace, fight: null, chain };
  const step = fightStep(chain, t, fightMs);
  const fight = { before: chain, after: step.chain, allow: step.allow, sinceLast: chain ? t - chain.at : null, limit: fightMs };
  return { verdict: step.allow ? "revert" : "adopt", rule: step.allow ? "pull" : "insists", trace, fight, chain: step.chain };
}

/**
 * Where a window's top-left corner must lie for inReach to hold on one monitor: the box
 * the figure draws. Valid for a window no wider than the monitor.
 */
export function reachBox(size: { width: number; height: number }, monitor: Rect): Rect {
  const need = Math.min(REACH_WIDTH, size.width);
  const x = monitor.x - size.width + need;
  const y = monitor.y;
  return { x, y, width: monitor.x + monitor.width - need - x, height: monitor.height - REACH_BOTTOM };
}
