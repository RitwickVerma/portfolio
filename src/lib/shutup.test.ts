import { describe, it, expect } from "vitest";
import {
  FakeClock,
  WaveDetector,
  PickupDetector,
  FaceDownDetector,
  HingeDetector,
  LightWaveSignal,
  MotionGuard,
  Proximity,
  GestureSession,
  gestureConfig,
  needsSensors,
  normalized,
  actionFor,
  safeForSingleWave,
  ringingConfig,
  GESTURE_ACTIONS,
  type WaveEvent,
  type PickupEvent,
  type FaceDownEvent,
  type HingeEvent,
  type Gesture,
  type GestureConfig,
  type WaveTrace,
} from "./shutup";

// The vectors below are the unit tests of the Kotlin app (app/src/test/.../domain/gesture/*Test.kt),
// one for one, with the Kotlin test name above each. A port that disagrees with the app fails here.

describe("WaveDetectorTest", () => {
  const clock = new FakeClock(10_000);
  let events: WaveEvent[];
  // minFarMs = 0 keeps the timing tests about the double window; the chatter filter has its own tests.
  const detector = (doubleEnabled = true, windowMs = 1200, minFarMs = 0) =>
    new WaveDetector({ doubleWindowMs: windowMs, doubleEnabled, clock, onEvent: (e) => events.push(e), minFarMs });
  const wave = (d: WaveDetector) => {
    d.onProximity(true);
    d.onProximity(false);
  };
  const fresh = () => {
    clock.now = 10_000;
    events = [];
  };

  it("starting NEAR is ignored until a FAR reading is seen", () => {
    fresh();
    const d = detector(false);
    d.onProximity(true);
    d.onProximity(true);
    expect(events).toEqual([]);
    d.onProximity(false);
    d.onProximity(true);
    expect(events).toEqual(["single"]);
  });

  it("doubleEnabled=false fires Single immediately on each edge", () => {
    fresh();
    const d = detector(false);
    d.onProximity(false);
    wave(d);
    wave(d);
    expect(events).toEqual(["single", "single"]);
    expect(d.tick()).toBeNull();
  });

  it("sustained NEAR is one edge, not many", () => {
    fresh();
    const d = detector(false);
    d.onProximity(false);
    d.onProximity(true);
    d.onProximity(true);
    d.onProximity(true);
    expect(events).toEqual(["single"]);
  });

  it("single wave is deferred and fires through tick after the window", () => {
    fresh();
    const d = detector();
    d.onProximity(false);
    wave(d);
    expect(events).toEqual([]);
    expect(d.tick()).toBe(1200);
    clock.advance(600);
    expect(d.tick()).toBe(600);
    expect(events).toEqual([]);
    clock.advance(600);
    expect(d.tick()).toBeNull();
    expect(events).toEqual(["single"]);
    expect(d.tick()).toBeNull();
    expect(events).toHaveLength(1);
  });

  it("second wave inside the window fires Double and cancels the Single", () => {
    fresh();
    const d = detector();
    d.onProximity(false);
    wave(d);
    clock.advance(500);
    wave(d);
    expect(events).toEqual(["double"]);
    clock.advance(5_000);
    expect(d.tick()).toBeNull();
    expect(events).toEqual(["double"]);
  });

  it("second wave after the window starts a new single", () => {
    fresh();
    const d = detector();
    d.onProximity(false);
    wave(d);
    clock.advance(1200);
    wave(d); // exactly at the deadline: not "before", so the overdue single flushes and a fresh window starts
    expect(events).toEqual(["single"]);
    expect(d.tick()).toBe(1200);
    clock.advance(1200);
    d.tick();
    expect(events).toEqual(["single", "single"]);
  });

  it("reset clears the pending single and the FAR gate", () => {
    fresh();
    const d = detector();
    d.onProximity(false);
    wave(d);
    d.reset();
    clock.advance(5_000);
    expect(d.tick()).toBeNull();
    expect(events).toEqual([]);
    d.onProximity(true); // NEAR right after reset must not count
    clock.advance(5_000);
    d.tick();
    expect(events).toEqual([]);
  });

  it("a FAR blip shorter than minFarMs is chatter, not a second wave", () => {
    fresh();
    const d = detector(false, 1200, 60);
    d.onProximity(false);
    clock.advance(200);
    d.onProximity(true);
    expect(events).toEqual(["single"]);
    d.onProximity(false); // sensor flickers while the hand is still there
    clock.advance(20);
    d.onProximity(true);
    expect(events).toHaveLength(1);
    d.onProximity(false); // the hand really leaves and comes back
    clock.advance(300);
    d.onProximity(true);
    expect(events).toHaveLength(2);
  });

  it("repeated FAR readings do not restart the FAR timer", () => {
    fresh();
    const d = detector(false, 1200, 60);
    d.onProximity(false);
    clock.advance(50);
    d.onProximity(false);
    clock.advance(50);
    d.onProximity(true);
    expect(events).toEqual(["single"]);
  });

  it("waves inside the arm delay are ignored and later ones count", () => {
    fresh();
    const d = new WaveDetector({ doubleWindowMs: 1200, doubleEnabled: false, clock, onEvent: (e) => events.push(e), minFarMs: 0, armAfterMs: 1_000 });
    d.onProximity(false);
    clock.advance(300);
    wave(d);
    expect(events).toEqual([]);
    clock.advance(1_000);
    wave(d);
    expect(events).toEqual(["single"]);
  });

  it("holdOff drops a pending single and ignores waves until the deadline", () => {
    fresh();
    const d = detector();
    d.onProximity(false);
    wave(d);
    d.holdOff(clock.nowMs() + 500);
    clock.advance(2_000);
    expect(d.tick()).toBeNull();
    expect(events).toEqual([]);
    d.onProximity(false);
    clock.advance(100);
    d.onProximity(true);
    expect(d.tick()).toBe(1200); // after the hold-off a wave counts again
  });

  it("a sensor that reports nothing while FAR still lets the first wave count", () => {
    fresh();
    const d = detector(false);
    clock.advance(2_000); // no reading at all since the detector started
    d.onProximity(true); // the first thing the sensor ever says: a hand
    expect(events).toEqual(["single"]);
  });

  it("a NEAR reported right at start is the starting state, not a wave", () => {
    fresh();
    const d = detector(false);
    clock.advance(50); // inside the silent-start window: the sensor's initial report
    d.onProximity(true);
    d.onProximity(true);
    expect(events).toEqual([]);
  });

  it("a NEAR after earlier readings and no FAR is still ignored", () => {
    fresh();
    const d = detector(false);
    d.onProximity(true); // starting state: near (pocket)
    clock.advance(5_000);
    d.onProximity(true);
    expect(events).toEqual([]);
  });
});

