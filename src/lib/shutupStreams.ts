// What the ShutUp! figure runs: a timeline the visitor builds, replayed through the
// ported session (lib/shutup.ts), and the randomised safety check ported from the
// app's WaveSafetyPropertyTest. Pure; no clock but the injected one.
//
// The replay does what SensorGestureEngine does with a timer: after every reading
// it asks the session when tick() must next run, and runs it then.

import {
  FakeClock,
  GestureSession,
  MotionGuard,
  actionFor,
  gestureConfig,
  normalized,
  ringingConfig,
  type Gesture,
  type GestureAction,
  type SensorReading,
  type SessionTrace,
  type WaveSettings,
} from "./shutup";

// ─── The rules the figure can switch off ─────────────────────────────────

export interface Switches {
  /** Waves are ignored for the first second after ringing starts. */
  arming: boolean;
  /** Accelerometer readings reach the session; a moving phone mutes waves for 0.8 s. */
  motionGuard: boolean;
  /** A single wave can only silence: settings are normalised and the engine checks again. */
  singleWaveRule: boolean;
}

export const ALL_ON: Switches = { arming: true, motionGuard: true, singleWaveRule: true };

/** The app's defaults for the two rules that are numbers (GestureConfig). */
export const ARM_DELAY_MS = 1_000;
export const MOTION_HOLD_MS = 800;
export const WINDOW_MS = 1_200;

/**
 * What the person asked for: Answer on a single wave, which version 1 and 2.0 allowed. With the rule on,
 * normalized() moves it to the double wave and the single wave becomes Silence.
 */
export const ASKED: WaveSettings = { singleWave: "answer", doubleWave: "none", doubleWaveWindowMs: WINDOW_MS };

// ─── Building a timeline ─────────────────────────────────────────────────

export type Step = { kind: "near" | "far"; ms: number } | { kind: "jolt" };

/** The longest stretch a visitor can build, and the width of the axis (room for the last window to run out). */
export const MAX_BUILD_MS = 7_500;

export const REST = { x: 0, y: 0, z: 9.81 } as const;
/** A grab: the same reading the app's own tests use for "the phone is grabbed". */
export const JOLT = { x: 2, y: 5, z: 12 } as const;

/**
 * A reach I built, not a recording: a hand passes over the sensor as the ring starts, comes back to reach for
 * the phone, grabs it (the jolt), and passes over once more on the way to the screen.
 */
export const REACH: Step[] = [
  { kind: "far", ms: 300 },
  { kind: "near", ms: 150 },
  { kind: "far", ms: 750 },
  { kind: "near", ms: 150 },
  { kind: "jolt" },
  { kind: "near", ms: 100 },
  { kind: "far", ms: 300 },
  { kind: "near", ms: 200 },
  { kind: "far", ms: 400 },
];

export function buildEndMs(steps: Step[]): number {
  return steps.reduce((t, s) => (s.kind === "jolt" ? t : t + s.ms), 0);
}

export interface Block {
  near: boolean;
  fromMs: number;
  toMs: number;
}

/** The proximity blocks (adjacent steps in the same state merge) and the jolts, in time. */
export function layout(steps: Step[]): { blocks: Block[]; jolts: number[]; endMs: number } {
  const blocks: Block[] = [];
  const jolts: number[] = [];
  let t = 0;
  for (const s of steps) {
    if (s.kind === "jolt") {
      jolts.push(t);
      continue;
    }
    const last = blocks[blocks.length - 1];
    if (last && last.near === (s.kind === "near")) last.toMs = t + s.ms;
    else blocks.push({ near: s.kind === "near", fromMs: t, toMs: t + s.ms });
    t += s.ms;
  }
  return { blocks, jolts, endMs: t };
}

export interface Timed {
  atMs: number;
  reading: SensorReading;
}

/**
 * The sensor stream a timeline stands for. A proximity sensor reports on change, so only the change is a
 * reading; the sensor starts FAR and the phone starts at rest. A jolt is one accelerometer reading.
 */
