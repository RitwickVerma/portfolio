"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import HeroPoster from "@/components/HeroPoster";
import SceneBoundary from "@/components/SceneBoundary";
import { hasWebGL2, isWebGPUAvailable, prefersReducedMotion, webgpuOptIn } from "@/lib/gpu";
import { useIdleReady } from "@/lib/idle";
import { EASE, DURATION } from "@/lib/motion";

type RendererKind = "pending" | "webgpu" | "webgl2" | "none";
type SceneProps = { onReady?: () => void };

const HeroSceneWebGL2 = dynamic<SceneProps>(() => import("@/components/HeroScene"), {
  ssr: false,
});

const HeroSceneWebGPU = dynamic<SceneProps>(
  () => import("@/components/HeroSceneWebGPU"),
  { ssr: false },
);

function RendererPicker({ onReady }: SceneProps) {
  const [kind, setKind] = useState<RendererKind>("pending");

  useEffect(() => {
    let alive = true;
    const pick = async (): Promise<RendererKind> => {
      // No WebGL2, or the visitor asked for less motion: the poster is the hero.
      if (!hasWebGL2() || prefersReducedMotion()) return "none";
      const webgpu = webgpuOptIn(window.location.search) && (await isWebGPUAvailable());
      return webgpu ? "webgpu" : "webgl2";
    };
    pick()
      // Any probe error → safe WebGL2 path.
      .catch((): RendererKind => "webgl2")
      .then((kind) => {
        if (!alive) return;
        if (kind !== "none") console.info(`[renderer] ${kind}`);
        setKind(kind);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (kind === "webgpu") return <HeroSceneWebGPU onReady={onReady} />;
  if (kind === "webgl2") return <HeroSceneWebGL2 onReady={onReady} />;
  return null;
}

/**
 * A calm, near-opaque field behind the hero text block (name, value line, CTAs)
 * that falls off to nothing, so the scene reads clearly around it. Rendered
 * once over the poster and once over the live scene, inside their fade
 * wrappers: the two cross-fade, so the combined scrim never flickers, and the
 * rack labels (drei <Html>, z-index 7) always stack above it — a wrapper
 * mid-fade is its own stacking context, so a scrim outside it would cover the
 * labels until the fade ended, then pop.
 */
function HeroScrim() {
  return (
    <>
      {/* Radii are px-clamped: on a 360px phone the block is nearly full-width. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-[5] print:hidden hidden sm:block"
        style={{
          background:
            "radial-gradient(ellipse clamp(330px, 46vw, 760px) clamp(250px, 36vh, 400px) at 50% 50%, rgba(10,10,15,0.94) 0%, rgba(10,10,15,0.9) 58%, rgba(10,10,15,0.5) 80%, rgba(10,10,15,0) 100%)",
        }}
      />
      {/* Phones: the text block spans the full width, so a desktop-strength scrim
          blacks out the whole scene. Lighter core, tighter falloff — the large
          white type still holds contrast, and the racks stay visible. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-[5] print:hidden sm:hidden"
        style={{
          background:
            "radial-gradient(ellipse 62% 26% at 50% 50%, rgba(10,10,15,0.72) 0%, rgba(10,10,15,0.55) 60%, rgba(10,10,15,0) 100%)",
        }}
      />
    </>
  );
}

/**
 * The live scene (three.js, R3F, WebGPU) is a lazy chunk mounted after idle.
 * Until its first frame the static poster fills the same box, so first paint
 * is text + CSS and nothing moves when the canvas arrives. If the scene never
 * arrives — no WebGL, reduced motion, a renderer error — the poster simply
 * stays.
 */
export default function HeroSceneWrapper() {
  const idle = useIdleReady(800);
  const [ready, setReady] = useState(false);
  const ease = `cubic-bezier(${EASE.outExpo.join(",")})`;
  const fade = { transition: `opacity ${DURATION.slow}s ${ease}` };

  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0" style={{ opacity: ready ? 0 : 1, ...fade }}>
        <HeroPoster />
        <HeroScrim />
      </div>
      <div className="absolute inset-0" style={{ opacity: ready ? 1 : 0, ...fade }}>
        {idle && (
          <SceneBoundary label="hero">
            <RendererPicker onReady={() => setReady(true)} />
          </SceneBoundary>
        )}
        <HeroScrim />
      </div>
      {/* The room is interactive, but nothing says so: tell mouse users once the
          scene is live. Hidden where there is no pointer to drag with. */}
      <p
        aria-hidden="true"
        className="absolute bottom-8 left-6 z-20 hidden md:block font-mono text-xs text-muted/80 select-none pointer-events-none print:hidden"
        style={{ opacity: ready ? 1 : 0, ...fade }}
      >
        drag to rotate · double-click to power on
      </p>
    </div>
  );
}
