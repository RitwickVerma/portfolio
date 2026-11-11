// The numbers in the eBay bullets, read out of the bullet text and turned into
// what the three Work figures draw. Nothing is typed twice: the figure's
// numbers are the sentence's numbers, so the two cannot disagree. Pure.

/** "2,549" -> 2549. */
export function toNumber(text: string): number {
  return Number(text.replace(/,/g, ""));
}

export interface Replay {
  /** Production queries replayed against the old and the new build. */
  queries: number;
  /** New errors on the first replay. */
  before: number;
  /** New errors after the root-cause fix. */
  after: number;
}

/** "replayed 50,000 production queries ... cut them from 167 to 6", or null when the bullet says no such thing. */
export function parseReplay(text: string): Replay | null {
  const q = text.match(/replayed ([\d,]+) production queries/);
  const e = text.match(/from ([\d,]+) to ([\d,]+)/);
  if (!q || !e) return null;
  return { queries: toNumber(q[1]), before: toNumber(e[1]), after: toNumber(e[2]) };
}

export interface Suite {
  unit: number;
  regression: number;
}

/** "2,549 unit and 511 regression tests". */
export function parseSuite(text: string): Suite | null {
  const m = text.match(/([\d,]+) unit and ([\d,]+) regression tests/);
  return m ? { unit: toNumber(m[1]), regression: toNumber(m[2]) } : null;
}

export interface Scope {
  sites: number;
  catalogs: number;
}

/** "16 sites and 19 catalogs". */
export function parseScope(text: string): Scope | null {
  const m = text.match(/(\d+) sites and (\d+) catalogs/);
  return m ? { sites: Number(m[1]), catalogs: Number(m[2]) } : null;
}

/**
 * Position of `value` on a log axis that runs from 1 to 10^`decades`, as a
 * share of the axis, 0 to 1. A value under 1 has no place on it and sits at 0.
 */
export function logShare(value: number, decades: number): number {
  if (value <= 1) return 0;
  return Math.min(1, Math.log10(value) / decades);
}

/** The smallest whole number of decades that holds the largest value: 50,000 needs 5 (1 to 100,000). */
export function decadesFor(max: number): number {
  return Math.max(1, Math.ceil(Math.log10(max)));
}

/** An axis label short enough that neighbouring decades never touch: 1, 10, 100, 1k, 10k, 100k. The bars carry the exact numbers. */
export function tickLabel(n: number): string {
  return n >= 1000 ? `${n / 1000}k` : String(n);
}

/** The axis ticks, one per decade, as the numbers they label: 1, 10, 100, ... 10^decades. */
export function decadeTicks(decades: number): number[] {
  return Array.from({ length: decades + 1 }, (_, i) => 10 ** i);
}

/** Shares of a whole, 0 to 1, in the order given. Linear. */
export function shares(parts: number[]): number[] {
  const total = parts.reduce((a, b) => a + b, 0);
  return parts.map((p) => (total === 0 ? 0 : p / total));
}

/** 50000 -> "50,000". The figure prints numbers the way the bullet does. */
export function group(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export type WorkFigureKind = "replay" | "suite" | "scope";

/** Which figure a bullet gets, if any. Bullets without these numbers stay prose. */
export function figureFor(text: string): WorkFigureKind | null {
  if (parseReplay(text)) return "replay";
  if (parseSuite(text)) return "suite";
  if (parseScope(text)) return "scope";
  return null;
}
