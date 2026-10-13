"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

// xterm (~300 kB) loads only when the section is about to scroll into view.
const TerminalBody = dynamic(() => import("@/components/TerminalSection"), {
  ssr: false,
});

export default function TerminalWrapper() {
  const slotRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = slotRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // Deferred, not synchronous, to stay out of the effect body.
      const t = setTimeout(() => setNear(true), 0);
      return () => clearTimeout(t);
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          obs.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="terminal" className="max-w-3xl mx-auto px-6 py-24 sm:py-32">
      <h2 className="font-mono text-accent text-sm mb-6 tracking-widest uppercase">
        Terminal
      </h2>

      <div className="rounded-lg overflow-hidden glass glow-border">
        <div className="relative flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.03]">
          <span className="w-3 h-3 rounded-full bg-white/15" aria-hidden="true" />
          <span className="w-3 h-3 rounded-full bg-white/15" aria-hidden="true" />
          <span className="w-3 h-3 rounded-full bg-white/15" aria-hidden="true" />
          <span className="absolute left-1/2 -translate-x-1/2 text-xs font-mono text-muted tracking-widest select-none">
            terminal
          </span>
        </div>

        {/* Reserved height: no layout shift when xterm mounts. */}
        <div
          ref={slotRef}
          role="region"
          aria-label="Interactive terminal"
          className="h-[420px] w-full bg-[#0a0a0f]"
        >
          {near ? (
            <TerminalBody />
          ) : (
            <p className="p-4 font-mono text-sm text-muted">
              ritwick@portfolio:~$ <span className="text-fg/80">help</span>
            </p>
          )}
        </div>
      </div>

      <p className="mt-3 text-xs text-muted font-mono">
        Click to type · Tab completes · Esc leaves the terminal
      </p>
    </section>
  );
}
