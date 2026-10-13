"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const NAV = [
  { href: "/#work", label: "Work" },
  { href: "/#principles", label: "Principles" },
  { href: "/resume/", label: "Resume" },
  { href: "/#contact", label: "Contact" },
];

/** The site header, set as a drawing's title block. */
export default function TitleBlock() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const nav = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    nav.current?.querySelector("a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="titleblock">
      <div className="frame titleblock-grid" style={{ position: "relative" }}>
        <div className="tb-cell">
          <Link href="/" className="tb-mark" aria-label="Ritwick Verma — home">
            Ritwick Verma<span className="hide-xs">RV-01</span>
          </Link>
        </div>
        <div className="tb-cell tb-meta label" aria-hidden="true">
          <span>Index of work</span>
          <span>3 case studies · 4 sheets</span>
          <span>Rev. {process.env.BUILD_DATE}</span>
        </div>
        <div style={{ display: "flex" }}>
          <button
            ref={btn}
            className="tb-menu"
            aria-expanded={open}
            aria-controls="site-nav"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Close" : "Menu"}
          </button>
          <nav id="site-nav" ref={nav} aria-label="Primary" className={`tb-nav${open ? " open" : ""}`}>
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                aria-current={pathname === n.href ? "page" : undefined}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
