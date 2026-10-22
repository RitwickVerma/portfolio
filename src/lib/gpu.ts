"use client";

// Capability probes for the hero. Client-only: every access is guarded for
// SSR and for browsers without the API.

/**
 * Can this browser give us a WebGL2 context at all? three r163+ needs one.
 * Probed on a throwaway canvas and released at once, so it never counts
 * against the per-page context limit.
 */
export function hasWebGL2(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** The OS-level "reduce motion" switch: static layers only, no turning room, no drifting grid. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
