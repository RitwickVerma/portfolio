"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  KEYS, BOARD_W, BOARD_H, COL_GPIOS, ROW_GPIOS,
  keyForCode, keyId, codesForChar, applyKey, charForTap, DEMO_TEXT, type Key,
} from "@/lib/crush80";

// The keyboard, drawn from the matrix the firmware scans. Focus it and type:
// the switch your key lands on lights, the column strobe and row sense line
// that read it light with it, and the readout above the caption shows the
// line you are typing. Idle, it types the site's name to itself.
//
// SVG in key units; one unit = one letter cap. No images.

const U = 40; // px per key unit
const GAP = 3; // px between caps
const PAD = 14;
const W = BOARD_W * U + PAD * 2;
const H = BOARD_H * U + PAD * 2;

const DECAY_MS = 420;
const DEMO_INTERVAL_MS = 170;
const DEMO_IDLE_MS = 2400;
/** The finished demo line sits on screen this long before it clears and starts over. */
const DEMO_HOLD_MS = 2200;

/** Keys the browser would act on while the board has focus. Tab is not here: it must keep moving focus. */
const SWALLOW = new Set(["Space", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Backquote", "Backspace", "Enter"]);

type Lit = Map<string, number>; // keyId → time lit

export default function Crush80() {
  const [lit, setLit] = useState<Lit>(new Map());
  // Render-time clock advanced by the frame loop; render never reads the real clock.
  const [now, setNow] = useState(0);
  const [last, setLast] = useState<Key | null>(null);
  const [line, setLine] = useState("");
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const idleSince = useRef(0);
  const demoIndex = useRef(0);
  const reduce = useRef(false);

  // Both are stable (state setters and refs only), so effects can depend on them.
  const light = useCallback((k: Key, t: number) => {
    setLast(k);
    setLit((m) => new Map(m).set(keyId(k), t));
  }, []);

  /** A real press: light the switch and edit the line. */
  const press = useCallback((k: Key, key: string, code: string) => {
    idleSince.current = performance.now();
    light(k, idleSince.current);
    setLine((l) => applyKey(l, key, code));
  }, [light]);

  useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const onKey = (e: KeyboardEvent) => {
      if (!focused) return;
      const k = keyForCode(e.code);
      if (!k) return;
      // Plain keys only. Shortcuts with a modifier (Ctrl+F, Cmd+L) stay the browser's.
      const plain = !e.ctrlKey && !e.metaKey && !e.altKey;
      if (!plain) return;
      if (SWALLOW.has(e.code) || e.key.length === 1) e.preventDefault();
      press(k, e.key, e.code);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focused, press]);

  // The loop only exists while the board is on screen.
  useEffect(() => {
    const el = boardRef.current;
    if (!el || typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "80px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // One frame loop: decay lit keys; when nobody has typed for a while, type the demo.
  useEffect(() => {
    if (!visible) return;
    let raf = 0;
    let lastDemo = 0;
    const tick = () => {
      const t = performance.now();
      let anyLit = false;
      setLit((m) => {
        let changed = false;
        const next = new Map(m);
        for (const [id, at] of next) if (t - at > DECAY_MS) { next.delete(id); changed = true; }
        anyLit = next.size > 0;
        return changed ? next : m;
      });
      if (anyLit) setNow(t);
      if (!reduce.current && !focused && t - idleSince.current > DEMO_IDLE_MS) {
        const i = demoIndex.current;
        const atEnd = i >= DEMO_TEXT.length;
        // Hold the finished line, then clear and start over.
        const gap = atEnd ? DEMO_HOLD_MS : DEMO_INTERVAL_MS;
        if (t - lastDemo > gap) {
          lastDemo = t;
          if (atEnd) {
            demoIndex.current = 0;
            setLine("");
          } else {
            const ch = DEMO_TEXT[i];
            demoIndex.current = i + 1;
            const code = codesForChar(ch)[0];
            const k = code ? keyForCode(code) : undefined;
            if (k) light(k, t);
            // A new cycle starts from an empty line, never from what a visitor left behind.
            setLine((l) => applyKey(i === 0 ? "" : l, ch, code ?? ""));
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [focused, visible, light]);

  const litKeys = KEYS.filter((k) => lit.has(keyId(k))).map((k) => ({ k, a: Math.max(0, 1 - (now - (lit.get(keyId(k)) ?? now)) / DECAY_MS) }));

  return (
    <div className="w-full">
      {/* Readout: the line being typed. Demo output lands here too, so the ghost typing is legible. */}
      <div
        className="mb-3 flex items-baseline gap-3 font-mono text-sm"
        aria-label="Typed line"
      >
        <span aria-hidden="true" className="text-muted select-none">&gt;</span>
        <span className="min-h-[1.5em] whitespace-pre text-fg" data-testid="readout">
          {line}
          <span aria-hidden="true" className={`inline-block w-[0.55em] h-[1.1em] align-[-0.2em] ml-px ${focused ? "bg-accent" : "bg-fg/40"} motion-safe:animate-pulse`} />
        </span>
      </div>

      <div className="relative">
        <div
          ref={boardRef}
          tabIndex={0}
          role="group"
          aria-label="Crush 80 keyboard matrix. Focus and type: the switch lights and the typed line shows above."
          onFocus={() => {
            setFocused(true);
            demoIndex.current = 0;
            setLine("");
          }}
          onBlur={() => {
            setFocused(false);
            idleSince.current = performance.now();
            demoIndex.current = 0;
          }}
          className="rounded-xl glass outline-none focus-visible:ring-2 focus-visible:ring-accent/60 overflow-x-auto"
        >
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto min-w-[600px] select-none" aria-hidden="true">
            {/* For each lit key: the column strobe through it and the row sense line through it. */}
            {litKeys.map(({ k, a }) => {
              const cx = PAD + (k.x + k.w / 2) * U;
              const cy = PAD + (k.y + (k.h ?? 1) / 2) * U;
              return (
                <g key={`lines-${keyId(k)}`} stroke="var(--accent)" strokeWidth={1} strokeOpacity={0.35 * a}>
                  <line x1={cx} x2={cx} y1={PAD} y2={H - PAD} />
                  <line x1={PAD} x2={W - PAD} y1={cy} y2={cy} />
                </g>
              );
            })}

            {KEYS.map((k) => {
              const t = lit.get(keyId(k));
              const a = t === undefined ? 0 : Math.max(0, 1 - (now - t) / DECAY_MS);
              const x = PAD + k.x * U + GAP / 2;
              const y = PAD + k.y * U + GAP / 2;
              const w = k.w * U - GAP;
              const h = (k.h ?? 1) * U - GAP;
              return (
                <g
                  key={keyId(k)}
                  className="cursor-pointer"
                  onPointerDown={(e) => {
                    // A tap is a press: Backspace and Enter edit, caps insert their character.
                    e.preventDefault();
                    boardRef.current?.focus();
                    const code = k.codes[0] ?? "";
                    press(k, charForTap(k) ?? code, code);
                  }}
                >
                  <rect x={x} y={y} width={w} height={h} rx={5} fill="var(--accent)" fillOpacity={0.04 + a * 0.5} stroke="var(--accent)" strokeOpacity={0.12 + a * 0.6} strokeWidth={1} />
                  <text x={x + 7} y={y + 15} fontSize={k.label.length > 4 ? 8.5 : 10.5} fontFamily="var(--font-mono)" fill="var(--fg)" fillOpacity={0.55 + a * 0.45}>
                    {k.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        {/* Phones scroll the board sideways; the fade says so. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-xl bg-gradient-to-l from-background to-transparent sm:hidden" />
      </div>

      <p className="mt-3 font-mono text-xs text-muted">
        {last
          ? `${last.codes[0] ?? last.label} · RC(${last.r},${last.c}) · column ${COL_GPIOS[last.c]} strobed, row ${ROW_GPIOS[last.r]} sensed`
          : focused
            ? "Type. Backspace deletes, Enter clears the line."
            : "Type on it or tap a key. Each press shows its matrix position and the two GPIO lines the firmware reads it through."}
      </p>
    </div>
  );
}
