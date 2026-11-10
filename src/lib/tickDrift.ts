// The kernel tick, as arithmetic. Zephyr's machine timer here counts a 32 kHz
// clock, and the kernel works out how many hardware cycles make one tick with an
// integer division. crush80-zmk f1a7b77: at 10000 ticks/s that is 3.2, which
// became 3, so every kernel timer ran 6.7% fast; at 8000 ticks/s it is exactly 4.
// This is the division and what follows from it, nothing more.

/** The timer's clock, as the commit message treats it: 3.2 cycles at 10000 ticks/s. */
export const CLOCK_HZ = 32000;

/** The repo's measurements over 60 s against the host (f1a7b77), not computed here. */
export const MEASURED = {
  before: { ticksPerSecond: 10000, ratio: 1.0665 },
  after: { ticksPerSecond: 8000, ratio: 0.9998 },
} as const;

export interface Tick {
  ticksPerSecond: number;
  /** CLOCK_HZ / ticksPerSecond before rounding. */
  exactCycles: number;
  /** What the kernel uses: the integer part. 0 means the clock is too slow for this tick rate. */
  cycles: number;
  /** Kernel time that passes per second of real time. */
  ratio: number;
  /** Real milliseconds that 1000 ms of kernel time take. */
  realMsPerKernelSecond: number;
  /** What the kernel's clock says after `seconds` of real time, minus `seconds`. */
  driftAfter: (seconds: number) => number;
}

export function tick(ticksPerSecond: number): Tick | null {
  if (!Number.isInteger(ticksPerSecond) || ticksPerSecond < 1) return null;
  const exactCycles = CLOCK_HZ / ticksPerSecond;
  const cycles = Math.floor(exactCycles);
  if (cycles < 1) return null;
  const ratio = exactCycles / cycles;
  return {
    ticksPerSecond,
    exactCycles,
    cycles,
    ratio,
    realMsPerKernelSecond: 1000 / ratio,
    driftAfter: (seconds) => seconds * (ratio - 1),
  };
}

/** Where the first `n` ticks land, in hardware cycles: the kernel's idea and the hardware's. */
export function tickMarks(t: Tick, n: number): { expected: number[]; actual: number[] } {
  const expected: number[] = [];
  const actual: number[] = [];
  for (let k = 1; k <= n; k++) {
    expected.push(k * t.exactCycles);
    actual.push(k * t.cycles);
  }
  return { expected, actual };
}

/** 32000 → "32,000", the same on the server and in every browser. */
export function grouped(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export interface DriftVerdict {
  tone: "ok" | "warn";
  title: string;
  body: string;
}

/** The outcome in a sentence for someone who has never met a kernel tick. `ok` and `warn` are computed, not chosen. */
export function driftVerdict(t: Tick | null, seconds = 60): DriftVerdict {
  if (!t) {
    return {
      tone: "warn",
      title: "A 32 kHz clock cannot make that many ticks.",
      body: `It gives ${grouped(CLOCK_HZ)} cycles a second and a tick needs at least one cycle. Pick a whole number from 1 to ${grouped(CLOCK_HZ)}.`,
    };
  }
  const drift = t.driftAfter(seconds);
  if (Math.abs(drift) < 1e-9) {
    return {
      tone: "ok",
      title: `The clock keeps time: ${seconds} seconds is ${seconds} seconds.`,
      body: `A timeout set for 1000 ms lasts 1000 ms. ${grouped(CLOCK_HZ)} divides evenly by ${grouped(t.ticksPerSecond)}, so nothing is rounded away.`,
    };
  }
  const d = Math.abs(drift) < 0.1 ? 3 : 1;
  return {
    tone: "warn",
    title: `After ${seconds} seconds the keyboard's clock says ${(seconds + drift).toFixed(d)}: ${drift.toFixed(d)} seconds fast.`,
    body: `Every timer runs ${((t.ratio - 1) * 100).toFixed(d)}% fast: a timeout set for 1000 ms lasts ${t.realMsPerKernelSecond.toFixed(d)} ms.`,
  };
}
