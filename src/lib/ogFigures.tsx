import type { CSSProperties, ReactNode } from "react";
import { BG, FG, MUTED, ACCENT, HIT, WARN, OK } from "./theme";
import { UNIVERSES, SPY, WINDOW, pctText } from "./plutusResults";
import { KEYS, BOARD_W, BOARD_H } from "./crush80";
import { KEYMAP_TODAY } from "./crush80Keymaps";
import { boardState, cells } from "./layerBoard";
import { bindingAt } from "./layers";
import { services } from "./data";
import { UNDECLARED } from "./drift";
import { PQ_PEAK, REF_WHITE, pqToNits } from "./pq";
import { initialFigure, ruleSentence, MONITOR as KWIN_MONITOR } from "./kwinFigure";
import { alignDetail } from "./chordAlign";
import { GRACE_LINES, GRACE_ROWS } from "./chordAlignFixture";
import { ALL_ON, REACH, WINDOW_MS, layout, replay, sec } from "./shutupStreams";
import { COMPUTER_NAME, EXAMPLE, clockText, timeline, type Row } from "./sudostampSim";

// The lead figure of each note, redrawn for the 1200×630 social card. Each one
// is computed by the same library code the page runs, from the figure's own
// first state: no number below is typed in. The card renderer is satori, so the
// shapes are an inline <svg> (rendered as an image, no fonts) and every word is
// an absolutely placed flex <div> over it. Colours come from theme.ts.

export const PANEL_W = 1056;
export const PANEL_H = 260;

export interface OgFigure {
  /** About PANEL_W × PANEL_H, satori-safe. */
  figure: ReactNode;
  /** Replaces the note's summary as the card's muted line, when the figure has a sentence of its own. */
  line?: string;
}

// ─── Drawing helpers ─────────────────────────────────────────────────────

function Panel({ children }: { children: ReactNode }) {
  return <div style={{ display: "flex", position: "relative", width: PANEL_W, height: PANEL_H }}>{children}</div>;
}

function Shapes({ children }: { children: ReactNode }) {
  return (
    <svg width={PANEL_W} height={PANEL_H} viewBox={`0 0 ${PANEL_W} ${PANEL_H}`} style={{ position: "absolute", left: 0, top: 0 }}>
      {children}
    </svg>
  );
}

interface TxtProps {
  x: number;
  y: number;
  /** Box width; with `align` the text sits inside it. */
  w?: number;
  size?: number;
  color?: string;
  bold?: boolean;
  align?: "left" | "center" | "right";
  children: ReactNode;
}

/** One line of text at a position (top-left of its box). */
function Txt({ x, y, w, size = 22, color = FG, bold, align = "left", children }: TxtProps) {
  const style: CSSProperties = {
    display: "flex",
    position: "absolute",
    left: x,
    top: y,
    ...(w === undefined ? {} : { width: w }),
    fontSize: size,
    lineHeight: 1,
    color,
    fontWeight: bold ? 800 : 400,
    justifyContent: align === "left" ? "flex-start" : align === "center" ? "center" : "flex-end",
    whiteSpace: "nowrap",
  };
  return <div style={style}>{children}</div>;
}

/** A line with an arrow head at its end, as svg elements. A plain function, not a component: satori allows only intrinsic elements inside <svg>. */
function arrow(x1: number, y1: number, x2: number, y2: number, color = FG, width = 3): ReactNode[] {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = 11;
  const p = (t: number) => `${x2 - h * Math.cos(a + t)},${y2 - h * Math.sin(a + t)}`;
  const key = `${x1}-${y1}-${x2}-${y2}`;
  return [
    <line key={`l${key}`} x1={x1} y1={y1} x2={x2 - h * 0.6 * Math.cos(a)} y2={y2 - h * 0.6 * Math.sin(a)} stroke={color} strokeWidth={width} />,
    <polygon key={`p${key}`} points={`${x2},${y2} ${p(0.45)} ${p(-0.45)}`} fill={color} />,
  ];
}

// ─── plutus: the four annualised bars ────────────────────────────────────

