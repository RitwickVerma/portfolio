import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ALL_ON,
  ARM_DELAY_MS,
  MOTION_HOLD_MS,
  REACH,
  STREAM_READINGS,
  MAX_BUILD_MS,
  describeOutcome,
  layout,
  randomRun,
  readingsOf,
  replay,
  runCheck,
  streamSeed,
  violationsIn,
  buildEndMs,
  Rng,
  type Step,
  type Switches,
} from "./shutupStreams";

// WaveSafetyPropertyTest, ported. The app runs 400 seeds per property through Kotlin's Random; these run
// 400 seeds per property through a seeded generator of my own (Rng), so the streams are not the app's but the
// shape and the assertions are. The same seed always gives the same stream: no clock, no Math.random.

const seeds = (n: number) => Array.from({ length: n }, (_, i) => streamSeed(0, i));

describe("WaveSafetyPropertyTest (ported)", () => {
  it("no wave counts while the phone is moving or just stopped moving", () => {
    const hold = 800;
    seeds(400).forEach((seed, i) => {
      const run = randomRun(seed, { doubleWave: i % 2 === 0, hold, arm: 1_000, window: 1_000, guard: true });
      for (const { atMs, gesture } of run.gestures) {
        if (gesture !== "SINGLE_WAVE" && gesture !== "DOUBLE_WAVE") continue;
        const lastMotion = [...run.motionAt].reverse().find((m) => m <= atMs);
        expect(lastMotion === undefined || atMs - lastMotion >= hold, `seed ${i}: ${gesture} at ${atMs}, motion at ${lastMotion}`).toBe(true);
      }
    });
  });

  it("no wave counts before the arm delay", () => {
    seeds(400).forEach((seed, i) => {
      const run = randomRun(seed, { doubleWave: i % 2 === 0, hold: 800, arm: 1_500, window: 1_000, guard: true });
      for (const { atMs, gesture } of run.gestures) {
        if (gesture !== "SINGLE_WAVE" && gesture !== "DOUBLE_WAVE") continue;
        // a single wave fires after its window, a double on its second edge; both after the arm delay
        expect(atMs - run.startMs >= 1_500, `seed ${i}: ${gesture} at ${atMs}`).toBe(true);
      }
    });
  });

  it("a double wave needs two separate waves and never appears when the double wave is off", () => {
    seeds(400).forEach((seed, i) => {
      const off = randomRun(seed, { doubleWave: false, hold: 800, arm: 1_000, window: 1_000, guard: true });
      expect(off.gestures.map((g) => g.gesture)).not.toContain("DOUBLE_WAVE");
      const on = randomRun(seed, { doubleWave: true, hold: 800, arm: 1_000, window: 1_000, guard: true });
      const doubles = on.gestures.filter((g) => g.gesture === "DOUBLE_WAVE").length;
      expect(doubles * 2, `seed ${i}`).toBeLessThanOrEqual(on.nearEdges.length);
    });
  });
});

describe("the generator", () => {
  it("is deterministic: one seed, one stream", () => {
    const o = { doubleWave: true, hold: 800, arm: 1_000, window: 1_200, guard: true };
    expect(randomRun(12345, o)).toEqual(randomRun(12345, o));
    expect(randomRun(12345, o)).not.toEqual(randomRun(12346, o));
  });

  it("makes streams that are not trivial: waves, doubles and motion all occur", () => {
    const runs = seeds(400).map((s) => randomRun(s, { doubleWave: true, hold: 800, arm: 1_000, window: 1_200, guard: true }));
    expect(runs.filter((r) => r.gestures.some((g) => g.gesture === "SINGLE_WAVE")).length).toBeGreaterThan(100);
    expect(runs.filter((r) => r.gestures.some((g) => g.gesture === "DOUBLE_WAVE")).length).toBeGreaterThan(20);
    expect(runs.filter((r) => r.motionAt.length > 0).length).toBeGreaterThan(300);
  });

  it("draws from [0, 1) and spreads evenly enough to mean something", () => {
    const r = new Rng(1);
    const xs = Array.from({ length: 10_000 }, () => r.next());
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThan(1);
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean).toBeGreaterThan(0.49);
    expect(mean).toBeLessThan(0.51);
  });

  it("keeps Math.random out of the code it tests", () => {
    for (const f of ["shutup.ts", "shutupStreams.ts"]) expect(readFileSync(join(__dirname, f), "utf8")).not.toMatch(/Math\s*\.\s*random/);
  });
});

