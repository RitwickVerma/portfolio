"use client";

import { motion, useReducedMotion } from "framer-motion";
import { EASE, DURATION } from "@/lib/motion";

// `amount: "some"`, not a fraction: a section taller than the viewport/amount
// (every section on a phone) could otherwise never be 30% visible and would
// stay invisible forever.
const REVEAL_VIEWPORT = { once: true, amount: "some", margin: "0px 0px -10% 0px" } as const;

/**
 * Section-level reveal: hairline sweep + content fade-up.
 * Honors prefers-reduced-motion (content appears, nothing moves).
 */
export default function SectionReveal({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <div>
        <div className="h-px bg-gradient-to-r from-accent/60 via-accent/20 to-transparent mb-12 origin-left" />
        <div>{children}</div>
      </div>
    );
  }

  return (
    <div>
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={REVEAL_VIEWPORT}
        transition={{ duration: DURATION.slow, ease: EASE.outExpo }}
        className="h-px bg-gradient-to-r from-accent/60 via-accent/20 to-transparent mb-12 origin-left"
      />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={REVEAL_VIEWPORT}
        transition={{ duration: DURATION.base, ease: EASE.outQuart }}
      >
        {children}
      </motion.div>
    </div>
  );
}