function plutus(): OgFigure {
  const universe = (id: "today" | "ever" | "then") => UNIVERSES.find((u) => u.id === id)!;
  const bars = [
    { label: universe("today").label, cagr: universe("today").cagr, tone: "plain" as const },
    { label: universe("ever").label, cagr: universe("ever").cagr, tone: "plain" as const },
    { label: universe("then").label, cagr: universe("then").cagr, tone: "honest" as const },
    { label: "SPY, the index", cagr: SPY.cagr, tone: "index" as const },
  ];
  const x0 = 480;
  const room = PANEL_W - x0 - 140;
  const top = Math.max(...bars.map((b) => b.cagr));
  const y0 = 40;
  const rowH = (PANEL_H - y0) / bars.length;
  const barH = rowH - 12;
  return {
    figure: (
      <Panel>
        <Shapes>
          <line x1={x0} y1={y0 - 4} x2={x0} y2={PANEL_H - 6} stroke={FG} strokeWidth={2} />
          {bars.map((b, i) => (
            <rect
              key={b.label}
              x={x0}
              y={y0 + i * rowH}
              width={(b.cagr / top) * room}
              height={barH}
              fill={b.tone === "honest" ? HIT : b.tone === "index" ? MUTED : FG}
              stroke={FG}
              strokeWidth={b.tone === "honest" ? 3 : 0}
            />
          ))}
        </Shapes>
        <Txt x={0} y={2} size={24} color={MUTED}>{`Annualised return, ${WINDOW}`}</Txt>
        {bars.map((b, i) => (
          <Txt key={b.label} x={0} y={y0 + i * rowH + (barH - 26) / 2} w={x0 - 20} size={26} bold={b.tone === "honest"} align="right">
            {b.label}
          </Txt>
        ))}
        {bars.map((b, i) => (
          <Txt key={`v${b.label}`} x={x0 + (b.cagr / top) * room + 14} y={y0 + i * rowH + (barH - 34) / 2} size={34} bold>
            {pctText(b.cagr)}
          </Txt>
        ))}
      </Panel>
    ),
  };
}

// ─── crush80: the board, Fn held ─────────────────────────────────────────

function crush80(): OgFigure {
  const map = KEYMAP_TODAY;
  const cs = cells(map, boardState(map, "fn", []));
  const changed = cs.filter((c) => c.binding !== bindingAt(map, 0, c.index));
  const changedSet = new Set(changed.map((c) => c.index));
  const u = PANEL_H / BOARD_H;
  const pad = 1.5;
  const rx = BOARD_W * u + 36;
  return {
    figure: (
      <Panel>
        <Shapes>
          {KEYS.map((k, i) => (
            <rect
              key={`${k.r}-${k.c}`}
              x={k.x * u + pad}
              y={k.y * u + pad}
              width={k.w * u - 2 * pad}
              height={(k.h ?? 1) * u - 2 * pad}
              rx={4}
              fill={changedSet.has(i) ? HIT : BG}
              stroke={FG}
              strokeWidth={2}
            />
          ))}
          <rect x={rx} y={PANEL_H - 30} width={28} height={24} rx={4} fill={HIT} stroke={FG} strokeWidth={2} />
        </Shapes>
        <Txt x={rx} y={0} size={96} bold>{`${changed.length}`}</Txt>
        <Txt x={rx} y={100} size={28}>{`of ${KEYS.length} keys mean`}</Txt>
        <Txt x={rx} y={132} size={28}>something else</Txt>
        <Txt x={rx} y={164} size={28}>while Fn is held</Txt>
        <Txt x={rx + 40} y={PANEL_H - 30} size={24} color={MUTED}>changed key</Txt>
      </Panel>
    ),
  };
}

// ─── homelab: the guests behind one gateway ──────────────────────────────

