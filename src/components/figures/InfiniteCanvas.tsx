"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// The idea behind kwin-canvas, small enough to drag. Windows sit at fixed
// positions on a plane much larger than the screen; nothing ever moves them.
// The only thing that changes is the camera: where it looks and how far out
// it is. Drag to pan, use the buttons or Ctrl and the wheel to zoom.
//
// On a touch screen a vertical swipe still scrolls the page (touch-action:
// pan-y): a figure must never trap the reader. Sideways drags pan the canvas.

interface Win {
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  lines: number;
}

// Plane coordinates, in the plane's own pixels.
const WINDOWS: Win[] = [
  { title: "Terminal", x: 40, y: 60, w: 300, h: 190, lines: 6 },
  { title: "Editor", x: 400, y: 30, w: 420, h: 300, lines: 10 },
  { title: "Browser", x: 880, y: 90, w: 380, h: 260, lines: 8 },
  { title: "Notes", x: 120, y: 330, w: 240, h: 200, lines: 6 },
  { title: "Music", x: 1330, y: 40, w: 220, h: 150, lines: 3 },
  { title: "Files", x: 470, y: 400, w: 330, h: 210, lines: 6 },
  { title: "Chat", x: 900, y: 420, w: 260, h: 220, lines: 7 },
  { title: "Mail", x: 1240, y: 300, w: 320, h: 250, lines: 8 },
];
const PLANE = { w: 1600, h: 680 };
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 1.6;
const START = { x: 20, y: 10, zoom: 0.62 };

/** Keep the middle of the view over the plane, so the windows can never be dragged out of sight. */
function clamp(c: Camera, size: { w: number; h: number }): Camera {
  const halfW = size.w / 2 / c.zoom;
  const halfH = size.h / 2 / c.zoom;
  return {
    zoom: c.zoom,
    x: Math.min(PLANE.w - halfW, Math.max(-halfW, c.x)),
    y: Math.min(PLANE.h - halfH, Math.max(-halfH, c.y)),
  };
}

interface Camera {
  /** Plane coordinate at the viewport's top-left corner. */
  x: number;
  y: number;
  zoom: number;
}

