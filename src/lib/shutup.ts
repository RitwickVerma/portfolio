// A TypeScript port of the gesture domain in ShutUp!, the Android app:
// domain/gesture/{Detectors,MotionGuard,GestureSession,Proximity,GestureEvents}.kt
// and the single-wave rule from domain/model/Models.kt and
// service/SensorGestureEngine.kt (gitlab.com/ritwick7/shutup, release 2.0.6).
//
// The Kotlin detectors are pure state machines with an injected clock, which is
// what makes a port possible: nothing here touches Android, a timer or a thread.
// Method names, defaults and branch order follow the Kotlin line for line, and
// src/lib/shutup.test.ts replays the app's own unit tests against it.
//
// Two things differ, on purpose:
// - Kotlin Float is 32-bit. The thresholds in MotionGuard, PickupDetector and
//   LightWaveSignal are compared in float32 here too (Math.fround).
// - WaveDetector and GestureSession take an optional `trace` callback that is
//   told why a NEAR edge was refused. It only reports; no branch reads it.

/** Monotonic clock, in milliseconds. */
export interface Clock {
  nowMs(): number;
}

/** A clock the caller moves by hand. Mirrors the app's FakeClock test helper. */
export class FakeClock implements Clock {
  constructor(public now = 0) {}
  nowMs(): number {
    return this.now;
  }
  advance(ms: number): void {
    this.now += ms;
  }
}

const f32 = Math.fround;

// ─── Events ──────────────────────────────────────────────────────────────

export type WaveEvent = "single" | "double";
export type PickupEvent = "picked-up";
export type FaceDownEvent = "face-down" | "lifted";
export type HingeEvent = "closed";

/** A recognised gesture, independent of what the user mapped it to. */
export type Gesture = "SINGLE_WAVE" | "DOUBLE_WAVE" | "PICKED_UP" | "FACE_DOWN" | "LIFTED" | "FOLD_CLOSED";

/** Why a FAR to NEAR edge did not count as a wave. */
export type Refusal = "no-far" | "chatter" | "arming" | "motion";

export type WaveTrace =
  /** A FAR to NEAR edge counted. `then` is what it did: fire at once, open the double window, complete a double, or flush an overdue single first. */
  | { kind: "counted"; atMs: number; then: "single" | "waiting" | "double" | "flushed"; windowEndsMs: number | null }
  | { kind: "refused"; atMs: number; reason: Refusal; untilMs?: number; farMs?: number }
  /** holdOff was called: waves are muted until `untilMs` (as asked; an arming delay may last longer); `dropped` says a pending single wave went with it. */
  | { kind: "held"; atMs: number; untilMs: number; dropped: boolean };

export type SessionTrace = WaveTrace | { kind: "motion"; atMs: number };

// ─── WaveDetector ────────────────────────────────────────────────────────

export interface WaveDetectorOptions {
  doubleWindowMs: number;
  doubleEnabled: boolean;
  clock: Clock;
  onEvent: (event: WaveEvent) => void;
  /** The sensor must read FAR this long before the next NEAR counts; filters sensor chatter. */
  minFarMs?: number;
  /** Waves are ignored this long after the detector starts: the hand that just reached the ringing phone. */
  armAfterMs?: number;
  trace?: (t: WaveTrace) => void;
}

/**
 * Detects single and double waves from proximity NEAR/FAR edges.
 *
 * A wave is a FAR to NEAR edge. If the first reading is NEAR (pocket, face down) nothing counts until a FAR has
 * been seen. The FAR before the edge must have lasted at least minFarMs. If doubles are off every wave is a
 * Single at once; otherwise the first wave opens a window of doubleWindowMs, a second inside it is a Double and
 * cancels the pending single, and a window that runs out fires the Single through tick().
 */
export class WaveDetector {
  /** Real hands leave the sensor for well over 60 ms between two waves; chatter does not. */
  static readonly DEFAULT_MIN_FAR_MS = 60;
  /** A sensor that has said nothing this long after start is taken to be FAR (it reports changes only). */
  static readonly SILENT_START_MS = 400;

  private readonly doubleWindowMs: number;
  private readonly doubleEnabled: boolean;
  private readonly clock: Clock;
  private readonly onEvent: (event: WaveEvent) => void;
  private readonly minFarMs: number;
  private readonly trace?: (t: WaveTrace) => void;

