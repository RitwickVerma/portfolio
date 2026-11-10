"use client";

import { useId, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  ALL_ON,
  ARM_DELAY_MS,
  AXIS_MS,
  MAX_BUILD_MS,
  MOTION_HOLD_MS,
  REACH,
  describeOutcome,
  layout,
  replay,
  runCheck,
  sec,
  type CheckReport,
  type Entry,
  type MarkKind,
  type Rule,
  type Step,
  type Switches,
} from "@/lib/shutupStreams";

// ShutUp's wave detection, running here. You build a timeline of proximity
// readings (NEAR and FAR, plus a jolt of the accelerometer); the detectors ported
// from the Kotlin app replay it on a fake clock, and every line below is what
// they reported: what armed, what fired, what was refused and why. Each switch
// removes one rule. The check at the bottom runs the app's property test, ported,
// over seeded random streams in this tab.
//
// The caption says where it stops being the real thing.

const STEP_CHOICES = [250, 500, 1000] as const;
const STREAM_CHOICES = [400, 2000, 10000] as const;
const MAX_STEPS = 40;
const DEFAULT_SEED = 7;
const DEFAULT_STREAMS = 400;

const pct = (ms: number) => `${(Math.min(ms, AXIS_MS) / AXIS_MS) * 100}%`;

/** The server renders the figure at rest; the controls appear once the page is interactive. */
const subscribeNone = () => () => {};
const useHydrated = () =>
  useSyncExternalStore(
    subscribeNone,
    () => true,
    () => false,
  );

const ROWS: { rule: Rule; title: string; name?: string; key?: keyof Switches }[] = [
  { rule: "arming", name: "Arming delay", key: "arming", title: "Waves are ignored for the first second after ringing starts" },
  { rule: "motion", name: "Motion guard", key: "motionGuard", title: "A phone that moves mutes waves and drops a pending one" },
  { rule: "single", name: "Single-wave rule", key: "singleWaveRule", title: "A single wave can only silence" },
  { rule: "wave", title: "A wave is FAR, then NEAR; a second one inside the window makes a double" },
];

const PROPERTIES: { key: "motion" | "arming" | "doubles" | "singleWave"; label: string }[] = [
  { key: "motion", label: `A wave counted within ${sec(MOTION_HOLD_MS)} of the phone moving` },
  { key: "arming", label: `A wave counted in the first ${sec(ARM_DELAY_MS)}` },
  { key: "doubles", label: "A double wave without two separate edges" },
  { key: "singleWave", label: "A single wave that answered or ended the call" },
];

/** One mark per instant on the timeline: a gesture that fired outranks a refusal, which outranks a counted wave. */
function marksOf(entries: Entry[]): { atMs: number; kind: MarkKind }[] {
  const rank: Record<MarkKind, number> = { counted: 0, refused: 1, fired: 2 };
  const byTime = new Map<number, MarkKind>();
  for (const e of entries) {
    if (!e.mark) continue;
    const have = byTime.get(e.atMs);
    if (have === undefined || rank[e.mark] > rank[have]) byTime.set(e.atMs, e.mark);
  }
  return [...byTime].map(([atMs, kind]) => ({ atMs, kind }));
}

const BTN = "btn-quiet disabled:opacity-45 disabled:pointer-events-none !py-2";

