"use client";

import { useState } from "react";
import { CLOCK_HZ, MEASURED, driftVerdict, grouped, tick, tickMarks } from "@/lib/tickDrift";
import { FigureFrame, Fold, Presets, Verdict } from "./kit";

// The tick arithmetic from lib/tickDrift.ts, drawn to scale: where the firmware
// expects its first ten ticks and where the hardware delivers them.

const RATES = [
  { id: "8000", label: "8,000 a second, as it is now" },
  { id: "10000", label: "10,000 a second, as it was" },
  { id: "20000", label: "20,000 a second" },
] as const;
const MARKS = 10;

function trim(n: number, d = 2): string {
  return String(Number(n.toFixed(d)));
}

export default function ClockDrift() {
  const [text, setText] = useState("10000");
  const rate = /^\d+$/.test(text) ? Number(text) : NaN;
  const t = tick(rate);
  const v = driftVerdict(t);
  const marks = t ? tickMarks(t, MARKS) : null;
  const span = t ? MARKS * t.exactCycles : 1;
  const gap = t ? MARKS * (t.exactCycles - t.cycles) : 0;

  return (
    <FigureFrame
      claim="One rounding error made the keyboard's clock run 6.7% fast."
      how="The firmware counts time in ticks, each a whole number of beats of a 32 kHz clock. Press a rate and see how long its tick really is."
      caption="The sum is the tick division and nothing else; the two measured results are the repository's, not re-measured here."
      about={
        <>
          <p>
            The kernel works out how many hardware cycles make one tick by integer division: {grouped(CLOCK_HZ)} cycles a second divided by the ticks a second. At 10,000 that is 3.2, which becomes 3, so a tick arrives every 3 cycles and the kernel still counts it as a ten-thousandth of a second. At 8,000 it is exactly 4. The fix is one line, <code className="font-mono text-[0.85em] [overflow-wrap:anywhere]">CONFIG_SYS_CLOCK_TICKS_PER_SEC=8000</code>, in commit f1a7b77.
          </p>
          <p>
            The figure treats the 32 kHz clock as {grouped(CLOCK_HZ)} cycles a second, which is where the commit&rsquo;s 3.2 comes from. It does not model the clock&rsquo;s own error: the commit says the clock itself was fine.
          </p>
        </>
      }
    >
      <Presets
        items={RATES}
        active={RATES.find((r) => r.id === text)?.id ?? null}
        onPick={(id) => setText(id)}
      />

      <div>
        <p className="wd-semi text-lg sm:text-xl font-bold leading-snug" data-testid="division">
          {t
            ? `${grouped(CLOCK_HZ)} ÷ ${grouped(t.ticksPerSecond)} = ${trim(t.exactCycles)} cycles per tick${t.exactCycles === t.cycles ? "" : `, rounded down to ${t.cycles}`}`
            : `${grouped(CLOCK_HZ)} ÷ ${Number.isFinite(rate) ? grouped(rate) : "?"} is not a whole number of cycles`}
        </p>
        {marks && t ? (
          <div
            role="img"
            aria-label={`The first ${MARKS} ticks. The firmware expects the tenth at ${trim(span)} cycles; the hardware delivers it at ${trim(marks.actual[MARKS - 1])}.`}
            className="mt-3"
          >
            {[
              { name: "Where the firmware expects ticks", at: marks.expected },
              { name: "Where the hardware delivers them", at: marks.actual },
            ].map((row) => (
              <div key={row.name} className="mb-3">
                <p className="text-[0.8125rem] leading-tight">{row.name}</p>
                <div className="relative mt-1 h-8 border-b-2 border-fg">
                  {row.at.map((c, i) => (
                    <span key={i} className="absolute bottom-0 w-0.5 -translate-x-1/2 bg-fg" style={{ left: `${(c / span) * 100}%`, height: i === MARKS - 1 ? "100%" : "60%" }} />
                  ))}
                  {/* The hardware's tenth tick arrives early; the shaded stretch is how early. */}
                  {gap > 0 && row.at === marks.actual && (
                    <span className="absolute bottom-0 h-full bg-warn/40" style={{ left: `${(marks.actual[MARKS - 1] / span) * 100}%`, right: 0 }} />
                  )}
                </div>
              </div>
            ))}
            <div className="relative mt-1 h-5 text-[0.8125rem] leading-none" aria-hidden="true">
              {marks.expected.map((c, i) => (
                <span key={i} className={`absolute ${i === MARKS - 1 ? "right-0" : "-translate-x-1/2"}`} style={i === MARKS - 1 ? undefined : { left: `${(c / span) * 100}%` }}>
                  {i + 1}
                </span>
              ))}
            </div>
            <p className="fact mt-0 text-[0.8125rem]" aria-hidden="true">Tick number</p>
            <p className="text-[0.8125rem] leading-snug">
              {gap > 0
                ? `Shaded: by the tenth tick the hardware is ${trim(gap)} of ${trim(span)} cycles early, and the gap grows with every tick.`
                : `Both rows agree: the tenth tick lands on cycle ${trim(span)} in each.`}
            </p>
          </div>
        ) : null}
      </div>

      <Verdict tone={v.tone} title={v.title}>
        {v.body}
        <span className="block fact mt-1">
          Measured on the keyboard over 60 s: the clock read {MEASURED.before.ratio} times real time at {grouped(MEASURED.before.ticksPerSecond)} ticks a second, and {MEASURED.after.ratio} at {grouped(MEASURED.after.ticksPerSecond)}.
        </span>
      </Verdict>

      <div className="space-y-1">
        <Fold summary="More controls">
          <label className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="fact">Ticks a second, any whole number up to {grouped(CLOCK_HZ)}</span>
            <input
              type="text"
              inputMode="numeric"
              value={text}
              onChange={(e) => setText(e.target.value.trim())}
              aria-invalid={!t}
              className="min-h-11 sm:min-h-9 w-28 rounded-[var(--r-chip)] border border-fg/40 bg-background px-3 text-[0.95rem] outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </label>
        </Fold>
        {t && (
          <Fold summary="The arithmetic">
            <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-1 text-[0.95rem]">
              <dt className="text-muted">Cycles per tick, exact</dt>
              <dd>{trim(t.exactCycles, 4)}</dd>
              <dt className="text-muted">Cycles per tick, used</dt>
              <dd>{t.cycles}</dd>
              <dt className="text-muted">A tick really lasts</dt>
              <dd>{trim((t.cycles / CLOCK_HZ) * 1e6, 2)} µs</dd>
              <dt className="text-muted">The kernel counts it as</dt>
              <dd>{trim(1e6 / t.ticksPerSecond, 2)} µs</dd>
              <dt className="text-muted">Clock time per real second</dt>
              <dd>{trim(t.ratio, 4)}</dd>
            </dl>
          </Fold>
        )}
      </div>
    </FigureFrame>
  );
}