  private farSinceMs: number | null = null;
  private lastNear = false;
  private pendingSingleAtMs: number | null = null;
  private readonly createdMs: number;
  private ignoreUntilMs: number;
  private ignoreBecause: "arming" | "motion" = "arming";
  private sawReading = false;

  constructor(o: WaveDetectorOptions) {
    this.doubleWindowMs = o.doubleWindowMs;
    this.doubleEnabled = o.doubleEnabled;
    this.clock = o.clock;
    this.onEvent = o.onEvent;
    this.minFarMs = o.minFarMs ?? WaveDetector.DEFAULT_MIN_FAR_MS;
    this.trace = o.trace;
    this.createdMs = this.clock.nowMs();
    this.ignoreUntilMs = this.createdMs + (o.armAfterMs ?? 0);
  }

  /**
   * Drops a pending single wave and ignores waves until untilMs. Used when the phone moves: a hand grabbing
   * the phone to use the screen looks like a wave, but is not one.
   */
  holdOff(untilMs: number): void {
    const dropped = this.pendingSingleAtMs !== null;
    this.pendingSingleAtMs = null;
    if (untilMs > this.ignoreUntilMs) {
      this.ignoreUntilMs = untilMs;
      this.ignoreBecause = "motion";
    }
    this.trace?.({ kind: "held", atMs: this.clock.nowMs(), untilMs, dropped });
  }

  /** Feed a proximity (or combined) reading. Only FAR to NEAR edges after a stable FAR count as waves. */
  onProximity(near: boolean): void {
    const now = this.clock.nowMs();
    const first = !this.sawReading;
    this.sawReading = true;
    if (!near) {
      if (this.lastNear || this.farSinceMs === null) this.farSinceMs = now;
      this.lastNear = false;
      return;
    }
    if (this.lastNear) return;
    this.lastNear = true;
    // A NEAR with no FAR before it is normally the sensor reporting its starting state (pocket, face down): ignore.
    // But an on-change sensor that sends no starting value at all is silent while FAR, and its first reading is
    // then a real hand: if nothing at all has been reported for a while, FAR is assumed.
    const farSince = this.farSinceMs ?? (first && now - this.createdMs >= WaveDetector.SILENT_START_MS ? this.createdMs : null);
    if (farSince === null) {
      this.trace?.({ kind: "refused", atMs: now, reason: "no-far" });
      return;
    }
    if (now - farSince < this.minFarMs) {
      this.trace?.({ kind: "refused", atMs: now, reason: "chatter", farMs: now - farSince }); // flicker, not a hand leaving and returning
      return;
    }
    if (now < this.ignoreUntilMs) {
      this.trace?.({ kind: "refused", atMs: now, reason: this.ignoreBecause, untilMs: this.ignoreUntilMs }); // still arming, or the phone is being moved
      return;
    }
    if (!this.doubleEnabled) {
      this.trace?.({ kind: "counted", atMs: now, then: "single", windowEndsMs: null });
      this.onEvent("single");
      return;
    }
    const pending = this.pendingSingleAtMs;
    if (pending === null) {
      this.pendingSingleAtMs = now + this.doubleWindowMs;
      this.trace?.({ kind: "counted", atMs: now, then: "waiting", windowEndsMs: this.pendingSingleAtMs });
    } else if (now < pending) {
      this.pendingSingleAtMs = null;
      this.trace?.({ kind: "counted", atMs: now, then: "double", windowEndsMs: pending });
      this.onEvent("double");
    } else {
      // The earlier single is overdue (caller ticked late): flush it, then start a new window.
      this.pendingSingleAtMs = null;
      this.trace?.({ kind: "counted", atMs: now, then: "flushed", windowEndsMs: null });
      this.onEvent("single");
      this.pendingSingleAtMs = now + this.doubleWindowMs;
    }
  }

  /** Fire a pending single wave if its window has elapsed. Returns ms until the next deadline, or null. */
  tick(): number | null {
    const pending = this.pendingSingleAtMs;
    if (pending === null) return null;
    const now = this.clock.nowMs();
    if (now >= pending) {
      this.pendingSingleAtMs = null;
      this.onEvent("single");
      return null;
    }
    return pending - now;
  }

  /** Forget the FAR gate and any pending single (call when monitoring stops or restarts). */
  reset(): void {
    this.farSinceMs = null;
    this.lastNear = false;
    this.pendingSingleAtMs = null;
    this.ignoreUntilMs = 0;
    this.ignoreBecause = "arming";
  }
}

