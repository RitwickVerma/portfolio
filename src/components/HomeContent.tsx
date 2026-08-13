"use client";

import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import AboutSection from "@/components/AboutSection";
import ProjectsSection from "@/components/ProjectsSection";
import HomelabSection from "@/components/HomelabSection";
import SectionReveal from "@/components/SectionReveal";
import HeroSceneWrapper from "@/components/HeroSceneWrapper";
import TerminalWrapper from "@/components/TerminalWrapper";
import { sceneState } from "@/lib/sceneState";

export default function HomeContent() {
  // Pin the hero for one full viewport of scroll: 200vh wrapper, sticky hero.
  // Fade over that first 100vh by mapping scrollY (px) against viewport height.
  const wrapRef = useRef<HTMLDivElement>(null);
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
      <div ref={wrapRef} className="h-[200vh]">
        <motion.section
          id="hero"
          style={{ opacity }}
          className="sticky top-0 h-screen bg-grid overflow-hidden"
        >
          <HeroSceneWrapper />

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-fg mb-4 text-center px-4">
              Ritwick Verma
            </h1>
            <p className="text-muted text-sm sm:text-lg font-mono text-center px-4">
              Software Engineer &bull; Homelab Architect &bull; Builder
            </p>
            <div className="flex gap-4 mt-8 pointer-events-auto">
              <a
                href="#about"
                className="px-5 py-2 rounded-lg border border-accent/30 text-accent text-sm hover:bg-accent/10 transition-all"
              >
                About
              </a>
              <a
                href="https://raw.githubusercontent.com/RitwickVerma/Resume/master/resume_ATS-letter.pdf"
                className="px-5 py-2 rounded-lg glass text-fg/80 text-sm hover:text-fg transition-all"
              >
                Resume ↓
              </a>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0f] to-transparent pointer-events-none z-10" />

          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
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