export default function InfiniteCanvas() {
  const viewRef = useRef<HTMLDivElement>(null);
  const [cam, setCam] = useState<Camera>(START);
  const [size, setSize] = useState({ w: 600, h: 340 });
  const drag = useRef<{ id: number; px: number; py: number; cx: number; cy: number } | null>(null);

  useEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** Zoom about the viewport centre, so what you are looking at stays put. */
  const zoomBy = useCallback(
    (factor: number) =>
      setCam((c) => {
        const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, c.zoom * factor));
        const cx = c.x + size.w / 2 / c.zoom;
        const cy = c.y + size.h / 2 / c.zoom;
        return clamp({ zoom, x: cx - size.w / 2 / zoom, y: cy - size.h / 2 / zoom }, size);
      }),
    [size],
  );

  const overview = () => {
    const zoom = Math.max(MIN_ZOOM, Math.min(size.w / PLANE.w, size.h / PLANE.h));
    setCam({ zoom, x: (PLANE.w - size.w / zoom) / 2, y: (PLANE.h - size.h / zoom) / 2 });
  };

  // Ctrl + wheel zooms. A plain wheel is left alone so the page still scrolls.
  useEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomBy]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = 40 / cam.zoom;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const m = moves[e.key];
    if (m) {
      e.preventDefault();
      setCam((c) => clamp({ ...c, x: c.x + m[0], y: c.y + m[1] }, size));
    } else if (e.key === "+" || e.key === "=") zoomBy(1.2);
    else if (e.key === "-") zoomBy(1 / 1.2);
  };

  const MAP_W = 132;
  const mapScale = MAP_W / PLANE.w;

  return (
    <figure>
      <div
        ref={viewRef}
        tabIndex={0}
        role="application"
        aria-label="An infinite canvas of windows. Drag or use the arrow keys to move the camera; plus and minus zoom."
        onKeyDown={onKeyDown}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { id: e.pointerId, px: e.clientX, py: e.clientY, cx: cam.x, cy: cam.y };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || d.id !== e.pointerId) return;
          setCam((c) => clamp({ ...c, x: d.cx - (e.clientX - d.px) / c.zoom, y: d.cy - (e.clientY - d.py) / c.zoom }, size));
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        className="relative h-[19rem] sm:h-[22rem] overflow-hidden border-2 border-fg rounded-[var(--r-box)] bg-surface cursor-grab active:cursor-grabbing touch-pan-y select-none outline-none focus-visible:border-accent"
        style={{
          backgroundImage: "radial-gradient(rgb(var(--fg-rgb) / 0.22) 1px, transparent 1px)",
          backgroundSize: `${40 * cam.zoom}px ${40 * cam.zoom}px`,
          backgroundPosition: `${-cam.x * cam.zoom}px ${-cam.y * cam.zoom}px`,
        }}
      >
        <div className="absolute top-0 left-0 origin-top-left" style={{ transform: `scale(${cam.zoom}) translate(${-cam.x}px, ${-cam.y}px)` }}>
          {WINDOWS.map((w) => (
            <div key={w.title} className="absolute bg-background border-2 border-fg rounded-[5px] overflow-hidden" style={{ left: w.x, top: w.y, width: w.w, height: w.h }}>
              <div className="flex items-center justify-between px-3 h-8 border-b-2 border-fg">
                <span className="wd-semi font-bold text-sm">{w.title}</span>
                <span className="font-mono text-xs text-fg/75">
                  {w.x}, {w.y}
                </span>
              </div>
              <div className="p-3 space-y-2">
                {Array.from({ length: w.lines }, (_, i) => (
                  <span key={i} className="block h-2 bg-fg/15 rounded-full" style={{ width: `${45 + ((i * 37 + w.x) % 50)}%` }} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Minimap: the whole plane, and the rectangle the camera sees. */}
        <div aria-hidden="true" className="absolute right-2 bottom-2 bg-background/90 border border-fg" style={{ width: MAP_W, height: PLANE.h * mapScale }}>
          {WINDOWS.map((w) => (
            <span key={w.title} className="absolute bg-fg/35" style={{ left: w.x * mapScale, top: w.y * mapScale, width: w.w * mapScale, height: w.h * mapScale }} />
          ))}
          <span
            className="absolute border-2 border-accent"
            style={{ left: cam.x * mapScale, top: cam.y * mapScale, width: (size.w / cam.zoom) * mapScale, height: (size.h / cam.zoom) * mapScale }}
          />
        </div>
      </div>
      <figcaption className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-2">
        <span className="text-[0.95rem] leading-snug text-fg/75 flex-1 min-w-[16rem]">
          Drag it. Each title bar shows its window&apos;s position, and those numbers never change: only the camera moves. Camera at{" "}
          <span className="font-mono text-xs">
            {Math.round(cam.x)}, {Math.round(cam.y)}
          </span>
          , zoom <span className="font-mono text-xs">{cam.zoom.toFixed(2)}</span>.
        </span>
        <button type="button" className="fact underline decoration-fg/30 underline-offset-4 hover:text-fg max-sm:min-h-11 max-sm:min-w-11 max-sm:px-1" onClick={() => zoomBy(1.25)}>
          Zoom in
        </button>
        <button type="button" className="fact underline decoration-fg/30 underline-offset-4 hover:text-fg max-sm:min-h-11 max-sm:min-w-11 max-sm:px-1" onClick={() => zoomBy(1 / 1.25)}>
          Zoom out
        </button>
        <button type="button" className="fact underline decoration-fg/30 underline-offset-4 hover:text-fg max-sm:min-h-11 max-sm:min-w-11 max-sm:px-1" onClick={overview}>
          Overview
        </button>
      </figcaption>
    </figure>
  );
}