function homelab(): OgFigure {
  const gateway = services.find((s) => s.name === "Gateway");
  const guests = services.filter((s) => s !== gateway);
  const parts = (gateway?.description ?? "").split(/,\s*|\s+and\s+/).filter(Boolean);
  const declared = services.length - UNDECLARED.length;
  const cols = 5;
  const rows = Math.ceil(guests.length / cols);
  const gx = 396;
  const gw = 304;
  const gap = 6;
  const inner = 9;
  const stripH = 46;
  const cw = (gw - 2 * inner - (cols - 1) * gap) / cols;
  const gh = PANEL_H - stripH - 18;
  const ch = (gh - 2 * inner - (rows - 1) * gap) / rows;
  const midY = gh / 2;
  const boxH = gh - 8;
  const boxY = midY - boxH / 2;
  const sy = gh + 18;
  const at = (i: number) => ({ x: gx + inner + (i % cols) * (cw + gap), y: inner + Math.floor(i / cols) * (ch + gap) });
  const nx = gx + gw + 52;
  return {
    figure: (
      <Panel>
        <Shapes>
          <rect x={gx + 1} y={1} width={gw - 2} height={gh - 2} rx={6} fill="none" stroke={MUTED} strokeWidth={2} strokeDasharray="8 6" />
          <rect x={148} y={boxY} width={200} height={boxH} fill={FG} />
          {arrow(100, midY, 140, midY)}
          {arrow(358, midY, 388, midY)}
          {guests.map((g, i) => (
            <rect key={g.ct} x={at(i).x} y={at(i).y} width={cw} height={ch} rx={3} fill={BG} stroke={FG} strokeWidth={2} />
          ))}
          <rect x={0} y={sy} width={236} height={stripH} rx={3} fill={BG} stroke={FG} strokeWidth={2} />
          {arrow(242, sy + stripH / 2, 292, sy + stripH / 2)}
          {arrow(292, sy + stripH / 2, 242, sy + stripH / 2)}
        </Shapes>
        <Txt x={0} y={midY - 26} size={32} bold>You</Txt>
        <Txt x={0} y={midY + 12} size={22} color={MUTED}>web or VPN</Txt>
        <Txt x={164} y={boxY + 10} size={30} bold color={BG}>Gateway</Txt>
        {parts.map((p, i) => (
          <Txt key={p} x={164} y={boxY + 56 + i * 32} size={22} color={BG}>
            {p}
          </Txt>
        ))}
        <Txt x={nx} y={0} size={110} bold>{`${services.length}`}</Txt>
        <Txt x={nx} y={122} size={26} color={MUTED}>guests</Txt>
        <Txt x={nx} y={152} size={22} color={MUTED}>incl. gateway</Txt>
        <Txt x={nx + 168} y={0} size={110} bold color={ACCENT}>{`${declared}`}</Txt>
        <Txt x={nx + 168} y={122} size={26} color={MUTED}>declared in</Txt>
        <Txt x={nx + 168} y={152} size={26} color={MUTED}>OpenTofu</Txt>
        <Txt x={16} y={sy + (stripH - 22) / 2} size={22} bold>Git repository</Txt>
        <Txt x={306} y={sy + (stripH - 22) / 2} size={22} color={MUTED}>nightly CI commits what changed</Txt>
      </Panel>
    ),
  };
}

// ─── tizen: PQ against the straight line ─────────────────────────────────

/** The largest 10-bit code. */
const CODE_MAX = 1023;

function tizen(): OgFigure {
  const L = 150;
  const T = 46;
  const W = 520;
  const H = PANEL_H - T - 40;
  const px = (code: number) => L + (code / CODE_MAX) * W;
  const py = (nits: number) => T + H - (nits / PQ_PEAK) * H;
  const curve: string[] = [];
  for (let c = 0; c <= CODE_MAX; c += 3) curve.push(`${c === 0 ? "M" : "L"}${px(c).toFixed(1)} ${py(pqToNits(c / CODE_MAX)).toFixed(1)}`);
  curve.push(`L${px(CODE_MAX).toFixed(1)} ${py(pqToNits(1)).toFixed(1)}`);
  // The code at which PQ reaches diffuse white, and what the straight line says that code is.
  let whiteCode = 0;
  while (whiteCode < CODE_MAX && pqToNits(whiteCode / CODE_MAX) < REF_WHITE) whiteCode++;
  const real = pqToNits(whiteCode / CODE_MAX);
  const line = (whiteCode / CODE_MAX) * PQ_PEAK;
  const nf = (n: number) => Math.round(n).toLocaleString("en-US");
  const rx = L + W + 56;
  const blockA = 4;
  const blockB = 4 + Math.round(PANEL_H / 2);
  return {
    figure: (
      <Panel>
        <Shapes>
          <line x1={L} y1={T} x2={L} y2={T + H} stroke={FG} strokeWidth={2} />
          <line x1={L} y1={T + H} x2={L + W} y2={T + H} stroke={FG} strokeWidth={2} />
          <line x1={px(0)} y1={py(0)} x2={px(CODE_MAX)} y2={py(PQ_PEAK)} stroke={MUTED} strokeWidth={3} strokeDasharray="10 7" />
          <path d={curve.join(" ")} fill="none" stroke={FG} strokeWidth={6} />
          <line x1={px(whiteCode)} y1={py(real)} x2={px(whiteCode)} y2={py(line)} stroke={ACCENT} strokeWidth={3} />
          <circle cx={px(whiteCode)} cy={py(real)} r={9} fill={HIT} stroke={FG} strokeWidth={3} />
          <circle cx={px(whiteCode)} cy={py(line)} r={8} fill={BG} stroke={MUTED} strokeWidth={3} />
          <circle cx={rx - 24} cy={blockA + 66} r={9} fill={HIT} stroke={FG} strokeWidth={3} />
          <circle cx={rx - 24} cy={blockB + 66} r={8} fill={BG} stroke={MUTED} strokeWidth={3} />
          <line x1={L} y1={12} x2={L + 40} y2={12} stroke={FG} strokeWidth={6} />
          <line x1={L + 270} y1={12} x2={L + 310} y2={12} stroke={MUTED} strokeWidth={3} strokeDasharray="10 7" />
        </Shapes>
        <Txt x={0} y={T - 2} w={L - 16} size={22} color={MUTED} align="right">{`${nf(PQ_PEAK)} nits`}</Txt>
        <Txt x={0} y={T + H - 20} w={L - 16} size={22} color={MUTED} align="right">0</Txt>
        <Txt x={L} y={T + H + 10} size={22} color={MUTED}>0</Txt>
        <Txt x={L} y={T + H + 10} w={W} size={22} color={MUTED} align="right">{`code ${CODE_MAX}`}</Txt>
        <Txt x={L + 50} y={1} size={22} bold>PQ, the real curve</Txt>
        <Txt x={L + 320} y={1} size={22} color={MUTED}>{"the old decoder's line"}</Txt>
        <Txt x={rx} y={blockA} size={22} color={MUTED}>{`at code ${whiteCode}, PQ is`}</Txt>
        <Txt x={rx} y={blockA + 34} size={54} bold>{`${nf(real)} nits`}</Txt>
        <Txt x={rx} y={blockB} size={22} color={MUTED}>the straight line says</Txt>
        <Txt x={rx} y={blockB + 34} size={54} bold>{`${nf(line)} nits`}</Txt>
      </Panel>
    ),
  };
}