// ─── PickupDetector ──────────────────────────────────────────────────────

export interface PickupOptions {
  clock: Clock;
  onEvent: (event: PickupEvent) => void;
  settleMs?: number;
  flatTolerance?: number;
  flatMinZ?: number;
  liftDeltaZ?: number;
}

/**
 * Detects the phone being picked up from a flat, still surface while ringing: flat and still for settleMs of
 * readings, then a z change of liftDeltaZ or any reading that breaks the flat pose, once until reset().
 */
export class PickupDetector {
  private readonly clock: Clock;
  private readonly onEvent: (event: PickupEvent) => void;
  private readonly settleMs: number;
  private readonly flatTolerance: number;
  private readonly flatMinZ: number;
  private readonly liftDeltaZ: number;
  private flatSinceMs: number | null = null;
  private settledZ: number | null = null;
  private fired = false;

  constructor(o: PickupOptions) {
    this.clock = o.clock;
    this.onEvent = o.onEvent;
    this.settleMs = o.settleMs ?? 500;
    this.flatTolerance = f32(o.flatTolerance ?? 3);
    this.flatMinZ = f32(o.flatMinZ ?? 9);
    this.liftDeltaZ = f32(o.liftDeltaZ ?? 3);
  }

  /** Feed an accelerometer reading in m/s². */
  onAccel(x: number, y: number, z: number): void {
    if (this.fired) return;
    x = f32(x);
    y = f32(y);
    z = f32(z);
    const now = this.clock.nowMs();
    const flat = Math.abs(x) <= this.flatTolerance && Math.abs(y) <= this.flatTolerance && Math.abs(z) >= this.flatMinZ;
    const settled = this.settledZ;
    if (settled === null) {
      if (!flat) {
        this.flatSinceMs = null;
        return;
      }
      if (this.flatSinceMs === null) this.flatSinceMs = now;
      if (now - this.flatSinceMs >= this.settleMs) this.settledZ = z;
      return;
    }
    if (!flat || Math.abs(f32(z - settled)) >= this.liftDeltaZ) {
      this.fired = true;
      this.onEvent("picked-up");
    }
  }

  /** Start over: the phone must settle again before another pickup can fire. */
  reset(): void {
    this.flatSinceMs = null;
    this.settledZ = null;
    this.fired = false;
  }
}

// ─── FaceDownDetector ────────────────────────────────────────────────────

export interface FaceDownOptions {
  clock: Clock;
  onEvent: (event: FaceDownEvent) => void;
  holdMs?: number;
  flatTolerance?: number;
  flatMinZ?: number;
}

/** Detects the phone lying face down during a call: NEAR, flat and z at or below minus flatMinZ, held for holdMs. */
export class FaceDownDetector {
  private readonly clock: Clock;
  private readonly onEvent: (event: FaceDownEvent) => void;
  private readonly holdMs: number;
  private readonly flatTolerance: number;
  private readonly flatMinZ: number;
  private near = false;
  private lastPose = false;
  private poseSinceMs: number | null = null;
  private isFaceDown = false;

  constructor(o: FaceDownOptions) {
    this.clock = o.clock;
    this.onEvent = o.onEvent;
    this.holdMs = o.holdMs ?? 400;
    this.flatTolerance = f32(o.flatTolerance ?? 3);
    this.flatMinZ = f32(o.flatMinZ ?? 9);
  }

  /** Feed a proximity reading, as classified by isNear. */
  onProximity(near: boolean): void {
    this.near = near;
    this.evaluate(null);
  }

  /** Feed an accelerometer reading in m/s². */
  onAccel(x: number, y: number, z: number): void {
    x = f32(x);
    y = f32(y);
    z = f32(z);
    this.evaluate(Math.abs(x) <= this.flatTolerance && Math.abs(y) <= this.flatTolerance && z <= -this.flatMinZ);
  }

  private evaluate(pose: boolean | null): void {
    if (pose !== null) this.lastPose = pose;
    const now = this.clock.nowMs();
    if (this.near && this.lastPose) {
      if (this.poseSinceMs === null) this.poseSinceMs = now;
      if (!this.isFaceDown && now - this.poseSinceMs >= this.holdMs) {
        this.isFaceDown = true;
        this.onEvent("face-down");
      }
    } else {
      this.poseSinceMs = null;
      if (this.isFaceDown) {
        this.isFaceDown = false;
        this.onEvent("lifted");
      }
    }
  }

