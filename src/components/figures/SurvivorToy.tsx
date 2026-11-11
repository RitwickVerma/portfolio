"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";
import { Actions, FigureFrame, Fold, Presets, QuietAction, Verdict } from "./kit";
import { UNIVERSES, gap, pctText } from "@/lib/plutusResults";
import { TOY, makeWorld, runToy, averageOver, type Universe } from "@/lib/survivorship";

// A synthetic market you can run. 300 invented stocks with identical odds, a
// rule with nothing to find, and one switch for where the rule picks from.
// Seeded, so the same inputs draw the same picture.

const WORLDS = 20;
/** The real gap the toy is compared with: today's members against members as they stood, from the result rows. */
const REAL_GAP = gap(UNIVERSES.find((u) => u.id === "today")!, UNIVERSES.find((u) => u.id === "then")!);
const PRESETS: ReadonlyArray<{ id: Universe; label: string }> = [
  { id: "survivors", label: "Only stocks still listed today" },
  { id: "then", label: "Everyone who existed then" },
];

/** Log-scale polyline in a 0..100 box. */
function line(values: number[], lo: number, hi: number): string {
  const n = values.length - 1;
  return values.map((v, i) => `${((i / n) * 100).toFixed(1)},${(100 - ((Math.log(v) - lo) / (hi - lo)) * 100).toFixed(1)}`).join(" ");
}

