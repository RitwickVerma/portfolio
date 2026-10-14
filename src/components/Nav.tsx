"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useScroll } from "framer-motion";
import { SPRING, DURATION, EASE } from "@/lib/motion";
import { socialLinks } from "@/lib/data";

const sections = [
  { id: "hero", label: "Home" },
  { id: "about", label: "About" },
  { id: "projects", label: "Projects" },
  { id: "keyboard", label: "Keyboard" },
  { id: "notes", label: "Notes" },
  { id: "homelab", label: "Homelab" },
  { id: "terminal", label: "Terminal" },
];
// Terminal tracks scroll (so Homelab is not highlighted over it) but has no link.
const links = sections.filter((s) => s.id !== "hero" && s.id !== "terminal");

export default function Nav() {
  // On the home page every item is a same-document hash and the active one
  // follows scroll. Elsewhere the items point back at "/#id", except Notes,
  // which has its own pages and is active on them.
  const pathname = usePathname();
  const home = pathname === "/";
  const onNotes = pathname.startsWith("/notes");
  const hrefFor = (id: string) => (id === "notes" && !home ? "/notes/" : home ? `#${id}` : `/#${id}`);
  const isActive = (id: string) => (home ? active === id : id === "notes" && onNotes);

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

  // Active section = the last one whose top has crossed 40% of the viewport.
  // Scroll-based (not IntersectionObserver): the pinned hero never leaves the
  // viewport, so an observer would never hand the highlight back to it.
  useEffect(() => {
    if (!home) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const band = window.innerHeight * 0.4;
      let current = sections[0].id;
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= band) current = s.id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [home]);

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
          ? "bg-background/85 backdrop-blur-xl border-b border-border"
          : "bg-transparent"
      }`}
      onBlur={(e) => {
        // Tabbing out of the open menu closes it.
        if (open && !e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          href={home ? "#hero" : "/"}
          aria-current={home && active === "hero" ? "location" : undefined}
          className="font-mono text-accent text-sm tracking-wider py-3 -my-3 hover:opacity-80 transition-opacity"
        >
          ritwickverma<span className="text-muted">.dev</span>
        </Link>

        {/* Inline links from 640px up */}
        <ul className="hidden md:flex items-center gap-1">
          {links.map((s) => (
            <li key={s.id}>
              <Link
                href={hrefFor(s.id)}
                aria-current={isActive(s.id) ? (home ? "location" : "page") : undefined}
                className={`relative block px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  isActive(s.id) ? "text-accent" : "text-muted hover:text-fg"
                }`}
              >
                {s.label}
                {isActive(s.id) && (
                  <motion.span
                    layoutId="nav-active"
                    transition={SPRING.snappy}
                    className="absolute left-3 right-3 -bottom-0.5 h-px bg-accent"
                  />
                )}
              </Link>
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
          className="md:hidden p-3 -mr-3 text-muted hover:text-fg"
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
            className="md:hidden border-b border-border px-6 py-3 flex flex-col"
          >
            {links.map((s) => (
              <Link
                key={s.id}
                href={hrefFor(s.id)}
                onClick={() => setOpen(false)}
                aria-current={isActive(s.id) ? (home ? "location" : "page") : undefined}
                className={`px-3 py-3 rounded-lg text-base ${
                  isActive(s.id) ? "text-accent" : "text-fg/80 hover:text-fg"
                }`}
              >
                {s.label}
              </Link>
            ))}
            <Link
              href={socialLinks.resume}
              onClick={() => setOpen(false)}
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