// ─── kwin: the window, KWin's move, the ghost ────────────────────────────

function kwin(): OgFigure {
  const { played } = initialFigure();
  const reach = Math.max(played.was.x + played.was.width, played.now.x + played.now.width);
  const s = Math.min(PANEL_W / reach, PANEL_H / KWIN_MONITOR.height);
  const box = (r: { x: number; y: number; width: number; height: number }) => ({ x: r.x * s, y: r.y * s, w: r.width * s, h: r.height * s });
  const mon = box(KWIN_MONITOR);
  // Solid: where the canvas leaves the window. Dashed: the other place it was.
  const solid = box(played.final);
  const other = played.final.x === played.now.x && played.final.y === played.now.y ? played.was : played.now;
  const ghost = box(other);
  const ghostLeft = ghost.x < solid.x;
  const arrowY = ghost.y + ghost.h / 2;
  const below = Math.max(ghost.y + ghost.h, solid.y + solid.h) + 16;
  return {
    line: ruleSentence(played.result, played.final),
    figure: (
      <Panel>
        <Shapes>
          <rect x={mon.x + 2} y={mon.y + 2} width={mon.w - 4} height={mon.h - 4} fill={BG} />
          <rect x={mon.x + 12} y={mon.y + 12} width={mon.w - 24} height={mon.h - 24} fill="none" stroke={MUTED} strokeOpacity={0.4} strokeWidth={2} />
          <rect x={ghost.x} y={ghost.y} width={ghost.w} height={ghost.h} fill={HIT} />
          <rect x={mon.x + 2} y={mon.y + 2} width={mon.w - 4} height={mon.h - 4} fill="none" stroke={FG} strokeWidth={4} />
          <rect x={ghost.x} y={ghost.y} width={ghost.w} height={ghost.h} fill="none" stroke={FG} strokeWidth={3} strokeDasharray="9 6" />
          <rect x={solid.x} y={solid.y} width={solid.w} height={solid.h} fill={FG} />
          {arrow(ghostLeft ? ghost.x + ghost.w + 16 : ghost.x - 16, arrowY, ghostLeft ? solid.x - 18 : solid.x + solid.w + 18, solid.y + solid.h / 2, ACCENT, 4)}
        </Shapes>
        <Txt x={mon.x + 22} y={mon.y + 24} size={20} color={MUTED}>{`monitor ${KWIN_MONITOR.width}x${KWIN_MONITOR.height}`}</Txt>
        <Txt x={mon.x + mon.w + 14} y={below} size={26} bold>KWin put it here</Txt>
        <Txt x={solid.x - 360} y={below} w={solid.w + 360} size={26} bold align="right">
          {played.result.verdict === "revert" ? "the canvas puts it back" : "the canvas adopts it"}
        </Txt>
      </Panel>
    ),
  };
}

