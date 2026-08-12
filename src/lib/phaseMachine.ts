// Double-click boot-sequence phase machine.
// Phases: 0=off, 1=power-on, 2=running, 3=glitch, 4=power-off.
// Each phase holds for a fixed duration, then advances (4 wraps to 0).
export const PHASE_DURATIONS = [0, 0.4, 5.5, 0.8, 0.4] as const;

export interface PhaseState {
  phase: number;
  timer: number;
}

export const IDLE: PhaseState = { phase: 0, timer: 0 };

/** Advance the phase machine by dt seconds. Pure — returns a new state. */
export function advancePhase(state: PhaseState, dt: number): PhaseState {
  if (state.phase === 0) return state;
  const timer = state.timer + dt;
  const duration = PHASE_DURATIONS[state.phase] ?? 0;
  if (timer >= duration) {
    const phase = state.phase >= 4 ? 0 : state.phase + 1;
    return { phase, timer: 0 };
  }
  return { phase: state.phase, timer };
}

/** 0-1 progress within the current phase (0 when idle). */
export function phaseProgress(state: PhaseState): number {
  if (state.phase === 0) return 0;
  const duration = PHASE_DURATIONS[state.phase] ?? 1;
  return Math.min(state.timer / duration, 1);
}