describe("the trace the figure reads", () => {
  it("names why an edge was refused without changing what the detector does", () => {
    const clock = new FakeClock(0);
    const seen: WaveTrace[] = [];
    const events: WaveEvent[] = [];
    const d = new WaveDetector({ doubleWindowMs: 1200, doubleEnabled: false, clock, onEvent: (e) => events.push(e), armAfterMs: 1_000, trace: (t) => seen.push(t) });
    d.onProximity(true); // pocket
    d.onProximity(false);
    clock.advance(30);
    d.onProximity(true); // 30 ms of FAR
    d.onProximity(false);
    clock.advance(200);
    d.onProximity(true); // 230 ms, still arming
    d.holdOff(2_000);
    d.onProximity(false);
    clock.advance(1_000);
    d.onProximity(true); // 1.26 s: past arming, inside the hold-off
    expect(seen.filter((t) => t.kind === "refused").map((t) => (t as { reason: string }).reason)).toEqual(["no-far", "chatter", "arming", "motion"]);
    expect(events).toEqual([]);
  });
});

describe("PickupDetectorTest", () => {
  const clock = new FakeClock(50_000);
  let events: PickupEvent[];
  const make = () => {
    clock.now = 50_000;
    events = [];
    return new PickupDetector({ clock, onEvent: (e) => events.push(e) });
  };
  const flat = (d: PickupDetector, z = 9.8) => d.onAccel(0.2, -0.1, z);
  /** Feeds flat readings every 100 ms until settleMs has elapsed, then one more flat reading. */
  const settle = (d: PickupDetector, settleMs = 500) => {
    let elapsed = 0;
    while (elapsed < settleMs) {
      flat(d);
      clock.advance(100);
      elapsed += 100;
    }
    flat(d);
  };

  it("nothing fires while settling", () => {
    const d = make();
    flat(d);
    clock.advance(200);
    d.onAccel(0, 0, 14); // big Δz but still inside the settle window
    expect(events).toEqual([]);
  });

  it("lift by delta z after settling fires PickedUp", () => {
    const d = make();
    settle(d);
    expect(events).toEqual([]);
    d.onAccel(0, 0, 13); // Δz = 3.2 ≥ 3
    expect(events).toEqual(["picked-up"]);
  });

  it("small jitter after settling does not fire", () => {
    const d = make();
    settle(d);
    d.onAccel(0.5, 0.5, 10.5);
    d.onAccel(-0.5, 0.2, 9.2);
    expect(events).toEqual([]);
  });

  it("tilt that breaks the flat condition fires PickedUp", () => {
    const d = make();
    settle(d);
    d.onAccel(4, 0, 9.5); // |x| > 3
    expect(events).toEqual(["picked-up"]);
  });

  it("face down flat also counts as flat and lifting from it fires", () => {
    const d = make();
    let elapsed = 0;
    while (elapsed <= 500) {
      d.onAccel(0, 0, -9.8);
      clock.advance(100);
      elapsed += 100;
    }
    d.onAccel(0, 0, -9.8);
    d.onAccel(0, 0, -6); // Δz 3.8
    expect(events).toEqual(["picked-up"]);
  });

  it("moving during the settle window disarms the detector", () => {
    const d = make();
    flat(d);
    clock.advance(100);
    d.onAccel(5, 0, 7); // not flat inside settle window
    clock.advance(500);
    flat(d);
    flat(d);
    d.onAccel(0, 0, 14); // would be a lift if armed
    d.onAccel(6, 0, 2);
    expect(events).toEqual([]);
  });

  it("not flat when the settle window ends never arms", () => {
    const d = make();
    clock.advance(600);
    d.onAccel(5, 5, 5); // first reading after window, not flat
    d.onAccel(0, 0, 14);
    expect(events).toEqual([]);
  });

  it("fires exactly once until reset", () => {
    const d = make();
    settle(d);
    d.onAccel(0, 0, 13);
    d.onAccel(5, 5, 2);
    d.onAccel(0, 0, 13);
    expect(events).toEqual(["picked-up"]);
    d.reset();
    settle(d);
    d.onAccel(0, 0, 13);
    expect(events).toEqual(["picked-up", "picked-up"]);
  });
});

