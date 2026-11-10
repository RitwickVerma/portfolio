"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";
import { Actions, FigureFrame, Fold, Presets, QuietAction, Segmented, Verdict } from "./kit";
import { EQUITY_WEEKLY } from "@/lib/plutusEquity";
import { histogram, pathStats, returnsOf, stationaryBootstrap, summarize } from "@/lib/bootstrap";
import { pctText } from "@/lib/plutusResults";

// The one path the backtest drew, and what the repo's block bootstrap makes of
// it, run in the browser on weekly points of the real equity curve. The spread
// is luck inside this path; it cannot see who was let into the universe.

const SAMPLES = 1000;
const BINS = 30;
const SEED = 42;
const YEARS = (Date.parse(EQUITY_WEEKLY[EQUITY_WEEKLY.length - 1][0]) - Date.parse(EQUITY_WEEKLY[0][0])) / (365.25 * 86400000);
const VALUES = EQUITY_WEEKLY.map((r) => r[1]);
const RETURNS = returnsOf(VALUES);
const ACTUAL = pathStats(RETURNS, YEARS);
const REAL_PATH = VALUES.map((v) => v / VALUES[0]).filter((_, i) => i % 4 === 0);

type Metric = "cagr" | "maxDrawdown";
const METRICS: ReadonlyArray<{ id: Metric; label: string }> = [
  { id: "cagr", label: "Yearly return" },
  { id: "maxDrawdown", label: "Worst fall" },
];
const PIECES = [
  { id: "1", label: "1 week" },
  { id: "4", label: "4 weeks" },
  { id: "26", label: "6 months" },
] as const;

const pt = (x: number, y: number) => `${x.toFixed(1)},${y.toFixed(1)}`;

