"use client";

import { useState } from "react";
import { Actions, FigureFrame, Fold, Presets, QuietAction, Verdict } from "./kit";
import {
  DEFAULT_SETTLE_MS, MEASURED, MEASURED_DEFAULT, MEASURED_SETTLE_MS, SLOTS, lapMs, lapSteps, readingsPerSecond, ringPoints, spotHz,
} from "@/lib/ceiling";

// The fallback sampler's ceiling: one formula, two sliders, and the repo's measured
// table to check the formula against.

const PRESETS = [
  { id: "73", label: "One spot per LED: 73" },
  { id: "24", label: "The app's choice: 24" },
  { id: "8", label: "A few: 8" },
] as const;
const AXIS_HZ = 16;
const RW = 160;
const RH = 90;
const hz = (n: number) => (n >= 10 ? n.toFixed(0) : n.toFixed(1));
const pct = (n: number) => `${Math.min(100, (n / AXIS_HZ) * 100)}%`;

export default function Ceiling() {
  const [spots, setSpots] = useState(24);
  const [settle, setSettle] = useState(DEFAULT_SETTLE_MS);
  const [step, setStep] = useState(0);

  const steps = lapSteps(spots);
  const armed = step % steps;
  const a = armed * SLOTS;
  const pts = ringPoints(spots, RW, RH);
  const now = spotHz(spots, settle);
  const lap = lapMs(spots, settle);
  const measured = MEASURED.find((m) => m.spots === spots);
  const active = PRESETS.find((p) => Number(p.id) === spots)?.id ?? null;

  return (
    <FigureFrame
      claim="When the TV hides the picture, the app can read only about 100 colours a second, so every extra spot slows all the others."
      how="Press 73 to see what one spot per LED costs."
      caption={<>A ceiling worked out from two slots and a wait per reading, set beside the repo&apos;s numbers from one TV; it is not a measurement of yours.</>}
      about={
        <>
          <p>
            Protected video withholds the picture, so the app asks the TV&apos;s own colour meter for one small block of the screen at a time. The TV reports {SLOTS} measure slots and a {DEFAULT_SETTLE_MS} ms
            settle time: point both slots, wait, read both. That is the whole model. It has no overhead in it, so real rates sit at or just under it.
          </p>
          <p>
            The repo&apos;s table was measured at {MEASURED_SETTLE_MS} ms, about one frame of a 60 Hz screen, which is as short as a fresh read allows. At the default {DEFAULT_SETTLE_MS} ms the final build read {MEASURED_DEFAULT.readings[0]} to {MEASURED_DEFAULT.readings[1]} readings
            a second, {MEASURED_DEFAULT.hz[0]} to {MEASURED_DEFAULT.hz[1]} Hz per spot at {MEASURED_DEFAULT.spots}. Spot counts outside 8 to 73 were not measured, so the sliders stop there.
          </p>
        </>
      }
    >
      <Presets items={PRESETS} active={active} onPick={(id) => { setSpots(Number(id)); setStep(0); }} />

      <div>
        <svg
          viewBox={`-10 -10 ${RW + 20} ${RH + 20}`}
          role="img"
          aria-label={`${spots} measurement spots round the edge of the screen. Each is refreshed ${hz(now)} times a second.`}
          className="block w-full max-w-[34rem] mx-auto"
        >
          <rect x="0" y="0" width={RW} height={RH} rx="3" className="fill-none stroke-border" />
          {pts.map(([x, y], i) => {
            const on = i === a || i === a + 1;
            return <circle key={i} cx={x} cy={y} r={on ? 4 : spots > 40 ? 1.7 : 2.6} className={on ? "fill-fg" : "fill-muted"} />;
          })}
          <text x={RW / 2} y={RH / 2 - 2} textAnchor="middle" className="fill-fg" fontSize="24" fontWeight="800">{hz(now)} Hz</text>
          <text x={RW / 2} y={RH / 2 + 14} textAnchor="middle" className="fill-muted" fontSize="9.5">each of {spots} spots, re-read every {lap} ms</text>
        </svg>
      </div>

      <Verdict tone={now < 2 ? "warn" : "plain"} title={`Each spot is re-read ${hz(now)} times a second, so a moving picture is followed in steps of ${lap} ms.`}>
        <p>
          {SLOTS} readings every {settle} ms is {readingsPerSecond(settle).toFixed(0)} a second, shared by {spots} spots.
          {measured && settle === MEASURED_SETTLE_MS
            ? ` The repo measured ${measured.text} here.`
            : measured
              ? ` At ${MEASURED_SETTLE_MS} ms the model gives ${hz(spotHz(spots, MEASURED_SETTLE_MS))} Hz; the repo measured ${measured.text}.`
              : " The repo did not measure this count."}
        </p>
      </Verdict>

      <Fold summary="More controls">
        <div className="space-y-4">
          <div>
            <label htmlFor="ceil-spots" className="fact flex items-baseline justify-between gap-3">
              <span>Spots round the screen edge</span>
              <span className="text-fg tabular-nums">{spots}</span>
            </label>
            <input id="ceil-spots" type="range" min={8} max={73} step={1} value={spots} onChange={(e) => { setSpots(Number(e.target.value)); setStep(0); }} className="block w-full h-11 sm:h-9 accent-fg" />
          </div>
          <div>
            <label htmlFor="ceil-settle" className="fact flex items-baseline justify-between gap-3">
              <span>Wait before each reading (settle time)</span>
              <span className="text-fg tabular-nums">{settle} ms</span>
            </label>
            <input id="ceil-settle" type="range" min={MEASURED_SETTLE_MS} max={40} step={1} value={settle} onChange={(e) => setSettle(Number(e.target.value))} className="block w-full h-11 sm:h-9 accent-fg" />
          </div>
          <Actions>
            <QuietAction onClick={() => setSettle(MEASURED_SETTLE_MS)}>Wait {MEASURED_SETTLE_MS} ms, as measured</QuietAction>
            <QuietAction onClick={() => setSettle(DEFAULT_SETTLE_MS)}>Wait {DEFAULT_SETTLE_MS} ms, the TV&apos;s own</QuietAction>
            <QuietAction onClick={() => setStep((n) => n + 1)}>Step the sampler</QuietAction>
          </Actions>
          <p className="fact">
            Step {armed + 1} of {steps}: spots {a + 1}{a + 2 <= spots ? ` and ${a + 2}` : ""} are armed (the large dots), the sampler waits {settle} ms, then reads both.
          </p>
        </div>
      </Fold>

      <Fold summary="The model next to the repo's table">
        <div role="group" aria-label="Model against measurement, in readings per spot per second">
          {MEASURED.map((m) => {
            const model = spotHz(m.spots, settle);
            return (
              <div key={m.spots} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3 gap-y-0.5 py-2 border-b border-border last:border-0">
                <span className="text-[0.95rem] font-semibold">{m.spots} spots</span>
                <span className="relative block h-4" aria-hidden="true">
                  <span className="absolute left-0 top-0 h-1.5 bg-fg" style={{ width: pct(model) }} />
                  <span className="absolute bottom-0 h-1.5 bg-muted" style={{ left: pct(m.lo), width: `max(3px, ${pct(m.hi - m.lo)})` }} />
                </span>
                <span className="col-span-2 fact tabular-nums">
                  model at {settle} ms: <span className="text-fg">{hz(model)} Hz</span>; measured at {MEASURED_SETTLE_MS} ms: {m.text}
                </span>
              </div>
            );
          })}
          <p className="fact mt-2">Upper bar: model. Lower bar: measured range. Scale 0 to {AXIS_HZ} Hz.</p>
        </div>
      </Fold>
    </FigureFrame>
  );
}