describe("FaceDownDetectorTest", () => {
  const clock = new FakeClock(5_000);
  let events: FaceDownEvent[];
  let detector: FaceDownDetector;
  const setup = () => {
    clock.now = 5_000;
    events = [];
    detector = new FaceDownDetector({ clock, onEvent: (e) => events.push(e), holdMs: 400 });
  };
  const faceDownPose = () => detector.onAccel(0, 0, -9.8);

  it("face down needs proximity NEAR plus the pose held for holdMs", () => {
    setup();
    detector.onProximity(true);
    faceDownPose();
    expect(events).toEqual([]);
    clock.advance(399);
    faceDownPose();
    expect(events).toEqual([]);
    clock.advance(1);
    faceDownPose();
    expect(events).toEqual(["face-down"]);
  });

  it("proximity FAR prevents detection", () => {
    setup();
    detector.onProximity(false);
    faceDownPose();
    clock.advance(1_000);
    faceDownPose();
    expect(events).toEqual([]);
  });

  it("lifting after face down emits Lifted once", () => {
    setup();
    detector.onProximity(true);
    faceDownPose();
    clock.advance(500);
    faceDownPose();
    detector.onAccel(0, 9.8, 0);
    detector.onAccel(0, 9.8, 0);
    expect(events).toEqual(["face-down", "lifted"]);
  });

  it("breaking the pose before holdMs restarts the timer", () => {
    setup();
    detector.onProximity(true);
    faceDownPose();
    clock.advance(300);
    detector.onAccel(5, 0, -8);
    clock.advance(300);
    faceDownPose();
    expect(events).toEqual([]);
    clock.advance(400);
    faceDownPose();
    expect(events).toEqual(["face-down"]);
  });

  it("reset forgets state", () => {
    setup();
    detector.onProximity(true);
    faceDownPose();
    clock.advance(500);
    faceDownPose();
    detector.reset();
    expect(events).toEqual(["face-down"]);
    faceDownPose();
    expect(events).toHaveLength(1);
  });
});