// ─── chordist: the similarity matrix, matches outlined ───────────────────

function chordist(): OgFigure {
  // The chart the figure opens on: the full chart with one row left out ('Twas grace…, the fifth).
  const missing = GRACE_ROWS.findIndex((r) => r.startsWith("'Twas"));
  const rows = GRACE_ROWS.filter((_, k) => k !== missing);
  const lines = GRACE_LINES.map((l) => l.text);
  const a = alignDetail(rows, lines);
  const n = rows.length;
  const m = lines.length;
  const cell = Math.floor(PANEL_H / n);
  const gx = 4;
  const matched = a.match.filter((j) => j !== null).length;
  const used = new Set(a.match.filter((j): j is number => j !== null));
  const unmatched = Array.from({ length: m }, (_, j) => j).filter((j) => !used.has(j));
  const rx = gx + m * cell + 64;
  return {
    figure: (
      <Panel>
        <Shapes>
          {a.similarity.map((row, i) =>
            row.map((v, j) => (
              <rect key={`${i}-${j}`} x={gx + j * cell} y={i * cell} width={cell - 2} height={cell - 2} fill={FG} fillOpacity={0.06 + 0.94 * v} />
            )),
          )}
          {unmatched.map((j) => (
            <rect key={`u${j}`} x={gx + j * cell - 3} y={-1} width={cell + 2} height={n * cell + 2} fill="none" stroke={MUTED} strokeWidth={6} strokeDasharray="12 7" />
          ))}
          {a.match.map((j, i) =>
            j === null ? null : <rect key={`m${i}`} x={gx + j * cell - 2} y={i * cell - 2} width={cell + 2} height={cell + 2} fill="none" stroke={ACCENT} strokeWidth={7} />,
          )}
          <rect x={rx} y={PANEL_H - 68} width={24} height={24} fill="none" stroke={ACCENT} strokeWidth={6} />
          <rect x={rx + 5} y={PANEL_H - 36} width={14} height={32} fill="none" stroke={MUTED} strokeWidth={5} strokeDasharray="9 5" />
        </Shapes>
        <Txt x={rx} y={0} size={88} bold>{`${matched}`}</Txt>
        <Txt x={rx} y={94} size={28}>{`of ${n} rows land on their own line,`}</Txt>
        <Txt x={rx} y={128} size={28}>{`though ${unmatched.length === 1 ? "one line has" : "some lines have"} no row`}</Txt>
        <Txt x={rx + 38} y={PANEL_H - 67} size={22} color={MUTED}>matched pair; darker = more words shared</Txt>
        <Txt x={rx + 38} y={PANEL_H - 31} size={22} color={MUTED}>{`line with no row (of ${m})`}</Txt>
      </Panel>
    ),
  };
}

// ─── shutup: blocks and jolts on a time axis ─────────────────────────────