export function readingsOf(steps: Step[]): Timed[] {
  const { blocks, jolts } = layout(steps);
  const out: Timed[] = [
    { atMs: 0, reading: { type: "proximity", near: false } },
    { atMs: 0, reading: { type: "accel", ...REST } },
  ];
  let state = false;
  for (const b of blocks) {
    if (b.near !== state) {
      out.push({ atMs: b.fromMs, reading: { type: "proximity", near: b.near } });
      state = b.near;
    }
  }
  for (const t of jolts) out.push({ atMs: t, reading: { type: "accel", ...JOLT } });
  return out.sort((a, b) => a.atMs - b.atMs);
}

// ─── Replaying it ────────────────────────────────────────────────────────

export type Rule = "arming" | "motion" | "single" | "wave";
export type Verb = "armed" | "fired" | "refused";
export type MarkKind = "counted" | "refused" | "fired";

export interface Entry {
  atMs: number;
  rule: Rule;
  verb: Verb;
  text: string;
  /** What to draw on the timeline for this entry, if anything. */
  mark?: MarkKind;
}

export interface Band {
  rule: "arming" | "motion";
  fromMs: number;
  toMs: number;
}

export type Outcome =
  | { kind: "ringing" }
  | { kind: "silenced"; atMs: number }
  | { kind: "answered"; atMs: number }
  | { kind: "ended"; atMs: number };

export interface Replay {
  entries: Entry[];
  bands: Band[];
  actions: { atMs: number; gesture: Gesture; action: GestureAction }[];
  outcome: Outcome;
  endMs: number;
}

/** Seconds with two decimals: "1.35 s". */
export const sec = (ms: number): string => `${(ms / 1000).toFixed(2)} s`;

const ACTION_WORD: Record<GestureAction, string> = { none: "nothing", silence: "Silence", answer: "Answer", end: "End" };
const GESTURE_WORD: Record<Gesture, string> = {
  SINGLE_WAVE: "single wave",
  DOUBLE_WAVE: "double wave",
  PICKED_UP: "pick-up",
  FACE_DOWN: "face down",
  LIFTED: "lifted",
  FOLD_CLOSED: "fold",
};

/** The settings the replay ends up running, and whether the engine's second check is in force. */
export function settingsFor(sw: Switches): WaveSettings {
  return sw.singleWaveRule ? normalized(ASKED) : ASKED;
}