describe("HingeDetectorTest", () => {
  let events: HingeEvent[];
  let detector: HingeDetector;
  const setup = () => {
    events = [];
    detector = new HingeDetector((e) => events.push(e));
  };

  it("closing only counts after the device was seen open", () => {
    setup();
    detector.onAngle(5);
    expect(events).toEqual([]);
    detector.onAngle(150);
    detector.onAngle(60);
    detector.onAngle(10);
    expect(events).toEqual(["closed"]);
  });

  it("fires once per close and re-arms on reopen", () => {
    setup();
    detector.onAngle(170);
    detector.onAngle(0);
    detector.onAngle(0);
    expect(events).toHaveLength(1);
    detector.onAngle(120);
    detector.onAngle(15);
    expect(events).toHaveLength(2);
  });

  it("reset forgets the armed state", () => {
    setup();
    detector.onAngle(170);
    detector.reset();
    detector.onAngle(0);
    expect(events).toEqual([]);
  });
});

describe("ProximityTest", () => {
  it("binary sensors are near at 0 and far at their maximum range", () => {
    expect(Proximity.isNear(0, 5)).toBe(true);
    expect(Proximity.isNear(5, 5)).toBe(false);
    expect(Proximity.isNear(0, 1)).toBe(true);
    expect(Proximity.isNear(1, 1)).toBe(false);
  });

  it("long-range sensors use the 5 cm threshold, not their range", () => {
    // A sensor with a 10 cm range reporting 8 cm is far; comparing to maxRange would call it near forever.
    expect(Proximity.isNear(8, 10)).toBe(false);
    expect(Proximity.isNear(4.9, 10)).toBe(true);
  });

  it("negative and NaN readings are never near", () => {
    expect(Proximity.isNear(-1, 5)).toBe(false);
    expect(Proximity.isNear(NaN, 5)).toBe(false);
  });
});

describe("LightWaveSignalTest", () => {
  let signal: LightWaveSignal;
  let now: number;
  const setup = () => {
    signal = new LightWaveSignal();
    now = 0;
  };
  const lux = (value: number, afterMs = 50) => {
    now += afterMs;
    return signal.onLux(value, now);
  };

  it("a short dip under the baseline is NEAR and recovery is FAR", () => {
    setup();
    for (let i = 0; i < 5; i++) lux(200);
    expect(lux(40)).toBe(true);
    expect(lux(60)).toBe(true); // still well under the baseline
    expect(lux(190)).toBe(false);
  });

  it("small fluctuations are not waves", () => {
    setup();
    for (let i = 0; i < 5; i++) lux(200);
    expect(lux(130)).toBe(false);
    expect(lux(210)).toBe(false);
  });

  it("a long cover is not a wave and the baseline relearns", () => {
    setup();
    for (let i = 0; i < 5; i++) lux(200);
    expect(lux(5)).toBe(true);
    expect(lux(5, 2_000)).toBe(false); // covered for 2 s: pocket or lights off
    expect(lux(5)).toBe(false); // the dark room is the new baseline, too dark to judge
    expect(lux(1)).toBe(false);
  });

  it("too dark a room reports nothing", () => {
    setup();
    for (let i = 0; i < 5; i++) lux(5);
    expect(lux(0)).toBe(false);
  });

  it("invalid readings are ignored and reset forgets the baseline", () => {
    setup();
    for (let i = 0; i < 5; i++) lux(200);
    expect(lux(NaN)).toBe(false);
    expect(lux(-3)).toBe(false);
    expect(lux(30)).toBe(true);
    signal.reset();
    expect(signal.near).toBe(false);
    expect(lux(30)).toBe(false); // first reading after reset only sets the baseline
  });
});

describe("MotionGuardTest", () => {
  it("a phone lying still or lightly held is not moving", () => {
    const guard = new MotionGuard();
    for (let i = 0; i < 50; i++) expect(guard.onAccel(0.1 * (i % 3), -0.1, 9.8)).toBe(false);
    for (let i = 0; i < 50; i++) expect(guard.onAccel(0.5, 0.4 * (i % 2), 9.6)).toBe(false); // hand tremor
  });

  it("lifting is motion because total acceleration leaves gravity", () => {
    const guard = new MotionGuard();
    expect(guard.onAccel(0, 0, 9.81)).toBe(false);
    expect(guard.onAccel(0, 0, 12.5)).toBe(true);
  });

  it("a sudden jump between readings is motion even at normal gravity", () => {
    const guard = new MotionGuard();
    expect(guard.onAccel(0, 0, 9.81)).toBe(false);
    expect(guard.onAccel(9.81, 0, 0)).toBe(true); // rotated 90 degrees at once
  });

  it("NaN readings are ignored", () => {
    const guard = new MotionGuard();
    expect(guard.onAccel(NaN, 0, 9.8)).toBe(false);
  });
});