describe("runCheck: the check the figure runs", () => {
  it("finds no violation with every rule on, in 1000 streams", () => {
    const r = runCheck(7, 1000, ALL_ON);
    expect(r.failing).toEqual({ motion: 0, arming: 0, doubles: 0, singleWave: 0 });
    expect(r.first).toBeNull();
    expect(r.streams).toBe(1000);
    expect(r.readings).toBe(STREAM_READINGS);
  });

  // A passing test must be able to fail: each switch, turned off, must be caught by its own property.
  it("catches the motion guard being off", () => {
    const r = runCheck(7, 400, { ...ALL_ON, motionGuard: false });
    expect(r.failing.motion).toBeGreaterThan(0);
    expect(r.failing.arming).toBe(0);
    expect(r.first?.property).toBe("motion");
  });

  it("catches the arming delay being off", () => {
    const r = runCheck(7, 400, { ...ALL_ON, arming: false });
    expect(r.failing.arming).toBeGreaterThan(0);
    expect(r.failing.motion).toBe(0);
  });

  it("catches a single wave that answers", () => {
    const r = runCheck(7, 400, { ...ALL_ON, singleWaveRule: false });
    expect(r.failing.singleWave).toBeGreaterThan(0);
    expect(r.failing.motion).toBe(0);
  });

  it("a failing stream reproduces from the seed it reports", () => {
    const r = runCheck(7, 400, { ...ALL_ON, motionGuard: false });
    const again = randomRun(r.first!.seed, { doubleWave: true, hold: MOTION_HOLD_MS, arm: ARM_DELAY_MS, window: 1_200, guard: false });
    const other = randomRun(r.first!.seed, { doubleWave: false, hold: MOTION_HOLD_MS, arm: ARM_DELAY_MS, window: 1_200, guard: false });
    const bad = (run: typeof again, doubleWave: boolean) => violationsIn(run, { hold: MOTION_HOLD_MS, arm: ARM_DELAY_MS, doubleWave }).motion > 0;
    expect(bad(again, true) || bad(other, false)).toBe(true);
  });

  it("is the same answer twice, and a different seed is a different answer", () => {
    const sw = { ...ALL_ON, arming: false };
    expect(runCheck(7, 200, sw)).toEqual(runCheck(7, 200, sw));
    expect(runCheck(8, 200, sw).failing.arming).not.toBe(runCheck(7, 200, sw).failing.arming);
  });
});