export default function BootstrapPath() {
  const id = useId();
  const [metric, setMetric] = useState<Metric>("cagr");
  const [block, setBlock] = useState(4);
  const [seed, setSeed] = useState(SEED);
  const slow = useDeferredValue(block);

  const boot = useMemo(() => stationaryBootstrap(RETURNS, YEARS, { samples: SAMPLES, meanBlock: slow, seed, paths: 12, pathStep: 5 }), [slow, seed]);

  const values = boot[metric];
  const actual = ACTUAL[metric];
  const s = summarize(values, actual);
  const sCagr = summarize(boot.cagr, ACTUAL.cagr);
  const sDd = summarize(boot.maxDrawdown, ACTUAL.maxDrawdown);
  const sSh = summarize(boot.sharpe, ACTUAL.sharpe);

  const min = Math.min(...values, actual);
  const max = Math.max(...values, actual);
  const pad = (max - min) * 0.04;
  const lo = min - pad;
  const hi = max + pad;
  const counts = histogram(values, BINS, lo, hi);
  const peak = Math.max(...counts);
  const x = (v: number) => ((v - lo) / (hi - lo)) * 100;
  const xTicks: number[] = [];
  for (let t = Math.ceil(lo / 0.1) * 0.1; t <= hi; t += 0.1) xTicks.push(Math.round(t * 100) / 100);
  const clamp = (v: number) => Math.min(88, Math.max(12, v));
  const what = metric === "cagr" ? "yearly return" : "worst fall from a peak";

  // The fan of resampled paths, on a log scale from 1.
  const top = Math.log(Math.max(...REAL_PATH, ...boot.paths.map((p) => Math.max(...p))) * 1.08);
  const y = (v: number) => 100 - (Math.log(v) / top) * 100;
  const pathTicks = [1, 3, 10, 30, 100].filter((t) => Math.log(t) < top);
  const realLine = REAL_PATH.map((v, i) => pt((i / (REAL_PATH.length - 1)) * 100, y(v))).join(" ");
  const finals = boot.paths.map((p) => p[p.length - 1]);

  const doBetter = Math.round(s.rank * 100);

  return (
    <FigureFrame
      claim="A backtest is one path. Deal the same weeks out in a new order a thousand times and the result swings widely."
      how={
        <>
          Press a piece length: the real weeks are cut into pieces of about that size and dealt again at random, 1,000 times. The tall vertical line marks what the real backtest got.
        </>
      }
      caption="The real equity curve of the backtest below, resampled in your browser; because the path comes from the survivor universe, the bias is inside every reshuffle and no spread here can show it."
      about={
        <>
          <p>
            The curve is the 2007 to 2026 backtest, thinned to every fifth trading day (about {EQUITY_WEEKLY.length} points), so the worst fall reads about two points shallower than the daily figure in the table. The resampling is
            the repo&apos;s stationary bootstrap: a piece continues with probability 1 − 1/mean piece length, otherwise it jumps to a random week and starts a new one. The repo uses 21 trading days, about 4 weeks, on daily data;
            this uses weeks. Seed {seed}; {SAMPLES.toLocaleString("en-US")} reshuffles.
          </p>
          <p>The yearly return is the compound rate over {YEARS.toFixed(1)} years; the worst fall is the deepest drop from a previous high.</p>
        </>
      }
    >
      <Presets
        label="Piece length"
        items={PIECES}
        active={PIECES.some((p) => p.id === String(block)) ? (String(block) as (typeof PIECES)[number]["id"]) : null}
        onPick={(p) => setBlock(Number(p))}
      />
      <Segmented label="Show" options={METRICS} value={metric} onChange={setMetric} />
      <div className="relative pt-7">
        <span className="absolute top-0 whitespace-nowrap text-[0.95rem] font-semibold tabular-nums text-fg" style={{ left: `${clamp(x(actual))}%`, transform: "translateX(-50%)" }}>
          real: {pctText(actual * 100)}
        </span>
        <div className="relative">
          <svg
            viewBox="0 0 100 40"
            preserveAspectRatio="none"
            role="img"
            aria-label={`Histogram of ${what} over ${SAMPLES} reshuffles, from ${pctText(lo * 100, 0)} to ${pctText(hi * 100, 0)}; the real backtest's own value is ${pctText(actual * 100)}`}
            className="h-40 w-full border-b border-fg"
          >
            {counts.map((c, i) => (
              <rect key={i} x={(i / BINS) * 100 + 0.2} width={100 / BINS - 0.4} y={40 - (c / peak) * 38} height={(c / peak) * 38} fill="var(--fg)" fillOpacity={0.3} />
            ))}
            <rect x={x(s.lo)} width={x(s.hi) - x(s.lo)} y={38.5} height={1.5} fill="var(--fg)" />
            <line x1={x(actual)} x2={x(actual)} y1={0} y2={40} stroke="var(--fg)" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
        <div className="relative mt-1 h-6" aria-hidden="true">
          {xTicks.map((t) => (
            <span key={t} className="fact absolute -translate-x-1/2 tabular-nums" style={{ left: `${x(t)}%` }}>
              {Math.round(t * 100)}%
            </span>
          ))}
        </div>
        <p className="fact mt-1">
          Bars: how many of the {SAMPLES.toLocaleString("en-US")} reshuffles ended near each {what}. Thick line under them: the middle 95%, {pctText(s.lo * 100, 0)} to {pctText(s.hi * 100, 0)}.
        </p>
      </div>
      <Verdict title={`The same weeks give ${metric === "cagr" ? "yearly returns" : "worst falls"} from ${pctText(s.lo * 100, 0)} to ${pctText(s.hi * 100, 0)}.`}>
        The real run got {pctText(actual * 100)}, which beat {doBetter} of every 100 reshuffles. All of that spread is luck inside one path; it does not include the choice of companies.
      </Verdict>
      <Actions>
        <QuietAction onClick={() => setSeed((v) => v + 1)}>Deal again (seed {seed})</QuietAction>
      </Actions>
      <Fold summary="More controls, the path itself and the numbers">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <label htmlFor={`${id}-block`} className="text-[0.95rem] text-fg">
            Piece length: <span className="tabular-nums font-semibold">{block} {block === 1 ? "week" : "weeks"}</span> on average
          </label>
          <input
            id={`${id}-block`}
            type="range"
            min={1}
            max={52}
            step={1}
            value={block}
            onChange={(e) => setBlock(Number(e.target.value))}
            aria-valuetext={`${block} ${block === 1 ? "week" : "weeks"}`}
            className="h-11 w-52 max-w-full accent-fg"
          />
        </div>
        <p className="fact mt-3 mb-1">The real path (thick) and 12 of the reshuffles, growth of 1 on a log scale over {YEARS.toFixed(1)} years</p>
        <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-2">
          <div className="relative" aria-hidden="true">
            {pathTicks.map((t) => (
              <span key={t} className="fact absolute right-0 -translate-y-1/2 tabular-nums" style={{ top: `${y(t)}%` }}>
                {t}×
              </span>
            ))}
          </div>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            role="img"
            aria-label={`The backtest path ends at ${(VALUES[VALUES.length - 1] / VALUES[0]).toFixed(0)} times its start; twelve reshuffled paths end between ${Math.min(...finals).toFixed(0)} and ${Math.max(...finals).toFixed(0)} times`}
            className="h-44 w-full border-b border-l border-border"
          >
            {pathTicks.map((t) => (
              <line key={t} x1={0} x2={100} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            ))}
            {boot.paths.map((p, k) => (
              <polyline key={k} points={p.map((v, i) => pt((i / (p.length - 1)) * 100, y(v))).join(" ")} fill="none" stroke="var(--muted)" strokeOpacity={0.55} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            ))}
            <polyline points={realLine} fill="none" stroke="var(--fg)" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
        <div role="region" aria-label="Numbers from the reshuffles, scrolls sideways" tabIndex={0} className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[22rem] border-collapse text-[0.95rem]">
          <caption className="sr-only">
            Reshuffles of the weekly backtest path, {SAMPLES} of them, mean piece {block} weeks, seed {seed}
          </caption>
          <thead className="fact text-left">
            <tr>
              <th scope="col" className="border-b border-fg py-1.5 pr-2 font-normal"><span className="sr-only">Number</span></th>
              <th scope="col" className="border-b border-fg py-1.5 pr-2 font-normal">Real</th>
              <th scope="col" className="border-b border-fg py-1.5 pr-2 font-normal">Median</th>
              <th scope="col" className="border-b border-fg py-1.5 pr-2 font-normal">Low 2.5%</th>
              <th scope="col" className="border-b border-fg py-1.5 font-normal">High 97.5%</th>
            </tr>
          </thead>
          <tbody>
            {[
              { n: "Yearly return", a: pctText(ACTUAL.cagr * 100), b: sCagr, f: (v: number) => pctText(v * 100) },
              { n: "Worst fall", a: pctText(ACTUAL.maxDrawdown * 100), b: sDd, f: (v: number) => pctText(v * 100) },
              { n: "Sharpe", a: ACTUAL.sharpe.toFixed(2), b: sSh, f: (v: number) => v.toFixed(2) },
            ].map((r) => (
              <tr key={r.n}>
                <th scope="row" className="border-b border-border py-1.5 pr-2 text-left font-normal">{r.n}</th>
                <td className="border-b border-border py-1.5 pr-2 tabular-nums">{r.a}</td>
                <td className="border-b border-border py-1.5 pr-2 tabular-nums">{r.f(r.b.median)}</td>
                <td className="border-b border-border py-1.5 pr-2 tabular-nums">{r.f(r.b.lo)}</td>
                <td className="border-b border-border py-1.5 tabular-nums">{r.f(r.b.hi)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Fold>
    </FigureFrame>
  );
}