export function replay(steps: Step[], sw: Switches): Replay {
  const settings = settingsFor(sw);
  const config = ringingConfig(settings, {
    waveArmDelayMs: sw.arming ? ARM_DELAY_MS : 0,
    motionHoldMs: MOTION_HOLD_MS,
  });
  const clock = new FakeClock(0);
  const entries: Entry[] = [];
  const bands: Band[] = [];
  const actions: Replay["actions"] = [];
  let lastMotionAt = -1;

  const trace = (t: SessionTrace) => {
    switch (t.kind) {
      case "motion":
        lastMotionAt = t.atMs;
        break;
      case "held":
        bands.push({ rule: "motion", fromMs: t.atMs, toMs: t.untilMs });
        entries.push({
          atMs: t.atMs,
          rule: "motion",
          verb: "fired",
          text: t.dropped
            ? `the phone moved: waves muted until ${sec(t.untilMs)} and the pending single wave dropped`
            : `the phone moved: waves muted until ${sec(t.untilMs)}`,
        });
        break;
      case "refused":
        if (t.reason === "arming") {
          entries.push({ atMs: t.atMs, rule: "arming", verb: "refused", mark: "refused", text: `a wave ${sec(t.untilMs! - t.atMs)} too early, waves are ignored until ${sec(t.untilMs!)}` });
        } else if (t.reason === "motion") {
          entries.push({ atMs: t.atMs, rule: "motion", verb: "refused", mark: "refused", text: `a wave ${sec(t.atMs - lastMotionAt)} after the phone moved, muted until ${sec(t.untilMs!)}` });
        } else if (t.reason === "no-far") {
          entries.push({ atMs: t.atMs, rule: "wave", verb: "refused", mark: "refused", text: "NEAR with no FAR before it: a starting state, not a wave" });
        } else {
          entries.push({ atMs: t.atMs, rule: "wave", verb: "refused", mark: "refused", text: `FAR lasted ${t.farMs} ms, under the 60 ms that separates a hand from chatter` });
        }
        break;
      case "counted":
        if (t.then === "waiting" || t.then === "flushed") {
          const until = t.then === "waiting" ? t.windowEndsMs! : t.atMs + WINDOW_MS;
          entries.push({ atMs: t.atMs, rule: "wave", verb: "armed", mark: "counted", text: `a wave counted: a second before ${sec(until)} makes a double` });
        } else if (t.then === "double") {
          entries.push({ atMs: t.atMs, rule: "wave", verb: "armed", mark: "counted", text: "a second wave inside the window" });
        } else {
          entries.push({ atMs: t.atMs, rule: "wave", verb: "armed", mark: "counted", text: "a wave counted, and doubles are off so it acts at once" });
        }
        break;
    }
  };

  const session = new GestureSession(config, clock, (gesture) => {
    const action = actionFor(gesture, settings, sw.singleWaveRule);
    actions.push({ atMs: clock.nowMs(), gesture, action });
    entries.push({ atMs: clock.nowMs(), rule: "wave", verb: "fired", mark: "fired", text: `${GESTURE_WORD[gesture]}` });
    if (gesture === "SINGLE_WAVE") {
      entries.push(
        sw.singleWaveRule
          ? { atMs: clock.nowMs(), rule: "single", verb: "refused", text: `Answer on a single wave; it did ${ACTION_WORD[action]} instead` }
          : { atMs: clock.nowMs(), rule: "single", verb: "fired", text: `single wave did ${ACTION_WORD[action]}` },
      );
    }
  }, trace);

  // The rules that are armed before the first reading.
  if (sw.arming) {
    bands.push({ rule: "arming", fromMs: 0, toMs: ARM_DELAY_MS });
    entries.push({ atMs: 0, rule: "arming", verb: "armed", text: `ringing starts: waves are ignored until ${sec(ARM_DELAY_MS)}` });
  }
  entries.push(
    sw.singleWaveRule
      ? { atMs: 0, rule: "single", verb: "armed", text: "you asked for Answer on a single wave: kept as Silence, and Answer moved to the double wave" }
      : { atMs: 0, rule: "single", verb: "armed", text: "you asked for Answer on a single wave and got it, as in version 1" },
  );

  // The engine's loop: one pending timer, replaced after every reading.
  let nextTickAt: number | null = null;
  const runTicksUpTo = (limit: number) => {
    while (nextTickAt !== null && nextTickAt <= limit) {
      clock.now = nextTickAt;
      const due: number | null = session.tick();
      nextTickAt = due === null ? null : clock.now + due;
    }
  };
  for (const { atMs, reading } of readingsOf(steps)) {
    if (reading.type === "accel" && !sw.motionGuard) {
      // The guard is off: the session is never told the phone moved.
      continue;
    }
    runTicksUpTo(atMs);
    clock.now = atMs;
    const due = session.onReading(reading);
    nextTickAt = due === null ? null : atMs + due;
  }
  runTicksUpTo(Infinity);

  // Merge motion bands that touch, so the timeline draws one stretch.
  bands.sort((a, b) => a.fromMs - b.fromMs);
  const merged: Band[] = [];
  for (const b of bands) {
    const last = merged[merged.length - 1];
    if (last && last.rule === b.rule && b.fromMs <= last.toMs) last.toMs = Math.max(last.toMs, b.toMs);
    else merged.push({ ...b });
  }

  entries.sort((a, b) => a.atMs - b.atMs);
  const outcome = outcomeOf(actions);
  if (outcome.kind === "answered" || outcome.kind === "ended") {
    // The engine swaps the ringing session for the in-call one: nothing after this is the wave detector's.
    const at = outcome.atMs;
    return {
      entries: entries.filter((e) => e.atMs <= at),
      bands: merged.filter((b) => b.fromMs <= at).map((b) => ({ ...b, toMs: Math.min(b.toMs, at) })),
      actions: actions.filter((a) => a.atMs <= at),
      outcome,
      endMs: at,
    };
  }
  return { entries, bands: merged, actions, outcome, endMs: clock.now };
}