  /** Forget pose and proximity state without emitting Lifted. */
  reset(): void {
    this.near = false;
    this.lastPose = false;
    this.poseSinceMs = null;
    this.isFaceDown = false;
  }
}

// ─── HingeDetector ───────────────────────────────────────────────────────

/** Detects a foldable being closed: seen open (at or above openDegrees), then at or below closedDegrees, once per close. */
export class HingeDetector {
  private armed = false;
  constructor(
    private readonly onEvent: (event: HingeEvent) => void,
    private readonly openDegrees = 90,
    private readonly closedDegrees = 20,
  ) {}

  onAngle(angle: number): void {
    // The Kotlin takes a Float: 89.99999999 arrives as 90f and arms.
    const degrees = Math.fround(angle);
    if (degrees >= this.openDegrees) this.armed = true;
    else if (degrees <= this.closedDegrees && this.armed) {
      this.armed = false;
      this.onEvent("closed");
    }
  }

  reset(): void {
    this.armed = false;
  }
}

// ─── Proximity and light ─────────────────────────────────────────────────

/**
 * How Android itself reads a proximity sensor: "near" is any non-negative distance below min(maximumRange, 5 cm).
 * Comparing against maximumRange alone breaks on sensors that report "far" as a value below their range.
 */
export const Proximity = {
  /** AOSP TYPICAL_PROXIMITY_THRESHOLD. */
  THRESHOLD_CM: 5,
  isNear(value: number, maximumRange: number): boolean {
    const v = f32(value);
    return !Number.isNaN(v) && v >= 0 && v < Math.min(f32(maximumRange), 5);
  },
};

export interface LightWaveOptions {
  dipRatio?: number;
  recoverRatio?: number;
  maxDipMs?: number;
  minBaselineLux?: number;
  baselineAlpha?: number;
}

/**
 * Turns ambient-light readings into a NEAR/FAR signal so a hand passing over the light sensor counts as a wave.
 * A wave is a dip below dipRatio times the recent baseline that recovers within maxDipMs; longer dips (pocket,
 * face down, lights off) are not waves and the baseline re-learns. Below minBaselineLux nothing is reported.
 */
export class LightWaveSignal {
  private readonly dipRatio: number;
  private readonly recoverRatio: number;
  private readonly maxDipMs: number;
  private readonly minBaselineLux: number;
  private readonly baselineAlpha: number;
  private baseline: number | null = null;
  private dipStartMs: number | null = null;
  /** True while a hand is over the sensor. */
  near = false;

  constructor(o: LightWaveOptions = {}) {
    this.dipRatio = f32(o.dipRatio ?? 0.4);
    this.recoverRatio = f32(o.recoverRatio ?? 0.7);
    this.maxDipMs = o.maxDipMs ?? 1500;
    this.minBaselineLux = f32(o.minBaselineLux ?? 8);
    this.baselineAlpha = f32(o.baselineAlpha ?? 0.15);
  }

  /** Feeds one reading; returns the new near value. */
  onLux(lux: number, nowMs: number): boolean {
    lux = f32(lux);
    if (Number.isNaN(lux) || lux < 0) return this.near;
    const base = this.baseline;
    if (base === null) {
      this.baseline = lux;
      return this.near;
    }
    const start = this.dipStartMs;
    if (start === null) {
      if (base >= this.minBaselineLux && lux < f32(base * this.dipRatio)) {
        this.dipStartMs = nowMs;
        this.near = true;
      } else {
        this.baseline = f32(base + f32(this.baselineAlpha * f32(lux - base))); // learn only while uncovered
      }
    } else if (lux >= f32(base * this.recoverRatio)) {
      this.dipStartMs = null;
      this.near = false;
    } else if (nowMs - start > this.maxDipMs) {
      this.dipStartMs = null;
      this.near = false;
      this.baseline = lux; // covered, not waved
    }
    return this.near;
  }

  reset(): void {
    this.baseline = null;
    this.dipStartMs = null;
    this.near = false;
  }
}

// ─── MotionGuard ─────────────────────────────────────────────────────────

const GRAVITY = f32(9.81);

/**
 * Tells "the phone is being moved" from "the phone is resting or lightly held", from accelerometer readings.
 * A reading counts as motion when the total acceleration leaves gravity by more than liftDelta m/s² (lifting or
 * swinging), or the vector jumps by more than jerk m/s² since the previous reading (a grab). A hand waved over a
 * phone on a table, or hand-tremor, stays well under both.
 */
