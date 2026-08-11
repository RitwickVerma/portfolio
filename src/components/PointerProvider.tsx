"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import type { ReactNode } from "react";

type PointerState = { x: number; y: number };

const PointerContext = createContext<{ current: PointerState }>({
  current: { x: 0.5, y: 0.5 },
});

export function usePointer() {
  return useContext(PointerContext);
}

export function PointerProvider({ children }: { children: ReactNode }) {
  const ref = useRef<PointerState>({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      ref.current = {
        x: e.clientX / window.innerWidth,
        y: 1.0 - e.clientY / window.innerHeight,
      };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <PointerContext.Provider value={ref}>
      {children}
    </PointerContext.Provider>
  );
}