function outcomeOf(actions: Replay["actions"]): Outcome {
  const worst = actions.find((a) => a.action === "answer" || a.action === "end");
  if (worst) return { kind: worst.action === "answer" ? "answered" : "ended", atMs: worst.atMs };
  const quiet = actions.find((a) => a.action === "silence");
  if (quiet) return { kind: "silenced", atMs: quiet.atMs };
  return { kind: "ringing" };
}

export function describeOutcome(o: Outcome): string {
  switch (o.kind) {
    case "answered":
      return `The call was answered at ${sec(o.atMs)}.`;
    case "ended":
      return `The call was ended at ${sec(o.atMs)}.`;
    case "silenced":
      return `The ringer was silenced at ${sec(o.atMs)}. The call is still ringing.`;
    default:
      return "Nothing fired. The call is still ringing and you can decline it.";
  }
}

// ─── Seeded random streams: the property test ────────────────────────────

/** mulberry32. A seeded generator, so a failing stream reproduces from its seed. */
export class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0;
  }
  /** A double in [0, 1). */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** An int in [0, n). */
  nextInt(n: number): number {
    return Math.floor(this.next() * n);
  }
  /** An int in [from, until). */
  nextLong(from: number, until: number): number {
    return from + Math.floor(this.next() * (until - from));
  }
  /** A float32 in [0, 1). */
  nextFloat(): number {
    return this.nextInt(1 << 24) / (1 << 24);
  }
}

/** The seed of stream `index` under a run's seed: two numbers in, one well-mixed seed out. */
export function streamSeed(seed: number, index: number): number {
  return (Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(index + 1, 0x85ebca6b) ^ 0xc2b2ae35) >>> 0;
}

export interface StreamOptions {
  doubleWave: boolean;
  hold: number;
  arm: number;
  window: number;
  /** false: accelerometer readings are not delivered to the session (the reference guard still sees them). */
  guard: boolean;
}

export interface Run {
  gestures: { atMs: number; gesture: Gesture }[];
  /** When the reference MotionGuard, fed the same readings, said the phone was moving. */
  motionAt: number[];
  startMs: number;
  /** Every FAR to NEAR change the generator made. */
  nearEdges: number[];
}

export const STREAM_READINGS = 200;

/**
 * Port of WaveSafetyPropertyTest.randomRun: 200 readings, 5 to 399 ms apart; one in three is a proximity
 * reading, the rest accelerometer readings that are mostly a resting phone and sometimes a grab or a lift.
 * The numbers come from a seeded generator of my own, so the streams are not the app's, but the shape is.
 */
export function randomRun(seed: number, o: StreamOptions): Run {
  const rnd = new Rng(seed);
  const clock = new FakeClock(100_000);
  const startMs = clock.nowMs();
  const gestures: Run["gestures"] = [];
  const session = new GestureSession(
    gestureConfig({ waves: true, doubleWave: o.doubleWave, doubleWaveWindowMs: o.window, waveArmDelayMs: o.arm, motionHoldMs: o.hold }),
    clock,
    (gesture) => gestures.push({ atMs: clock.nowMs(), gesture }),
  );
  // A second guard, outside the session, so the reference does not depend on the guard being on.
  const referenceMotion = new MotionGuard();
  const motionAt: number[] = [];
  const nearEdges: number[] = [];
  let near = false;
  for (let i = 0; i < STREAM_READINGS; i++) {
    clock.advance(rnd.nextLong(5, 400));
    if (rnd.nextInt(3) === 0) {
      const n: boolean = (rnd.nextInt(4) !== 0 && !near) || rnd.nextInt(3) === 0;
      if (n && !near) nearEdges.push(clock.nowMs());
      near = n;
      session.onReading({ type: "proximity", near });
    } else {
      // mostly a resting phone, sometimes a grab or a lift
      const spike = rnd.nextInt(8) === 0;
      const x = spike ? rnd.nextFloat() * 12 - 6 : rnd.nextFloat() * 0.4 - 0.2;
      const y = spike ? rnd.nextFloat() * 12 - 6 : rnd.nextFloat() * 0.4 - 0.2;
      const z = spike ? rnd.nextFloat() * 6 + 7 : 9.8 + rnd.nextFloat() * 0.3;
      const accel: SensorReading = { type: "accel", x, y, z };
      if (referenceMotion.onAccel(x, y, z)) motionAt.push(clock.nowMs());
      if (o.guard) session.onReading(accel);
    }
    session.tick();
  }
  clock.advance(o.window + 100);
  session.tick();
  return { gestures, motionAt, startMs, nearEdges };
}

