"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import HeroPoster from "@/components/HeroPoster";
import { isWebGPUAvailable, webgpuOptIn } from "@/lib/gpu";
import { useIdleReady } from "@/lib/idle";
import { EASE, DURATION } from "@/lib/motion";

type RendererKind = "pending" | "webgpu" | "webgl2";
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
    const probe = webgpuOptIn(window.location.search)
      ? isWebGPUAvailable()
      : Promise.resolve(false);
    probe
      .then((ok) => {
        if (!alive) return;
        if (ok) {
          setKind("webgpu");
        } else {
          console.info("[renderer] webgl2");
          setKind("webgl2");
        }
      })
      .catch(() => {
        // Any probe error → safe WebGL2 path.
        console.info("[renderer] webgl2");
        if (alive) setKind("webgl2");
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
 * The live scene (three.js, R3F, WebGPU) is a lazy chunk mounted after idle.
 * Until its first frame the static poster fills the same box, so first paint
 * is text + CSS and nothing moves when the canvas arrives.
 */
export default function HeroSceneWrapper() {
  const idle = useIdleReady(800);
  const [ready, setReady] = useState(false);
  const ease = `cubic-bezier(${EASE.outExpo.join(",")})`;

  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          opacity: ready ? 0 : 1,
          transition: `opacity ${DURATION.slow}s ${ease}`,
        }}
      >
        <HeroPoster />
      </div>
      <div
        className="absolute inset-0"
        style={{
          opacity: ready ? 1 : 0,
          transition: `opacity ${DURATION.slow}s ${ease}`,
        }}
      >
        {idle && <RendererPicker onReady={() => setReady(true)} />}
      </div>
    </div>
  );
}
