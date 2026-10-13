"use client";

import { useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { SPRING, magnetTransform } from "@/lib/motion";

type Props = {
  href: string;
  className?: string;
  children: React.ReactNode;
};

/**
 * Primary CTA with a subtle pull toward the pointer (hard-capped in
 * lib/motion.ts: ≤1.15 scale, ≤8px travel). Mouse and pen only; touch and
 * reduced-motion users get a plain link.
 */
export default function Magnetic({ href, className, children }: Props) {
  const ref = useRef<HTMLAnchorElement>(null);
  const reduce = useReducedMotion();
  const { stiffness, damping, mass } = SPRING.magnet;
  const x = useSpring(useMotionValue(0), { stiffness, damping, mass });
  const y = useSpring(useMotionValue(0), { stiffness, damping, mass });
  const scale = useSpring(useMotionValue(1), { stiffness, damping, mass });

  const onMove = (e: React.PointerEvent<HTMLAnchorElement>) => {
    if (reduce || e.pointerType === "touch" || !ref.current) return;
    const t = magnetTransform(e.clientX, e.clientY, ref.current.getBoundingClientRect());
    x.set(t.x);
    y.set(t.y);
    scale.set(t.scale);
  };
  const onLeave = () => {
    x.set(0);
    y.set(0);
    scale.set(1);
  };

  return (
    <motion.a
      ref={ref}
      href={href}
      className={className}
      style={{ x, y, scale }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      whileTap={reduce ? undefined : { scale: 0.97 }}
    >
      {children}
    </motion.a>
  );
}