export interface Properties {
  /** A wave counted while the phone was moving or within `hold` ms of it. */
  motion: number;
  /** A wave counted before the arm delay. */
  arming: number;
  /** With doubles off, the number of doubles; with doubles on, 1 if there were more doubles than pairs of separate edges. */
  doubles: number;
}

/** The three stream properties of the app's test, counted as the number of offending gestures. */
export function violationsIn(run: Run, o: { hold: number; arm: number; doubleWave: boolean }): Properties {
  let motion = 0;
  let arming = 0;
  for (const { atMs, gesture } of run.gestures) {
    if (gesture !== "SINGLE_WAVE" && gesture !== "DOUBLE_WAVE") continue;
    let last: number | null = null;
    for (const m of run.motionAt) if (m <= atMs) last = m;
    if (last !== null && atMs - last < o.hold) motion++;
    if (atMs - run.startMs < o.arm) arming++;
  }
  const doubles = run.gestures.filter((g) => g.gesture === "DOUBLE_WAVE").length;
  return { motion, arming, doubles: o.doubleWave ? (doubles * 2 > run.nearEdges.length ? 1 : 0) : doubles };
}

export interface CheckReport {
  seed: number;
  streams: number;
  readings: number;
  /** Streams with at least one violation, per property. */
  failing: Properties & { singleWave: number };
  /** The first stream that failed, so it can be replayed: its index and its derived seed. */
  first: { property: keyof Properties | "singleWave"; index: number; seed: number } | null;
  switches: Switches;
}

/**
 * Runs `streams` seeded streams under the given switches, each twice (double wave on and off, as the app's test
 * does for its third property), and counts the streams that break each property. The expectations are always the
 * app's numbers (1 s arm delay, 0.8 s hold, single wave never answers): a switch that is off is a rule that is
 * not there, and the check says what that lets through.
 */
export function runCheck(seed: number, streams: number, sw: Switches): CheckReport {
  const failing = { motion: 0, arming: 0, doubles: 0, singleWave: 0 };
  let first: CheckReport["first"] = null;
  const settings = settingsFor(sw);
  for (let i = 0; i < streams; i++) {
    const s = streamSeed(seed, i);
    const hit = { motion: false, arming: false, doubles: false, singleWave: false };
    for (const doubleWave of [true, false]) {
      const run = randomRun(s, { doubleWave, hold: MOTION_HOLD_MS, arm: sw.arming ? ARM_DELAY_MS : 0, window: WINDOW_MS, guard: sw.motionGuard });
      const v = violationsIn(run, { hold: MOTION_HOLD_MS, arm: ARM_DELAY_MS, doubleWave });
      if (v.motion) hit.motion = true;
      if (v.arming) hit.arming = true;
      if (v.doubles) hit.doubles = true;
      for (const g of run.gestures) {
        const a = actionFor(g.gesture, settings, sw.singleWaveRule);
        if (g.gesture === "SINGLE_WAVE" && (a === "answer" || a === "end")) hit.singleWave = true;
      }
    }
    for (const key of ["motion", "arming", "doubles", "singleWave"] as const) {
      if (hit[key]) {
        failing[key]++;
        first ??= { property: key, index: i, seed: s };
      }
    }
  }
  return { seed, streams, readings: STREAM_READINGS, failing, first, switches: { ...sw } };
}
