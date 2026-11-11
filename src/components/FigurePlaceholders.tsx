import { KEYS, BOARD_W, BOARD_H } from "@/lib/crush80";

// Same-size stand-ins for the home page's lazy figures (see LazyFigure.tsx).
// Server components: they ship HTML, no JavaScript. Each copies the outer
// markup of the figure it stands for, so the box is the same height and
// nothing moves when the figure replaces it; an e2e test compares the two.
// Their buttons are disabled copies: the real ones need the code that is not loaded yet.
// The numbers below are copied from Crush80.tsx, InfiniteCanvas.tsx and
// Ambilight.tsx: change them together.

const U = 40; // Crush80: px per key unit
const GAP = 3;
const PAD = 14;
const BW = BOARD_W * U + PAD * 2;
const BH = BOARD_H * U + PAD * 2;

/** The Crush 80 as it first renders: the board with every switch unlit, and the idle caption. */
export function CrushStandin() {
  return (
    <div className="w-full" data-standin="crush80">
      <div className="mb-3 flex items-baseline gap-3 font-mono text-sm">
        <span aria-hidden="true" className="text-muted select-none">&gt;</span>
        <span className="min-h-[1.5em] whitespace-pre text-fg">
          <span aria-hidden="true" className="inline-block w-[0.55em] h-[1.1em] align-[-0.2em] ml-px bg-fg/40" />
        </span>
      </div>
      <div className="relative">
        <div className="rounded-md glass overflow-x-auto">
          <svg viewBox={`0 0 ${BW} ${BH}`} className="w-full h-auto min-w-[600px] select-none" aria-hidden="true">
            {KEYS.map((k) => {
              const x = PAD + k.x * U + GAP / 2;
              const y = PAD + k.y * U + GAP / 2;
              return (
                <g key={`${k.r}-${k.c}`}>
                  <rect x={x} y={y} width={k.w * U - GAP} height={(k.h ?? 1) * U - GAP} rx={3} fill="var(--bg)" stroke="var(--fg)" strokeOpacity={0.28} strokeWidth={1} />
                  <text x={x + 7} y={y + 15} fontSize={k.label.length > 4 ? 7.5 : 9.5} fontFamily="var(--font-mono)" fill="var(--fg)" fillOpacity={0.7}>
                    {k.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-md bg-gradient-to-l from-background to-transparent sm:hidden" />
      </div>
      <p className="mt-3 wd-narrow text-[0.95rem] text-muted">
        Type on it or tap a key. Each press shows its matrix position and the two GPIO lines the firmware reads it through.
      </p>
    </div>
  );
}

// Ambilight, home variant: 16 + 16 along the top and bottom, 9 down each side, 24 frames a second.
const AMBI_LEDS = 16 + 16 + 9 * 2;
const AMBI_FPS = 24;

/** The ambilight's dark stage and its caption; the picture and the LEDs are drawn once the code is there. */
export function AmbilightStandin() {
  return (
    <figure data-standin="ambilight">
      <div className="relative bg-[#090b0e] rounded-[var(--r-box)] overflow-hidden p-7 sm:p-10">
        <div className="relative">
          <div className="block w-full aspect-video rounded-[2px]" />
        </div>
      </div>
      <figcaption className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-2">
        <span className="fact flex-1 min-w-[16rem]">
          A simulation of the idea: {AMBI_LEDS} LEDs, each the mean colour of one zone of the frame, at {AMBI_FPS} frames a second. The real one reads the
          TV&apos;s decoded video plane and holds 20 to 25.
        </span>
        <button type="button" disabled className="fact underline decoration-fg/30 underline-offset-4 hover:text-fg max-sm:min-h-11 max-sm:min-w-11 max-sm:px-1">Pause</button>
        <button type="button" disabled className="fact underline decoration-fg/30 underline-offset-4 hover:text-fg max-sm:min-h-11 max-sm:min-w-11 max-sm:px-1">Show zones</button>
      </figcaption>
    </figure>
  );
}

// InfiniteCanvas: the plane's windows (title, x, y, w, h) at the starting camera.
const WINDOWS: readonly [string, number, number, number, number][] = [
  ["Terminal", 40, 60, 300, 190],
  ["Editor", 400, 30, 420, 300],
  ["Browser", 880, 90, 380, 260],
  ["Notes", 120, 330, 240, 200],
  ["Music", 1330, 40, 220, 150],
  ["Files", 470, 400, 330, 210],
  ["Chat", 900, 420, 260, 220],
  ["Mail", 1240, 300, 320, 250],
];
const CAM = { x: 20, y: 10, zoom: 0.62 };

/** The canvas at its starting camera: the same windows, without their contents. */
export function CanvasStandin() {
  return (
    <figure data-standin="canvas">
      <div
        className="relative h-[19rem] sm:h-[22rem] overflow-hidden border-2 border-fg rounded-[var(--r-box)] bg-surface select-none"
        style={{
          backgroundImage: "radial-gradient(rgb(var(--fg-rgb) / 0.22) 1px, transparent 1px)",
          backgroundSize: `${40 * CAM.zoom}px ${40 * CAM.zoom}px`,
          backgroundPosition: `${-CAM.x * CAM.zoom}px ${-CAM.y * CAM.zoom}px`,
        }}
      >
        <div className="absolute top-0 left-0 origin-top-left" style={{ transform: `scale(${CAM.zoom}) translate(${-CAM.x}px, ${-CAM.y}px)` }}>
          {WINDOWS.map(([title, x, y, w, h]) => (
            <div key={title} className="absolute bg-background border-2 border-fg rounded-[5px] overflow-hidden" style={{ left: x, top: y, width: w, height: h }}>
              <div className="flex items-center justify-between px-3 h-8 border-b-2 border-fg">
                <span className="wd-semi font-bold text-sm">{title}</span>
                <span className="font-mono text-[10px] text-muted">
                  {x}, {y}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <figcaption className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-2">
        <span className="fact flex-1 min-w-[16rem]">
          Drag it. Each title bar shows its window&apos;s position, and those numbers never change: only the camera moves. Camera at{" "}
          <span className="font-mono text-[0.7rem]">
            {Math.round(CAM.x)}, {Math.round(CAM.y)}
          </span>
          , zoom <span className="font-mono text-[0.7rem]">{CAM.zoom.toFixed(2)}</span>.
        </span>
        {["Zoom in", "Zoom out", "Overview"].map((t) => (
          <button key={t} type="button" disabled className="fact underline decoration-fg/30 underline-offset-4 hover:text-fg max-sm:min-h-11 max-sm:min-w-11 max-sm:px-1">
            {t}
          </button>
        ))}
      </figcaption>
    </figure>
  );
}