describe("the reach, replayed", () => {
  const sw = (over: Partial<Switches> = {}): Switches => ({ ...ALL_ON, ...over });
  const refusals = (s: Switches) => replay(REACH, s).entries.filter((e) => e.verb === "refused");

  it("is refused by every rule that is on, so the call keeps ringing", () => {
    const r = replay(REACH, sw());
    expect(r.outcome).toEqual({ kind: "ringing" });
    expect(r.actions).toEqual([]);
    expect(refusals(sw()).map((e) => [e.atMs, e.rule])).toEqual([
      [300, "arming"],
      [1750, "motion"],
    ]);
  });

  it("answers at 1.75 s when only the motion guard is off", () => {
    const r = replay(REACH, sw({ motionGuard: false }));
    expect(r.outcome).toEqual({ kind: "answered", atMs: 1750 });
    expect(r.actions.map((a) => a.gesture)).toEqual(["DOUBLE_WAVE"]);
  });

  it("answers at 1.20 s when only the arming delay is off: the guard cannot see the grab yet", () => {
    const r = replay(REACH, sw({ arming: false }));
    expect(r.outcome).toEqual({ kind: "answered", atMs: 1200 });
    // once the call is answered the wave detector's story is over
    expect(Math.max(...r.entries.map((e) => e.atMs))).toBe(1200);
  });

  it("answers at 1.20 s with a single wave when only the single-wave rule is off", () => {
    const r = replay(REACH, sw({ singleWaveRule: false }));
    expect(r.outcome).toEqual({ kind: "answered", atMs: 1200 });
    expect(r.actions.map((a) => a.gesture)).toEqual(["SINGLE_WAVE"]);
  });

  it("with the guard on, the jolt drops the pending single and mutes waves for 0.8 s", () => {
    const r = replay(REACH, sw());
    const held = r.entries.find((e) => e.rule === "motion" && e.verb === "fired")!;
    expect(held.atMs).toBe(1350);
    expect(held.text).toContain("2.15 s");
    expect(held.text).toContain("pending single wave dropped");
    expect(r.bands).toEqual([
      { rule: "arming", fromMs: 0, toMs: ARM_DELAY_MS },
      { rule: "motion", fromMs: 1350, toMs: 1350 + MOTION_HOLD_MS },
    ]);
  });

  it("with the single-wave rule off the grab comes after the answer: 1.20 s against 1.35 s", () => {
    const r = replay(REACH, { ...ALL_ON, singleWaveRule: false });
    expect(r.outcome).toEqual({ kind: "answered", atMs: 1200 });
    expect(layout(REACH).jolts).toEqual([1350]);
  });

  it("a lone wave after the arm delay silences once the window runs out, and never answers", () => {
    const steps: Step[] = [{ kind: "far", ms: 1200 }, { kind: "near", ms: 250 }, { kind: "far", ms: 250 }];
    const r = replay(steps, sw());
    expect(r.outcome).toEqual({ kind: "silenced", atMs: 1200 + 1200 });
    expect(describeOutcome(r.outcome)).toContain("still ringing");
  });

  it("a double wave answers", () => {
    const steps: Step[] = [
      { kind: "far", ms: 1200 },
      { kind: "near", ms: 250 },
      { kind: "far", ms: 250 },
      { kind: "near", ms: 250 },
    ];
    expect(replay(steps, sw()).outcome).toEqual({ kind: "answered", atMs: 1700 });
  });

  it("a pocket (NEAR from the start) never counts", () => {
    const r = replay([{ kind: "near", ms: 3000 }], sw());
    expect(r.outcome).toEqual({ kind: "ringing" });
  });

  it("an empty timeline does nothing", () => {
    expect(replay([], sw()).outcome).toEqual({ kind: "ringing" });
  });
});

describe("timelines", () => {
  it("merge adjacent steps in one state and place jolts at the cursor", () => {
    const steps: Step[] = [{ kind: "far", ms: 100 }, { kind: "far", ms: 200 }, { kind: "near", ms: 100 }, { kind: "jolt" }, { kind: "near", ms: 50 }];
    expect(layout(steps)).toEqual({
      blocks: [
        { near: false, fromMs: 0, toMs: 300 },
        { near: true, fromMs: 300, toMs: 450 },
      ],
      jolts: [400],
      endMs: 450,
    });
  });

  it("make a sensor stream that starts FAR and at rest, and reports changes only", () => {
    const r = readingsOf([{ kind: "far", ms: 100 }, { kind: "near", ms: 100 }, { kind: "near", ms: 100 }, { kind: "far", ms: 100 }]);
    expect(r.filter((x) => x.reading.type === "proximity").map((x) => [x.atMs, (x.reading as { near: boolean }).near])).toEqual([
      [0, false],
      [100, true],
      [300, false],
    ]);
  });

  it("the built reach is shorter than the longest timeline a visitor can build", () => {
    expect(buildEndMs(REACH)).toBeLessThan(MAX_BUILD_MS);

  });
});