export class MotionGuard {
  private readonly liftDelta: number;
  private readonly jerk: number;
  private px = 0;
  private py = 0;
  private pz = 0;
  private hasPrevious = false;

  constructor(liftDelta = 1.8, jerk = 3.0) {
    this.liftDelta = f32(liftDelta);
    this.jerk = f32(jerk);
  }

  /** Feed one reading in m/s²; true when it shows motion. */
  onAccel(x: number, y: number, z: number): boolean {
    if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z)) return false;
    x = f32(x);
    y = f32(y);
    z = f32(z);
    const total = f32(Math.sqrt(f32(f32(f32(x * x) + f32(y * y)) + f32(z * z))));
    const lift = Math.abs(f32(total - GRAVITY)) > this.liftDelta;
    let jerked = false;
    if (this.hasPrevious) {
      const dx = f32(x - this.px);
      const dy = f32(y - this.py);
      const dz = f32(z - this.pz);
      jerked = f32(Math.sqrt(f32(f32(f32(dx * dx) + f32(dy * dy)) + f32(dz * dz)))) > this.jerk;
    }
    this.px = x;
    this.py = y;
    this.pz = z;
    this.hasPrevious = true;
    return lift || jerked;
  }
}

// ─── GestureSession ──────────────────────────────────────────────────────

/** One sensor reading, already normalised by the sensor source. */
export type SensorReading =
  | { type: "proximity"; near: boolean }
  | { type: "accel"; x: number; y: number; z: number }
  | { type: "hinge"; degrees: number }
  | { type: "light"; lux: number };

/** Which detectors a GestureSession runs. A disabled detector ignores its readings. */
export interface GestureConfig {
  waves: boolean;
  doubleWave: boolean;
  doubleWaveWindowMs: number;
  /** Waves are ignored this long after the session starts (the hand that was reaching for the ringing phone). */
  waveArmDelayMs: number;
  /** Waves are ignored this long after the phone last moved, and a pending single wave is dropped. */
  motionHoldMs: number;
  /** Also treat a brief dip in ambient light as a wave. */
  lightAssist: boolean;
  pickup: boolean;
  faceDown: boolean;
  fold: boolean;
}

/** GestureConfig with the app's defaults. */
export function gestureConfig(over: Partial<GestureConfig> = {}): GestureConfig {
  return {
    waves: false,
    doubleWave: false,
    doubleWaveWindowMs: 1_200,
    waveArmDelayMs: 1_000,
    motionHoldMs: 800,
    lightAssist: false,
    pickup: false,
    faceDown: false,
    fold: false,
    ...over,
  };
}

export const needsSensors = (c: GestureConfig): boolean => c.waves || c.pickup || c.faceDown || c.fold;

/**
 * The one place where sensor readings become gestures. Pure and single-threaded: the caller owns the thread and
 * the timer (see onReading and tick).
 */
export class GestureSession {
  private readonly wave: WaveDetector | null;
  private readonly motion: MotionGuard | null;
  private readonly light: LightWaveSignal | null;
  private readonly pickup: PickupDetector | null;
  private readonly faceDown: FaceDownDetector | null;
  private readonly hinge: HingeDetector | null;
  private proximityNear: boolean | null = null;

  /** What the wave detector sees: proximity NEAR, or (with light assist) a light dip. Null before any reading. */
  waveNear: boolean | null = null;

  constructor(
    private readonly config: GestureConfig,
    private readonly clock: Clock,
    private readonly onGesture: (gesture: Gesture) => void,
    private readonly trace?: (t: SessionTrace) => void,
  ) {
    this.wave = config.waves
      ? new WaveDetector({
          doubleWindowMs: config.doubleWaveWindowMs,
          doubleEnabled: config.doubleWave,
          clock,
          onEvent: (event) => onGesture(event === "single" ? "SINGLE_WAVE" : "DOUBLE_WAVE"),
          armAfterMs: config.waveArmDelayMs,
          trace,
        })
      : null;
    this.motion = config.waves ? new MotionGuard() : null;
    this.light = config.waves && config.lightAssist ? new LightWaveSignal() : null;
    this.pickup = config.pickup ? new PickupDetector({ clock, onEvent: () => onGesture("PICKED_UP") }) : null;
    this.faceDown = config.faceDown ? new FaceDownDetector({ clock, onEvent: (e) => onGesture(e === "face-down" ? "FACE_DOWN" : "LIFTED") }) : null;
    this.hinge = config.fold ? new HingeDetector((e) => e === "closed" && onGesture("FOLD_CLOSED")) : null;
  }