function shutup(): OgFigure {
  const shape = layout(REACH);
  const out = replay(REACH, ALL_ON);
  const axisMs = shape.endMs + WINDOW_MS;
  const L = 220;
  const W = PANEL_W - L - 8;
  const x = (ms: number) => L + (Math.min(ms, axisMs) / axisMs) * W;
  const extra = PANEL_H - 236;
  const lanes = { prox: 54 + Math.round(extra / 3), jolt: 112 + Math.round((extra * 2) / 3), band: 170 + extra };
  const ticks: number[] = [];
  for (let t = 0; t <= axisMs; t += 1000) ticks.push(t);
  const o = out.outcome;
  const word =
    o.kind === "ringing"
      ? "The call keeps ringing."
      : o.kind === "silenced"
        ? `The ringer is silenced at ${sec(o.atMs)}.`
        : o.kind === "answered"
          ? `The call is answered at ${sec(o.atMs)}.`
          : `The call is ended at ${sec(o.atMs)}.`;
  return {
    figure: (
      <Panel>
        <Shapes>
          <rect x={L} y={lanes.prox} width={W} height={42} fill={MUTED} fillOpacity={0.14} />
          {shape.blocks
            .filter((b) => b.near)
            .map((b) => (
              <rect key={b.fromMs} x={x(b.fromMs)} y={lanes.prox} width={x(b.toMs) - x(b.fromMs)} height={42} fill={FG} />
            ))}
          {shape.jolts.map((t) => (
            <g key={t}>
              <line x1={x(t)} y1={lanes.jolt - 4} x2={x(t)} y2={lanes.jolt + 46} stroke={FG} strokeWidth={3} />
              <polygon points={`${x(t)},${lanes.jolt} ${x(t) + 20},${lanes.jolt + 22} ${x(t)},${lanes.jolt + 44} ${x(t) - 20},${lanes.jolt + 22}`} fill={HIT} stroke={FG} strokeWidth={3} />
            </g>
          ))}
          {out.bands.map((b) => (
            <rect key={`${b.rule}${b.fromMs}`} x={x(b.fromMs)} y={lanes.band} width={Math.max(2, x(b.toMs) - x(b.fromMs))} height={30} fill={HIT} stroke={FG} strokeWidth={2} />
          ))}
          <line x1={L} y1={lanes.band + 40} x2={L + W} y2={lanes.band + 40} stroke={FG} strokeWidth={2} />
          {ticks.map((t) => (
            <line key={t} x1={x(t)} y1={lanes.band + 40} x2={x(t)} y2={lanes.band + 48} stroke={FG} strokeWidth={2} />
          ))}
        </Shapes>
        <Txt x={0} y={2} size={38} bold>{word}</Txt>
        <Txt x={0} y={lanes.prox + 8} size={26} color={MUTED}>sensor near</Txt>
        <Txt x={0} y={lanes.jolt + 10} size={26} color={MUTED}>phone grabbed</Txt>
        <Txt x={0} y={lanes.band + 2} size={26} color={MUTED}>rules holding</Txt>
        {ticks.map((t) => (
          <Txt key={`t${t}`} x={x(t) - 30} y={lanes.band + 52} w={60} size={22} color={MUTED} align="center">
            {t === 0 ? "0" : `${t / 1000} s`}
          </Txt>
        ))}
      </Panel>
    ),
  };
}

// ─── sudostamp: the requests and what the phone did with each ────────────

/** The words and the bar colour of a row, as the note's own log chooses them. */
function rowLook(r: Row): { word: string; color: string } {
  const costly = r.asked !== r.askedUnderOther && r.asked;
  const word = r.outcome === "refused" ? "Refused, phone stayed silent" : r.outcome === "approved" ? "Asked, you approved" : r.outcome === "denied" ? "Asked, you denied" : "Asked, no answer";
  return { word, color: r.outcome === "refused" ? OK : costly ? WARN : MUTED };
}

function sudostamp(): OgFigure {
  const rows = timeline(EXAMPLE, "computer");
  const rowH = Math.floor(PANEL_H / rows.length);
  return {
    figure: (
      <Panel>
        <Shapes>
          {rows.map((r, i) => (
            <g key={r.n}>
              <rect x={0} y={i * rowH + 6} width={12} height={rowH - 12} fill={rowLook(r).color} />
              <line x1={0} y1={(i + 1) * rowH} x2={PANEL_W} y2={(i + 1) * rowH} stroke={MUTED} strokeOpacity={0.35} strokeWidth={2} />
            </g>
          ))}
        </Shapes>
        {rows.map((r, i) => {
          const y = i * rowH + (rowH - 34) / 2;
          return (
            <div key={r.n} style={{ display: "flex" }}>
              <Txt x={36} y={y} size={34} color={MUTED}>{clockText(r.atMs)}</Txt>
              <Txt x={150} y={y} size={34} bold>{COMPUTER_NAME[r.from]}</Txt>
              <Txt x={440} y={y} size={34} bold={r.outcome === "refused"} color={r.outcome === "refused" ? OK : FG}>{rowLook(r).word}</Txt>
            </div>
          );
        })}
      </Panel>
    ),
  };
}

// ─── the registry ────────────────────────────────────────────────────────

export const OG_FIGURES: Record<string, () => OgFigure> = {
  "plutus-what-the-backtest-cannot-tell-you": plutus,
  "crush80-open-firmware": crush80,
  "homelab-git-is-the-truth": homelab,
  "tizen-video-plane-ambilight": tizen,
  "kwin-canvas-frame-classifier": kwin,
  "chordist-chart-alignment": chordist,
  "shutup-wave-or-reach": shutup,
  "sudostamp-refuse-before-asking": sudostamp,
};

/** The figure for a note's card, or null: colophon and older notes keep the text-only card. */
export function ogFigure(slug: string): OgFigure | null {
  const make = OG_FIGURES[slug];
  return make ? make() : null;
}
