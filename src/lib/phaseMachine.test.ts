import { describe, it, expect } from "vitest";
import {
  advancePhase,
  phaseProgress,
  PHASE_DURATIONS,
  IDLE,
} from "./phaseMachine";

describe("phaseMachine", () => {
  it("stays idle when phase is 0", () => {
    const state = advancePhase(IDLE, 10);
    expect(state.phase).toBe(0);
    expect(state.timer).toBe(0);
  });

  it("advances 0 → 1 → 2 → 3 → 4 → 0 with correct durations", () => {
    // Start the boot sequence (double-click when idle)
    let state = { phase: 1, timer: 0 };

    // Phase 1 (power-on): 0.4s
    state = advancePhase(state, 0.2);
    expect(state.phase).toBe(1);
    state = advancePhase(state, 0.2);
    expect(state.phase).toBe(2);
    expect(state.timer).toBe(0);

    // Phase 2 (running): 5.5s
    state = advancePhase(state, 5.5);
    expect(state.phase).toBe(3);

    // Phase 3 (glitch): 0.8s
    state = advancePhase(state, 0.8);
    expect(state.phase).toBe(4);

    // Phase 4 (power-off): 0.4s → wraps to idle
    state = advancePhase(state, 0.4);
    expect(state.phase).toBe(0);
    expect(state.timer).toBe(0);
  });

  it("does not advance before the phase duration elapses", () => {
    let state = { phase: 1, timer: 0 };
    state = advancePhase(state, PHASE_DURATIONS[1] - 0.01);
    expect(state.phase).toBe(1);
    expect(state.timer).toBeCloseTo(PHASE_DURATIONS[1] - 0.01);
  });

  it("wraps from phase 4 back to 0 (idle), not to a 5th phase", () => {
    const state = advancePhase({ phase: 4, timer: PHASE_DURATIONS[4] }, 0.01);
    expect(state.phase).toBe(0);
  });

  it("caps dt-driven overshoot correctly at phase boundaries", () => {
    // A large dt should still only advance one phase, not skip.
    const state = advancePhase({ phase: 1, timer: 0 }, 100);
    expect(state.phase).toBe(2);
    expect(state.timer).toBe(0);
  });
});

describe("phaseProgress", () => {
  it("returns 0 when idle", () => {
    expect(phaseProgress(IDLE)).toBe(0);
  });

  it("returns fractional progress within a phase", () => {
    expect(phaseProgress({ phase: 1, timer: 0.2 })).toBeCloseTo(0.5);
  });

  it("clamps progress to 1.0 at the boundary", () => {
    expect(phaseProgress({ phase: 1, timer: 1.0 })).toBe(1);
  });
});