export default function WaveOrReach() {
  const ready = useHydrated();
  const id = useId();
  const [steps, setSteps] = useState<Step[]>(REACH);
  const [sw, setSw] = useState<Switches>(ALL_ON);
  const [stepMs, setStepMs] = useState<number>(250);
  const [seedText, setSeedText] = useState(String(DEFAULT_SEED));
  const [streams, setStreams] = useState<number>(DEFAULT_STREAMS);
  const [report, setReport] = useState<CheckReport>(() => runCheck(DEFAULT_SEED, DEFAULT_STREAMS, ALL_ON));
  const [busy, setBusy] = useState(false);

  const out = useMemo(() => replay(steps, sw), [steps, sw]);
  const shape = useMemo(() => layout(steps), [steps]);
  const marks = useMemo(() => marksOf(out.entries), [out]);

  const full = shape.endMs + stepMs > MAX_BUILD_MS;
  const add = (kind: "near" | "far") => setSteps((s) => (s.length < MAX_STEPS ? [...s, { kind, ms: stepMs }] : s));
  const seedValue = Math.max(0, Math.min(2_000_000_000, Math.floor(Number(seedText))));
  const seedOk = seedText.trim() !== "" && Number.isFinite(Number(seedText));

  const run = () => {
    if (!seedOk) return;
    setBusy(true);
    // Yield once so the button can say it is running before a long batch holds the thread.
    window.setTimeout(() => {
      setReport(runCheck(seedValue, streams, sw));
      setBusy(false);
    }, 20);
  };

  const stale = (Object.keys(sw) as (keyof Switches)[]).some((k) => sw[k] !== report.switches[k]);
  const broken = PROPERTIES.reduce((n, p) => n + (report.failing[p.key] > 0 ? 1 : 0), 0);
  const n = (x: number) => x.toLocaleString("en-US");
  const found = PROPERTIES.filter((p) => report.failing[p.key] > 0).map((p) => `${n(report.failing[p.key])} of ${n(report.streams)} streams`);
  const verdict = broken === 0 ? `No stream broke a rule: ${n(report.streams)} random streams, 0 violations` : `${broken} of 4 rules broken by random streams: ${found.join(", ")}`;
  // A result belongs to the switches it ran with; once they move, say so before the verdict.
  const headline = stale ? `Before the switches changed: ${verdict.charAt(0).toLowerCase()}${verdict.slice(1)}` : verdict;
  const entriesFor = (rule: Rule) => out.entries.filter((e) => e.rule === rule);
  const summary = `Timeline of ${sec(shape.endMs)}: ${shape.blocks.filter((b) => b.near).length} NEAR stretches, ${shape.jolts.length} jolts. ${out.entries.filter((e) => e.verb === "refused").length} waves refused, ${out.actions.length} gestures fired. ${describeOutcome(out.outcome)}`;

  return (
    <figure aria-label="Replay of a proximity sensor timeline through ShutUp's wave detector" className="my-2 mb-10">
      <p role="status" className="wd-semi text-[1.5rem] sm:text-[1.75rem] font-extrabold leading-tight text-fg max-w-[30ch]">
        {describeOutcome(out.outcome)}
      </p>

      {/* The timeline. Text alternative: the log under it. */}
      <div role="img" aria-label={summary} className="mt-5 select-none">
        <Lane label="Hand over the sensor">
          <span className="absolute inset-x-0 bottom-0 h-px bg-fg/40" />
          {shape.blocks
            .filter((b) => b.near)
            .map((b) => (
              <span key={b.fromMs} className="absolute inset-y-0 bg-fg" style={{ left: pct(b.fromMs), width: `calc(${pct(b.toMs)} - ${pct(b.fromMs)})` }} />
            ))}
        </Lane>
        <Lane label="Phone moves">
          <span className="absolute inset-x-0 bottom-0 h-px bg-fg/40" />
          {shape.jolts.map((t, i) => (
            <span key={i} className="absolute inset-y-0 w-1 -translate-x-1/2 bg-fg" style={{ left: pct(t) }} />
          ))}
        </Lane>
        <Lane label="Waves ignored">
          <span className="absolute inset-x-0 bottom-0 h-px bg-fg/40" />
          {out.bands.map((b) => (
            <span
              key={`${b.rule}${b.fromMs}`}
              className={b.rule === "arming" ? "absolute inset-y-0 border-2 border-dashed border-fg/70" : "absolute inset-y-0 bg-fg/25 border border-fg/60"}
              style={{ left: pct(b.fromMs), width: `calc(${pct(b.toMs)} - ${pct(b.fromMs)})` }}
            />
          ))}
        </Lane>
        <Lane label="Counted, refused, fired" tall>
          <span className="absolute inset-x-0 bottom-0 h-px bg-fg/40" />
          {marks.map((m) => (
            <span key={m.atMs} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: pct(m.atMs) }}>
              {m.kind === "fired" && <span className="block size-5 rounded-full bg-fg" />}
              {m.kind === "counted" && <span className="block size-4 rounded-full border-2 border-fg bg-background" />}
              {m.kind === "refused" && <span className="block text-[1.4rem] font-bold leading-none text-fg">×</span>}
            </span>
          ))}
        </Lane>
        <div className={`mt-1 ${LANE}`}>
          <p className="fact hidden sm:block text-[0.78rem] leading-tight">Seconds from the first ring</p>
          <div className="relative h-5 border-t border-fg">
            {Array.from({ length: AXIS_MS / 1000 + 1 }, (_, s) => (
              <span key={s} className="fact absolute top-0.5 -translate-x-1/2 text-[0.75rem] leading-none" style={{ left: pct(s * 1000) }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
      <p className="fact mt-2">
        Seconds from the first ring. ○ wave counted · × wave refused · ● gesture fired · dashed: arming delay · shaded: motion hold-off
      </p>

      {/* Building it. Without JavaScript these have nothing to do, so they are not drawn. */}
      {ready && (
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <button type="button" className={BTN} disabled={full} onClick={() => add("near")}>
            Hand near
          </button>
          <button type="button" className={BTN} disabled={full} onClick={() => add("far")}>
            Hand away
          </button>
          <button type="button" className={BTN} disabled={steps.length >= MAX_STEPS} onClick={() => setSteps((s) => [...s, { kind: "jolt" }])}>
            Phone jolt
          </button>
          <span role="group" aria-label="Time each tap adds" className="flex items-center gap-1.5">
            <span className="fact" aria-hidden="true">
              each tap adds
            </span>
            {STEP_CHOICES.map((ms) => (
              <button
                key={ms}
                type="button"
                aria-pressed={stepMs === ms}
                onClick={() => setStepMs(ms)}
                className={`fact px-2 py-1 border rounded-[var(--r-chip)] ${stepMs === ms ? "border-fg text-fg bg-surface" : "border-border"}`}
              >
                {ms / 1000} s
              </button>
            ))}
          </span>
        </div>
      )}
      {ready && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <button type="button" className="btn !py-2" onClick={() => setSteps(REACH)}>
            Reach for the phone
          </button>
          <button type="button" className={BTN} disabled={steps.length === 0} onClick={() => setSteps((s) => s.slice(0, -1))}>
            Undo
          </button>
          <button type="button" className={BTN} disabled={steps.length === 0} onClick={() => setSteps([])}>
            Clear
          </button>
          <span className="fact">
            {sec(shape.endMs)} of {sec(MAX_BUILD_MS)} built{full ? ", full: undo or clear" : ""}
          </span>
        </div>
      )}

      {/* Per rule: what armed, what fired, what was refused. */}
      <ol className="mt-7 border-t-2 border-fg list-none p-0">
        {ROWS.map((row) => {
          const entries = entriesFor(row.rule);
          const on = row.key ? sw[row.key] : true;
          const titleId = `${id}-${row.rule}`;
          return (
            <li key={row.rule} className="py-4 border-b border-border">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                <p id={titleId} className="wd-semi font-bold text-[1.05rem] leading-snug text-fg max-w-[36ch]">
                  {row.title}
                </p>
                {ready && row.key && (
                  <label className="inline-flex items-center gap-2 cursor-pointer min-h-8">
                    <input
                      type="checkbox"
                      role="switch"
                      aria-describedby={titleId}
                      checked={on}
                      onChange={(e) => setSw((s) => ({ ...s, [row.key!]: e.target.checked }))}
                      className="appearance-none shrink-0 relative w-10 h-6 rounded-full border-2 border-fg bg-transparent before:absolute before:top-[2px] before:left-[2px] before:size-4 before:rounded-full before:bg-fg before:content-[''] checked:bg-fg checked:before:translate-x-4 checked:before:bg-background"
                    />
                    <span className="fact">{row.name}</span>
                    <span className="fact w-6" aria-hidden="true">
                      {on ? "on" : "off"}
                    </span>
                  </label>
                )}
              </div>
              {!on ? (
                <p className="fact mt-2">
                  {row.rule === "motion"
                    ? `Off: the session is never told the phone moved${shape.jolts.length ? ` (it did, at ${shape.jolts.map(sec).join(" and ")})` : ""}.`
                    : row.rule === "arming"
                      ? "Off: waves count from the first reading."
                      : "Off: a single wave does what version 1 let you set it to."}
                </p>
              ) : null}
              {entries.length > 0 && (
                <ul className="mt-2 space-y-1 list-none p-0">
                  {entries.map((e, i) => (
                    <li key={i} className="fact flex gap-x-2">
                      <span className="font-mono text-[0.7rem] leading-[1.7] text-fg tabular-nums shrink-0 w-[4.2rem]">{sec(e.atMs)}</span>
                      <span>
                        <strong className="font-semibold text-fg">{e.verb}</strong> {e.text}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {on && entries.length === 0 && <p className="fact mt-2">Nothing to report.</p>}
            </li>
          );
        })}
      </ol>

      {/* The property test, in this tab. */}
      <div className="mt-6">
        <p aria-live="polite" className="wd-semi font-bold text-[1.05rem] leading-snug text-fg max-w-[40ch]">
          {headline}
        </p>
        <dl className="mt-2">
          {PROPERTIES.map((p) => (
            <div key={p.key} className="flex justify-between gap-4 border-b border-border py-1.5">
              <dt className="fact">{p.label}</dt>
              <dd className="fact text-fg tabular-nums shrink-0">
                {report.failing[p.key].toLocaleString("en-US")} of {report.streams.toLocaleString("en-US")}
              </dd>
            </div>
          ))}
        </dl>
        <p className="fact mt-2">
          Seed {report.seed}, {report.streams.toLocaleString("en-US")} streams of {report.readings} readings, each run with double wave on and off, with the arming delay{" "}
          {report.switches.arming ? "on" : "off"}, the motion guard {report.switches.motionGuard ? "on" : "off"} and the single-wave rule {report.switches.singleWaveRule ? "on" : "off"}.
          {report.first ? ` First failure: stream ${report.first.index}, seed ${report.first.seed}.` : ""}
          {stale ? " The switches have changed since this run." : ""}
        </p>
        {ready && (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <label className="fact inline-flex items-center gap-2">
              Seed
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={2000000000}
                value={seedText}
                onChange={(e) => setSeedText(e.target.value)}
                className="w-28 px-2 py-1 border border-fg rounded-[var(--r-chip)] bg-transparent text-fg font-mono text-[0.75rem]"
              />
            </label>
            <span role="group" aria-label="Number of streams" className="flex items-center gap-1.5">
              {STREAM_CHOICES.map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={streams === n}
                  onClick={() => setStreams(n)}
                  className={`fact px-2 py-1 border rounded-[var(--r-chip)] ${streams === n ? "border-fg text-fg bg-surface" : "border-border"}`}
                >
                  {n.toLocaleString("en-US")}
                </button>
              ))}
            </span>
            <button type="button" className="btn !py-2" onClick={run} disabled={busy || !seedOk}>
              {busy ? "Running" : `Run ${streams.toLocaleString("en-US")} streams`}
            </button>
          </div>
        )}
      </div>

      <figcaption className="fact mt-5 max-w-[68ch]">
        The detectors are the app&apos;s, ported from Kotlin to TypeScript and run on a fake clock; the app&apos;s gesture unit tests run against the port. The reach is one
        I built, not a recording of a hand. The sensor starts FAR and reports changes only, and a jolt is one accelerometer reading. The random streams come from my own
        seeded generator, so the seeds are not the app&apos;s. No real sensor, phone or call is involved.
      </figcaption>
    </figure>
  );
}

/** A label above the track on a phone, beside it from the small breakpoint up. */
const LANE = "sm:grid sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center sm:gap-x-3";

function Lane({ label, tall, children }: { label: string; tall?: boolean; children: ReactNode }) {
  return (
    <div className={`mb-1.5 sm:mb-1 ${LANE}`}>
      <p className="fact text-[0.78rem] leading-tight mb-0.5 sm:mb-0">{label}</p>
      <div className={`relative ${tall ? "h-7" : "h-4"}`}>{children}</div>
    </div>
  );
}
