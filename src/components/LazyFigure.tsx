"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";

// A home-page figure that is nothing to read until the visitor scrolls to it
// (the keyboard, the ambilight, the infinite canvas). Its code is a chunk of
// its own, fetched only when its box is within ROOT_MARGIN of the viewport, so
// the first load carries the hero and the text, not three simulations.
//
// The server renders `children`, a same-size stand-in made in a server
// component (FigurePlaceholders.tsx) so it adds no JavaScript. It stays on
// screen while the chunk loads and is replaced in place, so nothing shifts.
// Without JavaScript the stand-in is what the page shows.

const ROOT_MARGIN = "600px";

const Standin = createContext<ReactNode>(null);
function Loading() {
  return <>{useContext(Standin)}</>;
}

const FIGURES = {
  crush80: dynamic(() => import("@/components/Crush80"), { ssr: false, loading: Loading }),
  ambilight: dynamic(() => import("@/components/figures/Ambilight"), { ssr: false, loading: Loading }),
  canvas: dynamic(() => import("@/components/figures/InfiniteCanvas"), { ssr: false, loading: Loading }),
};

export type FigureName = keyof typeof FIGURES;

export default function LazyFigure({ name, children }: { name: FigureName; children: ReactNode }) {
  const [near, setNear] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    // No observer (very old browsers): load now rather than never.
    if (typeof IntersectionObserver === "undefined") {
      const t = setTimeout(() => setNear(true), 0);
      return () => clearTimeout(t);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: ROOT_MARGIN },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!near) return <div ref={box}>{children}</div>;
  const Figure = FIGURES[name];
  return (
    <Standin.Provider value={children}>
      <Figure />
    </Standin.Provider>
  );
}