describe("GestureSessionTest", () => {
  const clock = new FakeClock(50_000);
  let gestures: Gesture[];
  const session = (config: GestureConfig) => {
    clock.now = 50_000;
    gestures = [];
    return new GestureSession(config, clock, (g) => gestures.push(g));
  };
  const near = (s: GestureSession, n: boolean) => s.onReading({ type: "proximity", near: n });
  const accel = (s: GestureSession, x: number, y: number, z: number) => s.onReading({ type: "accel", x, y, z });
  const light = (s: GestureSession, lux: number) => s.onReading({ type: "light", lux });

  it("waves only, single wave fires immediately without double", () => {
    const s = session(gestureConfig({ waves: true, waveArmDelayMs: 0 }));
    near(s, false);
    clock.advance(200);
    expect(near(s, true)).toBeNull();
    expect(gestures).toEqual(["SINGLE_WAVE"]);
  });

  it("with double wave the session asks for a tick and tick fires the single", () => {
    const s = session(gestureConfig({ waves: true, doubleWave: true, doubleWaveWindowMs: 1_000, waveArmDelayMs: 0 }));
    near(s, false);
    clock.advance(200);
    expect(near(s, true)).toBe(1_000);
    clock.advance(1_000);
    expect(s.tick()).toBeNull();
    expect(gestures).toEqual(["SINGLE_WAVE"]);
  });

  it("disabled detectors ignore their readings", () => {
    const s = session(gestureConfig({ pickup: true }));
    near(s, false);
    clock.advance(200);
    near(s, true);
    s.onReading({ type: "hinge", degrees: 170 });
    s.onReading({ type: "hinge", degrees: 5 });
    expect(gestures).toEqual([]);
    expect(needsSensors(gestureConfig())).toBe(false);
  });

  it("face down and lifted are reported", () => {
    const s = session(gestureConfig({ faceDown: true }));
    near(s, true);
    accel(s, 0, 0, -9.8);
    clock.advance(500);
    accel(s, 0, 0, -9.8);
    accel(s, 0, 9.8, 0);
    expect(gestures).toEqual(["FACE_DOWN", "LIFTED"]);
  });

  it("fold closing and pickup are reported", () => {
    const s = session(gestureConfig({ pickup: true, fold: true }));
    s.onReading({ type: "hinge", degrees: 170 });
    s.onReading({ type: "hinge", degrees: 5 });
    accel(s, 0, 0, 9.8);
    clock.advance(600);
    accel(s, 0, 0, 9.8);
    accel(s, 4, 6, 6);
    expect(gestures).toEqual(["FOLD_CLOSED", "PICKED_UP"]);
    s.rearmPickup();
    accel(s, 0, 0, 9.8);
    clock.advance(600);
    accel(s, 0, 0, 9.8);
    accel(s, 4, 6, 6);
    expect(gestures).toHaveLength(3);
  });

  it("light assist turns a shadow into a wave while proximity stays clear", () => {
    const s = session(gestureConfig({ waves: true, lightAssist: true, waveArmDelayMs: 0 }));
    near(s, false);
    for (let i = 0; i < 5; i++) {
      clock.advance(50);
      light(s, 300);
    }
    clock.advance(50);
    light(s, 20);
    expect(s.waveNear).toBe(true);
    expect(gestures).toEqual(["SINGLE_WAVE"]);
    clock.advance(100);
    light(s, 290);
    expect(s.waveNear).toBe(false);
  });

  it("light readings before the first proximity report never count", () => {
    const s = session(gestureConfig({ waves: true, lightAssist: true, waveArmDelayMs: 0 }));
    for (let i = 0; i < 5; i++) {
      clock.advance(50);
      light(s, 300);
    }
    clock.advance(50);
    light(s, 20);
    expect(s.waveNear).toBeNull();
    near(s, true); // phone came out of a pocket still covered: no FAR seen yet
    expect(gestures).toEqual([]);
  });

  it("without light assist light readings are ignored", () => {
    const s = session(gestureConfig({ waves: true, waveArmDelayMs: 0 }));
    near(s, false);
    for (let i = 0; i < 5; i++) {
      clock.advance(50);
      light(s, 300);
    }
    clock.advance(50);
    light(s, 5);
    expect(s.waveNear).toBe(false);
    expect(gestures).toEqual([]);
  });

  it("waves right after ringing starts are ignored, later ones count", () => {
    const s = session(gestureConfig({ waves: true }));
    near(s, false);
    clock.advance(100);
    near(s, true);
    clock.advance(100);
    near(s, false); // the hand that reached for the phone, 200 ms in
    expect(gestures).toEqual([]);
    clock.advance(1_000);
    near(s, true);
    expect(gestures).toEqual(["SINGLE_WAVE"]);
  });

  it("moving the phone drops a pending single wave and mutes waves for a moment", () => {
    const s = session(gestureConfig({ waves: true, doubleWave: true, doubleWaveWindowMs: 1_000, waveArmDelayMs: 0 }));
    accel(s, 0, 0, 9.81);
    near(s, false);
    clock.advance(200);
    expect(near(s, true)).toBe(1_000); // first wave of a possible double
    clock.advance(100);
    accel(s, 2, 5, 12); // the phone is grabbed
    clock.advance(1_000);
    expect(s.tick()).toBeNull();
    expect(gestures).toEqual([]); // the pending single wave was cancelled
    near(s, false);
    clock.advance(200);
    near(s, true); // a wave while the hold-off is still running
    expect(gestures).toEqual([]);
  });

  it("a hand waved over a phone lying still is not motion", () => {
    const s = session(gestureConfig({ waves: true, waveArmDelayMs: 0 }));
    for (let i = 0; i < 20; i++) accel(s, 0.1, -0.1, 9.8);
    near(s, false);
    clock.advance(200);
    near(s, true);
    expect(gestures).toEqual(["SINGLE_WAVE"]);
  });

  it("waves count again once the motion hold-off has passed", () => {
    const s = session(gestureConfig({ waves: true, waveArmDelayMs: 0, motionHoldMs: 500 }));
    accel(s, 0, 0, 9.81);
    accel(s, 3, 6, 13);
    clock.advance(600);
    near(s, false);
    clock.advance(200);
    near(s, true);
    expect(gestures).toEqual(["SINGLE_WAVE"]);
  });
});

