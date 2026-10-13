"use client";

import dynamic from "next/dynamic";
import { useIdleReady } from "@/lib/idle";

// The full-viewport shader grid pulls in three.js; mount it after idle so the
// first paint is text + CSS. The page background is already #0a0a0f, so
// there is no flash when it arrives.
const ShaderBackground = dynamic(() => import("@/components/ShaderBackground"), {
  ssr: false,
});

export default function Backdrop() {
  const ready = useIdleReady(2500);
  return ready ? <ShaderBackground /> : null;
}
