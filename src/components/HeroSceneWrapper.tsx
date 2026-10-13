"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { isWebGPUAvailable } from "@/lib/gpu";

type RendererKind = "pending" | "webgpu" | "webgl2";

const Spinner = () => (
  <div className="w-full h-full flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
  </div>
);

const HeroSceneWebGL2 = dynamic(() => import("@/components/HeroScene"), {
  ssr: false,
  loading: Spinner,
});

const HeroSceneWebGPU = dynamic(
  () => import("@/components/HeroSceneWebGPU"),
  { ssr: false, loading: Spinner },
);

function RendererPicker() {
  const [kind, setKind] = useState<RendererKind>("pending");

  useEffect(() => {
    let alive = true;
    isWebGPUAvailable()
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

  if (kind === "webgpu") return <HeroSceneWebGPU />;
  if (kind === "webgl2") return <HeroSceneWebGL2 />;
  return <Spinner />;
}

export default function HeroSceneWrapper() {
  return (
    <div className="absolute inset-0">
      <RendererPicker />
    </div>
  );
}