  /** Feeds one reading. Returns ms until tick() must run, or null when no timer is needed. */
  onReading(reading: SensorReading): number | null {
    switch (reading.type) {
      case "proximity":
        this.proximityNear = reading.near;
        this.faceDown?.onProximity(reading.near);
        this.updateWave();
        break;
      case "light":
        this.light?.onLux(reading.lux, this.clock.nowMs());
        this.updateWave();
        break;
      case "accel":
        if (this.motion?.onAccel(reading.x, reading.y, reading.z) === true) {
          this.trace?.({ kind: "motion", atMs: this.clock.nowMs() });
          this.wave?.holdOff(this.clock.nowMs() + this.config.motionHoldMs);
        }
        this.pickup?.onAccel(reading.x, reading.y, reading.z);
        this.faceDown?.onAccel(reading.x, reading.y, reading.z);
        break;
      case "hinge":
        this.hinge?.onAngle(reading.degrees);
        break;
    }
    return this.wave?.tick() ?? null;
  }

  /** Fires a pending single wave whose window has passed. Returns ms until the next deadline, or null. */
  tick(): number | null {
    return this.wave?.tick() ?? null;
  }

  /** Re-arms the pickup detector, which fires once per rest on a table. */
  rearmPickup(): void {
    this.pickup?.reset();
  }

  private updateWave(): void {
    // Wait for the proximity sensor's first report: a light reading alone must not open the FAR gate
    // while the phone may be in a pocket.
    const proximity = this.proximityNear;
    if (proximity === null) return;
    const near = proximity || this.light?.near === true;
    this.waveNear = near;
    this.wave?.onProximity(near);
  }
}

// ─── The single-wave rule ────────────────────────────────────────────────

export type GestureAction = "none" | "silence" | "answer" | "end";
export const GESTURE_ACTIONS: readonly GestureAction[] = ["none", "silence", "answer", "end"];

/**
 * A single wave may only do something harmless and undoable. A hand reaching for the screen to decline passes
 * over the sensor exactly like a wave, so answering or ending on one pass picks up or hangs up by accident.
 */
export const safeForSingleWave = (a: GestureAction): boolean => a === "none" || a === "silence";

/** The two wave settings of AppSettings; the rest of the app's settings do not reach the wave rules. */
export interface WaveSettings {
  singleWave: GestureAction;
  doubleWave: GestureAction;
  doubleWaveWindowMs: number;
}

export const DEFAULT_DOUBLE_WAVE_WINDOW_MS = 1200;

/**
 * Settings that put Answer or End on the single wave are moved to the double wave, and the single wave becomes
 * Silence: the user keeps the behaviour they chose, on a safer gesture. Run on every load and save in the app.
 */
export function normalized(s: WaveSettings): WaveSettings {
  return safeForSingleWave(s.singleWave) ? s : { ...s, singleWave: "silence", doubleWave: s.singleWave };
}

/**
 * What a gesture does while the phone rings, from SensorGestureEngine.onGesture. The engine checks the rule a
 * second time ("belt and braces") even though settings are normalised on load; `enforceSingleWaveRule = false`
 * is version 1 and 2.0, which allowed Answer and End on a single wave.
 */
export function actionFor(gesture: Gesture, s: WaveSettings, enforceSingleWaveRule = true): GestureAction {
  switch (gesture) {
    case "SINGLE_WAVE":
      return enforceSingleWaveRule ? (safeForSingleWave(s.singleWave) ? s.singleWave : "none") : s.singleWave;
    case "DOUBLE_WAVE":
      return s.doubleWave;
    default:
      return "none";
  }
}

/** The GestureConfig the engine builds while ringing (SensorGestureEngine.configFor), for a phone with a proximity sensor. */
export function ringingConfig(s: WaveSettings, over: Partial<GestureConfig> = {}): GestureConfig {
  const doubleEnabled = s.doubleWave !== "none";
  return gestureConfig({
    waves: s.singleWave !== "none" || doubleEnabled,
    doubleWave: doubleEnabled,
    doubleWaveWindowMs: s.doubleWaveWindowMs,
    ...over,
  });
}