export default function SurvivorToy() {
  const id = useId();
  const [universe, setUniverse] = useState<Universe>("survivors");
  const [rate, setRate] = useState(TOY.delistRate);
  const [seed, setSeed] = useState(TOY.seed);
  const slow = useDeferredValue(rate);

  const { world, mean } = useMemo(() => {
    const p = { ...TOY, seed, delistRate: slow };
    const w = makeWorld(p);
    return { world: { then: runToy(w, "then"), survivors: runToy(w, "survivors") }, mean: averageOver(p, WORLDS) };
  }, [seed, slow]);

  const run = world[universe];
  const lo = Math.log(Math.min(...run.strategy, ...run.market) * 0.95);
  const hi = Math.log(Math.max(...run.strategy, ...run.market) * 1.05);
  const yOf = (v: number) => 100 - ((Math.log(v) - lo) / (hi - lo)) * 100;
  const ticks = [0.5, 1, 2, 3, 5, 10].filter((t) => Math.log(t) > lo && Math.log(t) < hi);
  const years = (run.strategy.length - 1) / 12;
  const pick = universe === "survivors" ? mean.survivors : mean.then;
  const edge = (pick - mean.market) * 100;
  const end = (a: number[]) => a[a.length - 1];
  const rows: Array<{ id: string; label: string; one: number; avg: number }> = [
    { id: "market", label: "The market: every stock that existed", one: world.then.marketCagr, avg: mean.market },
    { id: "then", label: "Rule, picking from everyone who existed then", one: world.then.strategyCagr, avg: mean.then },
    { id: "survivors", label: "Rule, picking from stocks still listed today", one: world.survivors.strategyCagr, avg: mean.survivors },
  ];

  return (
    <FigureFrame
      claim="Give a rule with no skill only the stocks that survived, and it looks skilful."
      how={
        <>
          A made-up market where every stock has the same odds. Survivors are the stocks still listed at the end. Press <b className="font-semibold text-fg">Everyone who existed then</b> and watch the solid line fall to the dashed one.
        </>
      }
      caption="Synthetic: 300 invented stocks and a crude delisting rule, nothing from Plutus or any real market; it shows the direction, and the real gap above is larger than this reaches."
      about={
        <>
          <p>
            {TOY.stocks} invented stocks, {TOY.months / 12} years of monthly returns drawn from one distribution, so no stock has better odds than another and there is nothing for a rule to find. A stock that has halved from its high
            is four times as likely to be delisted (dropped from the market, usually after failing) as a healthy one, and the delisting month is a flat −40%. The rule is the repo&apos;s idea in spirit, not its code or data: each month buy the{" "}
            {TOY.picks} stocks that rose most from 12 months ago to one month ago, equal amounts, no costs. There is no index membership.
          </p>
          <p>Seed {seed}. The numbers in the sentence are the mean of {WORLDS} worlds (seeds {seed} to {seed + WORLDS - 1}) so one lucky draw cannot stand for the rule. At the top of the slider the toy reaches a gap smaller than the real {REAL_GAP.toFixed(1)} points.</p>
        </>
      }
    >
      <Presets label="Pick from" items={PRESETS} active={universe} onPick={setUniverse} />
      <div>
        <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-2">
          <div className="relative" aria-hidden="true">
            {ticks.map((t) => (
              <span key={t} className="fact absolute right-0 -translate-y-1/2 tabular-nums" style={{ top: `${yOf(t)}%` }}>
                {t}×
              </span>
            ))}
          </div>
          <div className="relative">
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              role="img"
              aria-label={`Growth of one dollar over ${years} years on a log scale: the market ends at ${end(run.market).toFixed(2)}, the rule at ${end(run.strategy).toFixed(2)}`}
              className="h-48 w-full border-b border-l border-border sm:h-56"
            >
              {ticks.map((t) => (
                <line key={t} x1={0} x2={100} y1={yOf(t)} y2={yOf(t)} stroke="var(--border)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              ))}
              <polyline points={line(run.market, lo, hi)} fill="none" stroke="var(--muted)" strokeWidth={1.5} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
              <polyline points={line(run.strategy, lo, hi)} fill="none" stroke="var(--fg)" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="text-[0.95rem] leading-snug text-fg/75 absolute left-2 top-1 rounded-[3px] bg-background/85 px-1.5 py-0.5 leading-snug">
              <div className="text-fg">
                <span aria-hidden="true">━ </span>In this world the rule: <span className="tabular-nums font-semibold">{end(run.strategy).toFixed(1)}×</span> in {years} years
              </div>
              <div>
                <span aria-hidden="true">╌ </span>the market: <span className="tabular-nums font-semibold">{end(run.market).toFixed(1)}×</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Verdict tone={universe === "survivors" ? (edge > 1 ? "warn" : "plain") : Math.abs(edge) < 1 ? "ok" : "plain"} title={`${universe === "survivors" ? "Surviving stocks only" : "Everyone who existed"}: ${pctText(pick * 100)} a year, the market ${pctText(mean.market * 100)}.`}>
        {universe === "survivors"
          ? edge > 1
            ? `No stock here has better odds than another, so the extra ${edge.toFixed(1)} points a year is the list's doing: the rule never held a company that later disappeared.`
            : `With this few stocks disappearing, the surviving list is nearly the whole market, and the rule is ${Math.abs(edge).toFixed(1)} points from it: there is almost nothing for the list to hide.`
          : Math.abs(edge) < 1
            ? "With the whole market to choose from, the rule earns about what the market does, which is what a rule with nothing to find should do."
            : `With the whole market to choose from, the rule is ${Math.abs(edge).toFixed(1)} points from the market, far less than the survivors-only list gave it.`}{" "}
        Average of {WORLDS} made-up worlds.
      </Verdict>
      <Actions>
        <QuietAction onClick={() => setSeed((s) => s + 1)}>Draw another world (seed {seed})</QuietAction>
      </Actions>
      <Fold summary="More controls and the numbers">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <label htmlFor={`${id}-rate`} className="text-[0.95rem] text-fg">
            Stocks that fail and leave the market, per year: <span className="tabular-nums font-semibold">{pctText(rate * 100, 0)}</span>
          </label>
          <input
            id={`${id}-rate`}
            type="range"
            min={0}
            max={0.12}
            step={0.01}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            aria-valuetext={`${Math.round(rate * 100)} percent a year`}
            className="h-11 w-52 max-w-full accent-fg"
          />
        </div>
        {slow === 0 ? <p className="text-[0.95rem] leading-snug text-fg/75 mt-1">With nothing delisted there is nobody to leave out, and the two lists are the same list.</p> : null}
        <table className="mt-3 w-full border-collapse text-[0.95rem]">
          <caption className="sr-only">Yearly return in the toy market, this world and the mean of {WORLDS} worlds</caption>
          <thead className="text-[0.95rem] leading-snug text-fg/75 text-left">
            <tr>
              <th scope="col" className="border-b border-fg py-1.5 pr-3 font-normal"><span className="sr-only">Who</span></th>
              <th scope="col" className="border-b border-fg py-1.5 pr-3 text-right font-normal">This world</th>
              <th scope="col" className="border-b border-fg py-1.5 text-right font-normal">Mean of {WORLDS}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <th scope="row" className="border-b border-border py-1.5 pr-3 text-left font-normal leading-snug">{r.label}</th>
                <td className="border-b border-border py-1.5 pr-3 text-right tabular-nums">{pctText(r.one * 100)}</td>
                <td className="border-b border-border py-1.5 text-right tabular-nums">{pctText(r.avg * 100)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Fold>
    </FigureFrame>
  );
}
