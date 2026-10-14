"use client";

import { motion, useReducedMotion } from "framer-motion";
import { EASE, DURATION } from "@/lib/motion";

// `amount: "some"`, not a fraction: a section taller than the viewport/amount
// (every section on a phone) could otherwise never be 30% visible and would
// stay invisible forever.
const REVEAL_VIEWPORT = { once: true, amount: "some", margin: "0px 0px -10% 0px" } as const;

/**
 * Section-level reveal: hairline sweep + content fade-up.
 * The same element tree renders for every visitor; reduced motion turns the
 * initial state off (content simply appears) instead of swapping trees, which
 * would disagree with the server HTML and could leave sections hidden.
 */
export default function SectionReveal({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();

  return (
    <div>
      <motion.div
        initial={reduce ? false : { scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={REVEAL_VIEWPORT}
        transition={{ duration: DURATION.slow, ease: EASE.outExpo }}
        className="h-px bg-gradient-to-r from-accent/60 via-accent/20 to-transparent mb-12 origin-left"
      />
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={REVEAL_VIEWPORT}
        transition={{ duration: DURATION.base, ease: EASE.outQuart }}
      >
        {children}
      </motion.div>
    </div>
  );
}
