// The fallback sampler's ceiling, from the limits TizenAmbilight measured on one TV
// (docs/how-it-works.md, "DRM fallback"). When the video plane is withheld the app
// asks the TV's own colour-measure block for one small block of the screen at a
// time. The TV reports 2 measure slots and a 20 ms settle time: arm both slots,
// wait, read both. That is the whole model; there is no overhead in it, so it is a
// ceiling and the measured rates sit at or just under it.

/** Measure slots the TV reported (`BlockCount`). */
export const SLOTS = 2;
/** The TV-reported settle time, which the app waits exactly by default. */
export const DEFAULT_SETTLE_MS = 20;
/** The settle time the repo's table was measured at. Fresh reads need about one 60 Hz frame (15 to 17 ms). */
export const MEASURED_SETTLE_MS = 17;

/** Readings per second at most: every slot read once per settle time. */
export function readingsPerSecond(settleMs: number, slots: number = SLOTS): number {
  return (slots * 1000) / settleMs;
}

/** Steps in one lap of the ring: the sampler takes the spots `slots` at a time. */
export function lapSteps(spots: number, slots: number = SLOTS): number {
  return Math.ceil(spots / slots);
}

/** Milliseconds for the sampler to visit every spot once. */
export function lapMs(spots: number, settleMs: number, slots: number = SLOTS): number {
  return lapSteps(spots, slots) * settleMs;
}

/** How often each spot is refreshed, in Hz, at most. */
export function spotHz(spots: number, settleMs: number, slots: number = SLOTS): number {
  return 1000 / lapMs(spots, settleMs, slots);
}

export interface Measured {
  spots: number;
  /** Hz each spot was refreshed, low and high, as the repo reports it. */
  lo: number;
  hi: number;
  /** The repo's wording. */
  text: string;
}

/** The repo's table, measured on the S84F at a 17 ms settle with protected video playing. */
export const MEASURED: Measured[] = [
  { spots: 8, lo: 12, hi: 15, text: "12 to 15 Hz" },
  { spots: 12, lo: 8, hi: 10, text: "8 to 10 Hz" },
  { spots: 24, lo: 4, hi: 5, text: "4 to 5 Hz" },
  { spots: 73, lo: 1.4, hi: 1.4, text: "about 1.4 Hz" },
];

/** At the default 20 ms settle the final build read 80 to 99 readings a second, 3.3 to 4.1 Hz per spot at 24. */
export const MEASURED_DEFAULT = { readings: [80, 99] as const, spots: 24, hz: [3.3, 4.1] as const };

/** `n` points spread evenly round the edge of a w by h rectangle, starting at the top left, clockwise. */
export function ringPoints(n: number, w: number, h: number): [number, number][] {
  const per = 2 * (w + h);
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    let d = (i * per) / n;
    if (d < w) pts.push([d, 0]);
    else if ((d -= w) < h) pts.push([w, d]);
    else if ((d -= h) < w) pts.push([w - d, h]);
    else pts.push([0, h - (d - w)]);
  }
  return pts;
}
