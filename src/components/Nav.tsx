"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useScroll } from "framer-motion";
import { SPRING, DURATION, EASE } from "@/lib/motion";
import { socialLinks } from "@/lib/data";

const sections = [
  { id: "hero", label: "Home" },
  { id: "about", label: "About" },
  { id: "projects", label: "Projects" },
  { id: "homelab", label: "Homelab" },
  { id: "terminal", label: "Terminal" },
];
const links = sections.slice(1);

export default function Nav() {
  const [active, setActive] = useState("hero");
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Active section = whichever one crosses a thin band at ~40% of the viewport.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { threshold: 0, rootMargin: "-40% 0px -59% 0px" },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  // Disclosure menu: focus the first link on open, Esc closes and returns
  // focus to the toggle, a click outside closes.
  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !toggleRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <nav
      aria-label="Primary"
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        scrolled || open
          ? "bg-[#0a0a0f]/85 backdrop-blur-xl border-b border-white/[0.06]"
          : "bg-transparent"
      }`}
      onBlur={(e) => {
        // Tabbing out of the open menu closes it.
        if (open && !e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a
          href="#hero"
          aria-current={active === "hero" ? "location" : undefined}
          className="font-mono text-accent text-sm tracking-wider hover:opacity-80 transition-opacity"
        >
          ritwickverma<span className="text-muted">.dev</span>
        </a>

        {/* Inline links from 640px up */}
        <ul className="hidden sm:flex items-center gap-1">
          {links.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={active === s.id ? "location" : undefined}
                className={`relative block px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  active === s.id ? "text-accent" : "text-muted hover:text-fg"
                }`}
              >
                {s.label}
                {active === s.id && (
                  <motion.span
                    layoutId="nav-active"
                    transition={SPRING.snappy}
                    className="absolute left-3 right-3 -bottom-0.5 h-px bg-accent"
                  />
                )}
              </a>
            </li>
          ))}
          <li>
            <Link
              href={socialLinks.resume}
              className="ml-2 block px-4 py-1.5 rounded-lg border border-accent/30 text-accent text-sm hover:bg-accent/10 transition-colors"
            >
              Resume
            </Link>
          </li>
        </ul>

        {/* Menu button below 640px */}
        <button
          ref={toggleRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="sm:hidden p-2 -mr-2 text-muted hover:text-fg"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            {open ? (
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" />
            ) : (
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" />
            )}
          </svg>
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            id="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: DURATION.fast, ease: EASE.outQuart }}
            className="sm:hidden border-b border-white/[0.06] px-6 py-3 flex flex-col"
          >
            {links.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={() => setOpen(false)}
                aria-current={active === s.id ? "location" : undefined}
                className={`px-3 py-3 rounded-lg text-base ${
                  active === s.id ? "text-accent" : "text-fg/80 hover:text-fg"
                }`}
              >
                {s.label}
              </a>
            ))}
            <Link
              href={socialLinks.resume}
              className="px-3 py-3 rounded-lg text-base text-accent"
            >
              Resume
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll progress: thin, raw (no smoothing) so it never lags the page. */}
      <motion.div
        aria-hidden="true"
        className="absolute left-0 right-0 bottom-0 h-px bg-accent origin-left"
        style={{ scaleX: scrollYProgress }}
      />
    </nav>
  );
}
