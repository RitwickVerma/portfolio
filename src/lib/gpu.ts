'use client';

// WebGPU capability probes + adaptive quality helpers.
// Client-only module: every access is guarded for SSR / non-GPU browsers.

export type GpuMoteTier = 2048 | 4096 | 8192;

type GpuLike = {
  requestAdapter?: () => Promise<unknown>;
};

type AdapterLike = {
  limits?: { maxStorageBufferBytes?: number };
  requestDevice?: () => Promise<unknown>;
};

/**
 * WebGPU is OPT-IN (`?renderer=webgpu`) until it is verified on real GPUs.
 * The default path is the proven WebGL2 scene. History: the WebGPU path shipped
 * on 2026-10-13 untested on hardware and blanked the hero for every Chrome
 * visitor with a GPU — headless smoke tests only ever exercised WebGL2.
 */
export function webgpuOptIn(search: string): boolean {
  return new URLSearchParams(search).get('renderer') === 'webgpu';
}

/**
 * True when a usable WebGPU adapter AND device can be created.
 * Swallows every failure — callers fall back to WebGL2.
 */
export async function isWebGPUAvailable(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !('gpu' in navigator)) return false;
    const gpu = (navigator as unknown as { gpu?: GpuLike }).gpu;
    if (!gpu?.requestAdapter) return false;
    const adapter = (await gpu.requestAdapter()) as AdapterLike | null;
    if (!adapter) return false;
    const device = (await adapter.requestDevice?.()) as { destroy?: () => void } | undefined;
    // The probe's device is not the renderer's; release it or it lives for the page.
    device?.destroy?.();
    return !!device;
  } catch {
    return false;
  }
}

/** Cap devicePixelRatio for the GPU hero: ≤1.5 native, ≤1.75 mid, 1.5 for 2x+. */
export function capPixelRatio(): number {
  if (typeof window === 'undefined') return 1;
  const dpr = window.devicePixelRatio || 1;
  if (dpr <= 1.5) return dpr;
  return dpr > 2 ? 1.5 : 1.75;
}

/**
 * Pick the mote tier from adapter storage limits + pixel ratio:
 * strong adapter + low fill-rate → 8192, weak/low-DPR → 2048, else 4096.
 */
export async function pickGpuMoteTier(): Promise<GpuMoteTier> {
  try {
    const dpr = capPixelRatio();
    let storageBytes = 0;
    if (typeof navigator !== 'undefined') {
      const gpu = (navigator as unknown as { gpu?: GpuLike }).gpu;
      const adapter = (await gpu?.requestAdapter?.()) as AdapterLike | null;
      storageBytes = adapter?.limits?.maxStorageBufferBytes ?? 0;
    }
    if (storageBytes >= 512 * 1024 * 1024) return dpr <= 1.5 ? 8192 : 4096;
    if (storageBytes >= 256 * 1024 * 1024) return dpr <= 1.5 ? 4096 : 2048;
    return 2048;
  } catch {
    return 4096;
  }
}

/**
 * Can this browser give us a WebGL2 context at all? three r163+ needs one.
 * Probed on a throwaway canvas and released at once, so it never counts
 * against the per-page context limit.
 */
export function hasWebGL2(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** The OS-level "reduce motion" switch: static layers only — no turning room, no drifting grid. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