describe("the single-wave rule", () => {
  // WaveSafetyPropertyTest: `settings can never hold answer or end on the single wave`
  it("settings can never hold answer or end on the single wave", () => {
    for (const single of GESTURE_ACTIONS)
      for (const double of GESTURE_ACTIONS) {
        const n = normalized({ singleWave: single, doubleWave: double, doubleWaveWindowMs: 1200 });
        expect(safeForSingleWave(n.singleWave)).toBe(true);
        expect(normalized(n)).toEqual(n); // idempotent
        if (!safeForSingleWave(single)) {
          expect(n.doubleWave).toBe(single); // the user's choice is kept, on the safer gesture
          expect(n.singleWave).toBe("silence");
        } else {
          expect(n).toEqual({ singleWave: single, doubleWave: double, doubleWaveWindowMs: 1200 });
        }
      }
  });

  it("the engine refuses it a second time, and version 1 did not", () => {
    const asked = { singleWave: "answer", doubleWave: "none", doubleWaveWindowMs: 1200 } as const;
    expect(actionFor("SINGLE_WAVE", asked)).toBe("none");
    expect(actionFor("SINGLE_WAVE", asked, false)).toBe("answer");
    expect(actionFor("DOUBLE_WAVE", normalized(asked))).toBe("answer");
    expect(actionFor("SINGLE_WAVE", normalized(asked))).toBe("silence");
  });

  it("the ringing config follows the settings, as in SensorGestureEngine.configFor", () => {
    expect(ringingConfig({ singleWave: "silence", doubleWave: "none", doubleWaveWindowMs: 1200 })).toMatchObject({ waves: true, doubleWave: false, waveArmDelayMs: 1000, motionHoldMs: 800 });
    expect(ringingConfig({ singleWave: "silence", doubleWave: "answer", doubleWaveWindowMs: 900 })).toMatchObject({ waves: true, doubleWave: true, doubleWaveWindowMs: 900 });
    expect(ringingConfig({ singleWave: "none", doubleWave: "none", doubleWaveWindowMs: 1200 }).waves).toBe(false);
  });
});
