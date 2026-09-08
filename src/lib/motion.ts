// Canonical motion language for the whole site.
// One easing system, one rhythm. Every transition imports from here —
// reviewers notice cohesion; we notice reduced-motion + perf.

export const EASE = {
  /** Snappy UI feedback: hovers, active states */
  outQuart: [0.25, 1, 0.5, 1] as const,
  /** Section entrances: fast arrival, long settle */
  outExpo: [0.16, 1, 0.3, 1] as const,
  /** Strong statements: hero lines */
  outQuint: [0.22, 1, 0.36, 1] as const,
  /** Soft, editorial: reveals, content fades */
  inOutCubic: [0.65, 0, 0.35, 1] as const,
} as const;

export const DURATION = {
  instant: 0.12,
  fast: 0.24,
  base: 0.45,
  slow: 0.7,
} as const;

export const MOTION = {
  reduce: { opacity: 1, y: 0, scale: 1 } as const,
  fadeUp: (delay = 0, distance = 40) => ({
    initial: { opacity: 0, y: distance },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.25 } as const,
    transition: { duration: DURATION.base, delay, ease: EASE.outExpo },
  }),
} as const;
