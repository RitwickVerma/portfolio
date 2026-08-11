"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const sections = [
  { id: "hero", label: "Home" },
  { id: "about", label: "About" },
  { id: "projects", label: "Projects" },
  { id: "homelab", label: "Homelab" },
  { id: "terminal", label: "Terminal" },
];

export default function Nav() {
  const [active, setActive] = useState("hero");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setActive(e.target.id);
          }
        }
      },
      { threshold: 0.3, rootMargin: "-80px 0px 0px 0px" },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/[0.06]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <button
          onClick={() => scrollTo("hero")}
          className="font-mono text-accent text-sm tracking-wider hover:opacity-80 transition-opacity"
        >
          ritwickverma<span className="text-muted">.dev</span>
        </button>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {sections.slice(1).map((s) => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                active === s.id
                  ? "text-accent bg-accent/10"
                  : "text-muted hover:text-fg hover:bg-white/[0.04]"
              }`}
            >
              {s.label}
            </button>
          ))}
          <a
            href="https://raw.githubusercontent.com/RitwickVerma/Resume/master/resume_ATS-letter.pdf"
            className="ml-2 px-4 py-1.5 rounded-lg border border-accent/30 text-accent text-sm hover:bg-accent/10 transition-all"
          >
            Resume
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-muted hover:text-fg"
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            {mobileOpen ? (
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" />
            ) : (
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden bg-[#0a0a0f]/95 backdrop-blur-xl border-b border-white/[0.06] px-6 py-4 flex flex-col gap-1"
          >
            {sections.slice(1).map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={`px-3 py-2 rounded-lg text-sm text-left transition-all ${
                  active === s.id
                    ? "text-accent bg-accent/10"
                    : "text-muted hover:text-fg"
                }`}
              >
                {s.label}
              </button>
            ))}
            <a
              href="https://raw.githubusercontent.com/RitwickVerma/Resume/master/resume_ATS-letter.pdf"
              className="px-3 py-2 text-sm text-accent hover:bg-accent/10 rounded-lg"
            >
              Resume →
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
