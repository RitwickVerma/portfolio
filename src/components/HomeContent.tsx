"use client";

import { useEffect, type CSSProperties } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import AboutSection from "@/components/AboutSection";
import ProjectsSection from "@/components/ProjectsSection";
import HomelabSection from "@/components/HomelabSection";
import SectionReveal from "@/components/SectionReveal";
import HeroSceneWrapper from "@/components/HeroSceneWrapper";
import TerminalWrapper from "@/components/TerminalWrapper";
import Magnetic from "@/components/Magnetic";
import { sceneState } from "@/lib/sceneState";
import { EASE } from "@/lib/motion";
import { hero, socialLinks } from "@/lib/data";

/** One masked line of the hero reveal — per line, never per word. CSS-driven so text never waits on JS. */
function Line({ i, className, children }: { i: number; className?: string; children: React.ReactNode }) {
  return (
    <span className="line-mask">
      <span className={className} style={{ "--i": i } as CSSProperties}>
        {children}
      </span>
    </span>
  );
}

export default function HomeContent() {
  // Pin the hero for one full viewport of scroll: 200vh wrapper, sticky hero.
  // Fade over that first 100vh by mapping scrollY (px) against viewport height.
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, (y) => {
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    return 1 - Math.min(Math.max(y / vh, 0), 1) * 0.7;
  });

  // Feed scroll progress (0-1 across the hero pin window) into the 3D scene.
  useEffect(() => {
    const onScroll = () => {
      const vh = window.innerHeight || 1;
      sceneState.scroll = Math.min(Math.max(window.scrollY / vh, 0), 1);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative">
      <div className="h-[200vh] print:h-auto">
        <motion.section
          id="hero"
          style={{ opacity }}
          className="sticky top-0 h-screen overflow-hidden print:static print:h-auto"
        >
          <HeroSceneWrapper />

          {/* Scrim: keeps the name readable over whatever the scene is doing. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none z-[5] print:hidden"
            style={{
              background:
                "radial-gradient(ellipse 60% 42% at 50% 50%, rgba(10,10,15,0.84) 0%, rgba(10,10,15,0.6) 45%, rgba(10,10,15,0) 100%)",
            }}
          />

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 px-6">
            <h1 className="text-display leading-[1.05] font-bold tracking-tight text-fg text-center">
              <Line i={0}>{hero.name}</Line>
            </h1>
            <p className="mt-5 text-center text-balance text-xl sm:text-3xl font-medium tracking-tight text-fg">
              <Line i={1}>{hero.line}</Line>
              <Line i={2} className="text-fg/80">
                {hero.lineTwo}
              </Line>
            </p>
            <p className="mt-4 font-mono text-xs sm:text-sm text-muted text-center">
              <Line i={3}>{hero.roles}</Line>
            </p>

            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mt-9 pointer-events-auto">
              <Magnetic
                href="#projects"
                className="px-6 py-2.5 rounded-lg bg-accent text-[#0a0a0f] text-sm font-medium hover:bg-accent/90 transition-colors"
              >
                See the work
              </Magnetic>
              <Link
                href={socialLinks.resume}
                className="px-6 py-2.5 rounded-lg border border-white/20 text-fg text-sm hover:border-accent/50 hover:text-accent transition-colors"
              >
                Resume
              </Link>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0f] to-transparent pointer-events-none z-10" />

          <motion.div
            aria-hidden="true"
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 scroll-indicator motion-reduce:hidden"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: EASE.inOutCubic }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64ffda" strokeWidth="1.5">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </motion.div>
        </motion.section>
      </div>

      <div className="relative z-10">
        <SectionReveal><AboutSection /></SectionReveal>
        <SectionReveal><ProjectsSection /></SectionReveal>
        <SectionReveal><HomelabSection /></SectionReveal>
        <SectionReveal><TerminalWrapper /></SectionReveal>
      </div>
    </div>
  );
}
