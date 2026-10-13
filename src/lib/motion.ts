// Canonical motion language for the whole site.
// One easing system, one rhythm. Every transition imports from here —
// reviewers notice cohesion; we notice reduced-motion + perf.
//
// globals.css mirrors EASE/DURATION as CSS custom properties for the one thing
// that must not wait on JS (the hero line reveal). motion.test.ts fails if the
// two drift apart.

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

/** Seconds between siblings in a choreographed group. */
export const STAGGER = {
  tight: 0.06,
  base: 0.1,
  /** Hero lines: one beat per line, never per word. */
  line: 0.09,
} as const;

export const SPRING = {
  /** Nav indicator, small UI that should settle fast */
  snappy: { type: "spring", stiffness: 420, damping: 32, mass: 0.6 },
  /** Card tilt */
  soft: { type: "spring", stiffness: 200, damping: 20 },
  /** Magnetic CTA: loose enough to feel pulled, damped enough not to wobble */
  magnet: { type: "spring", stiffness: 220, damping: 18, mass: 0.5 },
} as const;

const fadeUpDistance = 20;

export const VARIANTS = {
  stagger: {
    hidden: {},
    show: { transition: { staggerChildren: STAGGER.base } },
  },
  fadeUp: {
    hidden: { opacity: 0, y: fadeUpDistance },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: DURATION.base, ease: EASE.outExpo },
    },
  },
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

/** Magnetic CTA limits. `maxScale` is the hard ceiling (1.15); we sit well under it. */
export const MAGNET = {
  maxScale: 1.15,
  scale: 1.04,
  /** Fraction of the pointer's offset from centre the element follows. */
  pull: 0.3,
  /** Never move further than this, in px. */
  maxPx: 8,
} as const;

/**
 * Where a magnetic element should sit for a pointer at (px, py) relative to
 * its box. Pure — the component only feeds it pointer events.
 */
export function magnetTransform(
  px: number,
  py: number,
  rect: { left: number; top: number; width: number; height: number },
): { x: number; y: number; scale: number } {
  const dx = px - (rect.left + rect.width / 2);
  const dy = py - (rect.top + rect.height / 2);
  const clamp = (v: number) => Math.max(-MAGNET.maxPx, Math.min(MAGNET.maxPx, v));
  return {
    x: clamp(dx * MAGNET.pull),
    y: clamp(dy * MAGNET.pull),
    scale: Math.min(MAGNET.scale, MAGNET.maxScale),
  };
}
