import { ACCENT, RACK_BODY } from "@/lib/theme";

// Static stand-in for the 3D hero: same asymmetric rack silhouettes, no JS,
// no three.js. Shown from first paint until the live scene is ready, then
// faded out — so the hero never looks empty and nothing shifts.

const BACK = [
  { x: 130, w: 84, h: 190 },
  { x: 332, w: 80, h: 160 },
  { x: 556, w: 88, h: 205 },
  { x: 790, w: 78, h: 150 },
];
const FRONT = [
  { x: 56, w: 96, h: 230 },
  { x: 268, w: 92, h: 190 },
  { x: 498, w: 88, h: 214 },
  { x: 722, w: 100, h: 172 },
];

function Rack({ x, w, h, base }: { x: number; w: number; h: number; base: number;  }) {
  const top = base - h;
  return (
    <g>
      <rect x={x} y={top} width={w} height={h} rx={3} fill={RACK_BODY} stroke={ACCENT} strokeOpacity={0.28} />
      <rect x={x + 10} y={top + 14} width={w - 20} height={h * 0.55} rx={2} fill={ACCENT} fillOpacity={0.07} />
      {[0, 1, 2].map((i) => (
        <circle
          key={i}
          cx={x + w / 2 - 14 + i * 14}
          cy={base - 16}
          r={2.6}
          fill={ACCENT}
          fillOpacity={i === 2 ? 0.4 : 0.9}
        />
      ))}
    </g>
  );
}

export default function HeroPoster() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background" aria-hidden="true">
      <svg viewBox="0 0 1000 520" className="w-full max-w-[1100px] h-auto" role="presentation">
        <defs>
          <radialGradient id="poster-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={ACCENT} stopOpacity="0.16" />
            <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="500" cy="420" rx="470" ry="90" fill="url(#poster-glow)" />
        <g opacity={0.55}>
          {BACK.map((r) => (
            <Rack key={r.x} {...r} base={330} />
          ))}
        </g>
        {FRONT.map((r) => (
          <Rack key={r.x} {...r} base={420} />
        ))}
      </svg>
    </div>
  );
}
