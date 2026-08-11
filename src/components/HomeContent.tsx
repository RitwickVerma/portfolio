"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import AboutSection from "@/components/AboutSection";
import ProjectsSection from "@/components/ProjectsSection";
import HomelabSection from "@/components/HomelabSection";
import SectionReveal from "@/components/SectionReveal";
import HeroSceneWrapper from "@/components/HeroSceneWrapper";
import TerminalWrapper from "@/components/TerminalWrapper";

gsap.registerPlugin(ScrollTrigger);

export default function HomeContent() {
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    // Pin the hero while about section scrolls over it
    ScrollTrigger.create({
      trigger: hero,
      start: "top top",
      end: "+=100%",
      pin: true,
      scrub: 0.5,
    });

    // Fade hero as it scrolls out
    ScrollTrigger.create({
      trigger: hero,
      start: "top top",
      end: "+=100%",
      onUpdate: (self) => {
        const progress = self.progress;
        hero.style.opacity = String(1 - progress * 0.7);
      },
    });

    return () => {
      ScrollTrigger.getAll().forEach((st) => st.kill());
    };
  }, []);

  return (
    <>
      {/* ── Hero ── */}
      <section
        ref={heroRef}
        id="hero"
        className="relative w-full h-screen bg-grid overflow-hidden"
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
      </section>

      <SectionReveal><AboutSection /></SectionReveal>
      <SectionReveal><ProjectsSection /></SectionReveal>
      <SectionReveal><HomelabSection /></SectionReveal>
      <SectionReveal><TerminalWrapper /></SectionReveal>
    </>
  );
}
