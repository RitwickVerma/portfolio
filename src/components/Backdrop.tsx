"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import SceneBoundary from "@/components/SceneBoundary";
import { hasWebGL2, prefersReducedMotion } from "@/lib/gpu";
import { useIdleReady } from "@/lib/idle";

// The full-viewport shader grid pulls in three.js; mount it after idle so the
// first paint is text + CSS. The page background is already the page colour, so
// there is no flash when it arrives — and none if it never does (no WebGL2,
// reduced motion, a renderer error).
const ShaderBackground = dynamic(() => import("@/components/ShaderBackground"), {
  ssr: false,
});

export default function Backdrop() {
  const home = usePathname() === "/";
  const idle = useIdleReady(2500);
  const [capable, setCapable] = useState(false);

  useEffect(() => {
    if (!idle || !home) return;
    // Probe from a callback, one frame on, not from the effect body itself.
    const id = requestAnimationFrame(() => setCapable(hasWebGL2() && !prefersReducedMotion()));
    return () => cancelAnimationFrame(id);
  }, [idle, home]);

  if (!capable || !home) return null;
  return (
    <SceneBoundary label="backdrop">
      <ShaderBackground />
    </SceneBoundary>
  );
}
