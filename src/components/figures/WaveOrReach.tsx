"use client";

import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  ALL_ON,
  ARM_DELAY_MS,
  MAX_BUILD_MS,
  MOTION_HOLD_MS,
  REACH,
  WINDOW_MS,
  layout,
  replay,
  runCheck,
  sec,
  type CheckReport,
  type Entry,
  type MarkKind,
  type Outcome,
  type Replay,
  type Rule,
  type Step,
  type Switches,
} from "@/lib/shutupStreams";
import { Actions, FigureFrame, Fold, Presets, QuietAction, Segmented, Verdict } from "./kit";

// ShutUp's wave detection, running here. The drawing is a timeline of the proximity
// sensor (a hand over it, or away) and of the accelerometer (the phone jolting). The
// detectors ported from the Kotlin app replay it on a fake clock, and the sentence under
// the drawing is what they decided. Three switches each remove one rule. The folds hold
// the timeline builder, the rule-by-rule log and the app's property test on random streams.

const STEP_CHOICES = [250, 500, 1000] as const;
const STREAM_CHOICES = [400, 2000, 10000] as const;
const MAX_STEPS = 40;
const DEFAULT_SEED = 7;
const DEFAULT_STREAMS = 400;

type PresetId = "reach" | "wave" | "double";

/** The reach is the app's own pattern (lib). The two waves are the plainest ones: after the first second, a hand over the sensor and away. */
const PRESET_STEPS: Record<PresetId, Step[]> = {
  reach: REACH,
  wave: [
    { kind: "far", ms: 2000 },
    { kind: "near", ms: 250 },
    { kind: "far", ms: 250 },
  ],
  double: [
    { kind: "far", ms: 2000 },
    { kind: "near", ms: 250 },
    { kind: "far", ms: 250 },
    { kind: "near", ms: 250 },
  ],
};

const PRESETS: { id: PresetId; label: string }[] = [
  { id: "reach", label: "Reach for the phone" },
  { id: "wave", label: "A deliberate wave" },
  { id: "double", label: "A double wave" },
];

/** The server renders the figure at rest; the controls appear once the page is interactive. */
const subscribeNone = () => () => {};
const useHydrated = () =>
  useSyncExternalStore(
    subscribeNone,
    () => true,
    () => false,
  );

const RULES: { key: keyof Switches; label: string }[] = [
  { key: "arming", label: "Ignore the first second" },
  { key: "motionGuard", label: "Ignore waves while the phone moves" },
  { key: "singleWaveRule", label: "One wave only silences" },
];

const SECTIONS: { rule: Rule; title: string; off?: (jolts: number[]) => string; key?: keyof Switches }[] = [
  { rule: "arming", key: "arming", title: "Ignore the first second: waves are ignored for the first second after ringing starts", off: () => "Off: waves count from the first reading." },
  {
    rule: "motion",
    key: "motionGuard",
    title: "Ignore waves while the phone moves: a moving phone mutes waves and drops a pending one",
    off: (j) => `Off: the session is never told the phone moved${j.length ? ` (it did, at ${j.map(sec).join(" and ")})` : ""}.`,
  },
  { rule: "single", key: "singleWaveRule", title: "One wave only silences: answering and ending need a double wave", off: () => "Off: a single wave does what version 1 let you set it to." },
  { rule: "wave", title: "What counts as a wave: the hand away, then over the sensor. A second one inside the window makes a double wave" },
];

const PROPERTIES: { key: "motion" | "arming" | "doubles" | "singleWave"; label: string }[] = [
  { key: "motion", label: `A wave counted within ${sec(MOTION_HOLD_MS)} of the phone moving` },
  { key: "arming", label: `A wave counted in the first ${sec(ARM_DELAY_MS)}` },
  { key: "doubles", label: "A double wave without two separate edges" },
  { key: "singleWave", label: "A single wave that answered or ended the call" },
];

/** What the log says for each line, in words that do not reuse one verb for different things. */
function logVerb(e: Entry): string {
  if (e.verb === "refused") return "ignored";
  if (e.rule === "motion") return "noticed";
  if (e.rule === "wave") return e.verb === "armed" ? "counted" : "recognised";
  if (e.rule === "single") return e.verb === "fired" ? "result" : "rule on";
  return "rule on";
}

interface Mark {
  atMs: number;
  kind: MarkKind;
  label: string;
  /** Why a wave that did not act did not: said in the sentence under the drawing, in the same order as the marks. */
  why?: string;
}

/** One mark per instant on the timeline: a gesture that acted outranks an ignored wave, which outranks a counted one. */
function marksOf(out: Replay): Mark[] {
  const rank: Record<MarkKind, number> = { counted: 0, refused: 1, fired: 2 };
  const byTime = new Map<number, { kind: MarkKind; entry: Entry }>();
  for (const e of out.entries) {
    if (!e.mark) continue;
    const have = byTime.get(e.atMs);
    if (have === undefined || rank[e.mark] > rank[have.kind]) byTime.set(e.atMs, { kind: e.mark, entry: e });
  }
  const marks: Mark[] = [...byTime]
    .map(([atMs, { kind, entry }]) => {
      const action = out.actions.find((a) => a.atMs === atMs)?.action;
      const label =
        kind === "counted"
          ? "counted"
          : kind === "refused"
            ? "ignored"
            : action === "answer"
              ? "answers"
              : action === "end"
                ? "ends call"
                : action === "silence"
                  ? "silences"
                  : "no action";
      const why = kind !== "refused" ? undefined : entry.rule === "arming" ? "too early" : entry.rule === "motion" ? "soon after the phone moved" : "too brief to be a wave";
      return { atMs, kind, label, why };
    })
    .sort((a, b) => a.atMs - b.atMs);
  // A wave that was counted and then dropped when the phone moved says so, so the drawing and the sentence agree.
  for (const d of out.entries.filter((e) => e.rule === "motion" && e.verb === "fired" && e.text.includes("dropped"))) {
    const m = marks.filter((x) => x.kind === "counted" && x.atMs <= d.atMs).pop();
    if (m) {
      m.label = "dropped";
      m.why = "dropped when the phone moved";
    }
  }
  return marks;
}

/** The plain sentence under the drawing: what happened to the call, and the one reason that matters. */
function verdictOf(out: Replay, marks: Mark[], sw: Switches): { tone: "ok" | "warn"; title: string; body: string } {
  const offRules = RULES.filter((r) => !sw[r.key]).map((r) => `\u201c${r.label}\u201d`);
  const offNote = offRules.length ? ` Switched off: ${offRules.join(", ")}.` : "";
  const o: Outcome = out.outcome;
  if (o.kind === "answered" || o.kind === "ended") {
    const gesture = out.actions.find((a) => a.action === "answer" || a.action === "end")?.gesture;
    const word = o.kind === "answered" ? "answered" : "ended";
    return {
      tone: "warn",
      title: `The call is ${word} at ${sec(o.atMs)}.`,
      body:
        (gesture === "DOUBLE_WAVE"
          ? "Two waves close together made a double wave, and a double wave is allowed to act on the call."
          : "One wave was enough, because the rule that keeps a single wave to silencing is off.") + offNote,
    };
  }
  // Left to right, as the marks are drawn.
  const why = marks.filter((m) => m.why).map((m) => `${sec(m.atMs)} ${m.why}`);
  const ignored = why.length ? `Waves ignored: ${why.join("; ")}.` : "";
  if (o.kind === "silenced") {
    return { tone: "ok", title: "The call is not answered.", body: `The phone waits ${sec(WINDOW_MS)} in case a second wave comes, then silences the ringer at ${sec(o.atMs)}, because one wave only silences. ${ignored}${offNote}`.trim() };
  }
  const waves = marks.length;
  return { tone: "ok", title: "The call keeps ringing.", body: `${waves === 0 ? "No wave was seen, so nothing acted." : `${ignored} Nothing acted on them.`}${offNote}` };
}

const BTN = "btn-quiet !min-h-11 sm:!min-h-9 !py-1.5";

export default function WaveOrReach() {
  const ready = useHydrated();
  const [steps, setSteps] = useState<Step[]>(REACH);
  const [preset, setPreset] = useState<PresetId | null>("reach");
  const [sw, setSw] = useState<Switches>(ALL_ON);
  const [stepMs, setStepMs] = useState<number>(250);
  const [seedText, setSeedText] = useState(String(DEFAULT_SEED));
  const [streams, setStreams] = useState<number>(DEFAULT_STREAMS);
  const [report, setReport] = useState<CheckReport>(() => runCheck(DEFAULT_SEED, DEFAULT_STREAMS, ALL_ON));
  const [busy, setBusy] = useState(false);

  const out = useMemo(() => replay(steps, sw), [steps, sw]);
  const shape = useMemo(() => layout(steps), [steps]);
  const marks = useMemo(() => marksOf(out), [out]);
  const verdict = useMemo(() => verdictOf(out, marks, sw), [out, marks, sw]);

  // The axis fits what was drawn and leaves room for the last window to run out. It does not depend on the switches, so flipping one never rescales the drawing.
  const lastJolt = shape.jolts.length ? Math.max(...shape.jolts) + MOTION_HOLD_MS : 0;
  const axisMs = Math.max(3000, Math.ceil(Math.max(shape.endMs + WINDOW_MS, lastJolt, ARM_DELAY_MS) / 1000) * 1000);
  const pct = (ms: number) => `${(Math.min(ms, axisMs) / axisMs) * 100}%`;
  const span = (from: number, to: number) => ({ left: pct(from), width: `calc(${pct(to)} - ${pct(from)})` });

  const full = shape.endMs + stepMs > MAX_BUILD_MS;
  const edit = (f: (s: Step[]) => Step[]) => {
    setSteps(f);
    setPreset(null);
  };
  const add = (kind: "near" | "far") => edit((s) => (s.length < MAX_STEPS ? [...s, { kind, ms: stepMs }] : s));
  const pick = (id: PresetId) => {
    setSteps(PRESET_STEPS[id]);
    setPreset(id);
  };
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
  const checkSentence = broken === 0 ? `No stream broke a rule: ${n(report.streams)} random streams, 0 violations` : `${broken} of 4 rules broken by random streams: ${found.join(", ")}`;
  // A result belongs to the switches it ran with; once they move, say so before the sentence.
  const checkTitle = stale ? `Before the switches changed: ${checkSentence.charAt(0).toLowerCase()}${checkSentence.slice(1)}` : checkSentence;
  const entriesFor = (rule: Rule) => out.entries.filter((e) => e.rule === rule);
  const handOver = shape.blocks.filter((b) => b.near).length;
  const summary = `Timeline of ${sec(axisMs)}. The hand went over the sensor ${handOver} time${handOver === 1 ? "" : "s"} and the phone jolted ${shape.jolts.length} time${shape.jolts.length === 1 ? "" : "s"}. ${verdict.title} ${verdict.body}`;

  // Labels under the marks, in as few rows as keep them from touching.
  const rowEnds: number[] = [];
  const placed = marks.map((m) => {
    const centre = (Math.min(m.atMs, axisMs) / axisMs) * 100;
    const width = m.label.length * 2.6;
    const anchor = centre - width / 2 < -2 ? "start" : centre + width / 2 > 102 ? "end" : "middle";
    const from = anchor === "start" ? centre - 1 : anchor === "end" ? centre - width + 1 : centre - width / 2;
    const to = from + width;
    let row = rowEnds.findIndex((end) => end + 1 < from);
    if (row === -1) row = rowEnds.length;
    rowEnds[row] = to;
    return { ...m, anchor, row };
  });
  const markRows = Math.max(1, rowEnds.length);

  const ticks = Array.from({ length: axisMs / 1000 + 1 }, (_, s) => s);

  return (
    <FigureFrame
      claim="A hand reaching to decline a call looks like a wave"
      how={
        ready
          ? "Switch a rule off under the drawing and watch the call get answered. A wave is a hand passing over the phone's sensor, and a hand reaching for the phone passes over it too."
          : "A wave is a hand passing over the phone's sensor, and a hand reaching for the phone passes over it too. Below, a hand reaches for a ringing phone. With scripting on you can switch a rule off or try a wave of your own."
      }
      caption="The detectors are the app's own, ported to run here on a fake clock, but the reach is a pattern I built: no real phone, sensor or call is involved."
      about={
        <>
          <p>
            The detectors are the app&apos;s, ported from Kotlin to TypeScript and run on a fake clock; the app&apos;s gesture unit tests run against the port. The reach is one I built, not a
            recording of a hand. The sensor starts FAR and reports changes only, and a jolt is one accelerometer reading.
          </p>
          <p>The random streams come from my own seeded generator, so the seeds are not the app&apos;s. No real sensor, phone or call is involved.</p>
        </>
      }
    >
      {ready && <Presets label="Try" items={PRESETS} active={preset} onPick={pick} />}

      {/* The drawing. Its text alternative is the summary; the log in the fold is the long form. */}
      <div role="img" aria-label={summary} className="select-none">
        <Lane label="Hand over the sensor">
          <Baseline />
          {shape.blocks
            .filter((b) => b.near)
            .map((b) => (
              <span key={b.fromMs} className="absolute inset-y-0 bg-fg" style={span(b.fromMs, b.toMs)} />
            ))}
        </Lane>
        <Lane label="Phone jolted">
          <Baseline />
          {shape.jolts.length === 0 && <span className="absolute inset-0 flex items-center text-xs text-muted">no jolt in this timeline</span>}
          {shape.jolts.map((t, i) => (
            <span key={i} className="absolute inset-y-0 w-0" style={{ left: pct(t) }}>
              <span className={`absolute inset-y-0 -translate-x-1/2 w-2 ${sw.motionGuard ? "bg-fg" : "border-2 border-fg bg-background"}`} />
              <span className={`absolute top-0 text-xs leading-5 whitespace-nowrap ${t > axisMs * 0.7 ? "right-2" : "left-2"}`}>{sw.motionGuard ? "jolt" : "jolt (rule off)"}</span>
            </span>
          ))}
        </Lane>
        <Lane label="Phone not listening">
          <Baseline />
          {out.bands.map((b) => (
            <span
              key={`${b.rule}${b.fromMs}`}
              className={`absolute inset-y-0 overflow-hidden whitespace-nowrap px-1 text-xs leading-5 ${
                b.rule === "arming" ? "border-2 border-dashed border-fg/70" : "bg-fg/25 border border-fg/60"
              }`}
              style={span(b.fromMs, b.toMs)}
            >
              {b.rule === "arming" ? "first second" : "moved"}
            </span>
          ))}
          {out.bands.length === 0 && <span className="absolute inset-0 flex items-center text-xs text-muted">nothing is being ignored</span>}
        </Lane>
        <Lane label="What happened to each wave" height={`${28 + markRows * 18}px`}>
          <Baseline />
          {placed.map((m) => (
            <span key={m.atMs}>
              <span className="absolute top-0 -translate-x-1/2" style={{ left: pct(m.atMs) }}>
                {m.kind === "fired" && <span className={`block size-5 rounded-full ${m.label === "silences" ? "bg-ok" : "bg-warn"}`} />}
                {m.kind === "counted" && <span className="block size-5 rounded-full border-2 border-fg bg-background" />}
                {m.kind === "refused" && <span className="block size-5 text-center text-xl font-bold leading-[18px] text-fg">×</span>}
              </span>
              <span
                className="absolute text-xs font-medium leading-4 whitespace-nowrap text-fg"
                style={{
                  left: pct(m.atMs),
                  top: `${24 + m.row * 18}px`,
                  transform: m.anchor === "start" ? "translateX(-6px)" : m.anchor === "end" ? "translateX(calc(-100% + 6px))" : "translateX(-50%)",
                }}
              >
                {m.label}
              </span>
            </span>
          ))}
        </Lane>
        <div className={`mt-1 ${LANE}`}>
          <p className="wd-narrow text-[0.8rem] leading-tight text-muted">Seconds since the ringing began</p>
          <div className="px-3">
            <div className="relative h-5 border-t border-fg">
              {ticks.map((s) => (
                <span key={s} className="absolute top-0 -translate-x-1/2 flex flex-col items-center" style={{ left: pct(s * 1000) }}>
                  <span className="block h-1.5 w-px bg-fg" />
                  <span className="mt-0.5 text-xs leading-none tabular-nums">{s}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Verdict tone={verdict.tone} title={verdict.title}>
        {verdict.body}
      </Verdict>

      {/* Three switches, in plain words. Without JavaScript they have nothing to do, so they are not drawn. */}
      {ready && (
        <div role="group" aria-label="Rules that stop a reach" className="flex flex-wrap items-center gap-x-5 gap-y-0">
          <span className="fact w-full sm:w-auto">Switch a rule off</span>
          {RULES.map((r) => (
            <label key={r.key} className="inline-flex items-center gap-2 cursor-pointer min-h-11 sm:min-h-9">
              <input
                type="checkbox"
                role="switch"
                checked={sw[r.key]}
                onChange={(e) => setSw((s) => ({ ...s, [r.key]: e.target.checked }))}
                className="appearance-none shrink-0 relative w-10 h-6 rounded-full border-2 border-fg bg-transparent before:absolute before:top-[2px] before:left-[2px] before:size-4 before:rounded-full before:bg-fg before:content-[''] checked:bg-fg checked:before:translate-x-4 checked:before:bg-background"
              />
              <span className={`fact w-7 ${sw[r.key] ? "" : "!text-fg font-semibold"}`} aria-hidden="true">
                {sw[r.key] ? "on" : "off"}
              </span>
              <span className="text-[0.95rem] leading-tight">{r.label}</span>
            </label>
          ))}
        </div>
      )}

      {ready && (
        <Fold summary="Build your own timeline">
          <div className="space-y-3">
            <Actions>
              <button type="button" className={BTN} disabled={full} onClick={() => add("near")}>
                Hand over the sensor
              </button>
              <button type="button" className={BTN} disabled={full} onClick={() => add("far")}>
                Hand away
              </button>
              <button type="button" className={BTN} disabled={steps.length >= MAX_STEPS} onClick={() => edit((s) => [...s, { kind: "jolt" }])}>
                Phone jolt
              </button>
            </Actions>
            <Segmented
              label="Each tap adds"
              options={STEP_CHOICES.map((ms) => ({ id: String(ms), label: `${ms / 1000} s` }))}
              value={String(stepMs)}
              onChange={(id) => setStepMs(Number(id))}
            />
            <Actions>
              <QuietAction onClick={() => edit((s) => s.slice(0, -1))}>Undo</QuietAction>
              <QuietAction onClick={() => edit(() => [])}>Clear</QuietAction>
              <span className="fact">
                {sec(shape.endMs)} of {sec(MAX_BUILD_MS)} built{full ? ", full: undo or clear" : ""}
              </span>
            </Actions>
          </div>
        </Fold>
      )}

      {/* Open in the server HTML, so the reach and its reasons read without JavaScript; folded once the page is interactive. */}
      <Fold summary="Why: what each rule did" open={!ready}>
        <ol className="list-none p-0 border-t-2 border-fg">
          {SECTIONS.map((s) => {
            const entries = entriesFor(s.rule);
            const on = s.key ? sw[s.key] : true;
            return (
              <li key={s.rule} className="py-3 border-b border-border">
                <p className="wd-semi font-bold text-[1.05rem] leading-snug max-w-[44ch]">{s.title}</p>
                {!on && s.off ? <p className="fact mt-1.5">{s.off(shape.jolts)}</p> : null}
                {entries.length > 0 && (
                  <ul className="mt-1.5 space-y-1 list-none p-0">
                    {entries.map((e, i) => (
                      <li key={i} className="fact flex gap-x-2">
                        <span className="font-mono text-xs leading-[1.7] text-fg tabular-nums shrink-0 w-16">{sec(e.atMs)}</span>
                        <span>
                          <strong className="font-semibold text-fg">{logVerb(e)}</strong> {e.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {on && entries.length === 0 && <p className="fact mt-1.5">Nothing to report.</p>}
              </li>
            );
          })}
        </ol>
      </Fold>

      {/* The app's property test, in this tab. Open without JavaScript so the build-time result is on the page. */}
      <Fold summary="Check it on random streams" open={!ready}>
        <div className="space-y-3">
          <p className="fact max-w-[62ch]">
            The app tests these rules on random sensor streams rather than ones I would write by hand. This runs a ported copy of that test, with whichever rules are switched on above.
          </p>
          <Verdict tone={stale ? "plain" : broken === 0 ? "ok" : "warn"} title={checkTitle} />
          <dl>
            {PROPERTIES.map((p) => (
              <div key={p.key} className="flex justify-between gap-4 border-b border-border py-1.5">
                <dt className="fact">{p.label}</dt>
                <dd className="fact text-fg tabular-nums shrink-0">
                  {n(report.failing[p.key])} of {n(report.streams)}
                </dd>
              </div>
            ))}
          </dl>
          <p className="fact">
            Seed {report.seed}, {n(report.streams)} streams of {report.readings} readings, each run with double wave on and off, with the arming delay {report.switches.arming ? "on" : "off"}, the
            motion guard {report.switches.motionGuard ? "on" : "off"} and the single-wave rule {report.switches.singleWaveRule ? "on" : "off"}.
            {report.first ? ` First failure: stream ${report.first.index}, seed ${report.first.seed}.` : ""}
            {stale ? " The switches have changed since this run." : ""}
          </p>
          {ready && (
            <div className="space-y-2">
              <label className="fact inline-flex items-center gap-2 min-h-11 sm:min-h-9">
                Seed
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={2000000000}
                  value={seedText}
                  onChange={(e) => setSeedText(e.target.value)}
                  className="w-28 px-2 py-1.5 border border-fg rounded-[var(--r-chip)] bg-transparent text-fg font-mono text-xs"
                />
              </label>
              <Segmented
                label="Streams"
                options={STREAM_CHOICES.map((c) => ({ id: String(c), label: n(c) }))}
                value={String(streams)}
                onChange={(id) => setStreams(Number(id))}
              />
              <Actions>
                <button type="button" className="btn !min-h-11 sm:!min-h-9" onClick={run} disabled={busy || !seedOk}>
                  {busy ? "Running" : `Run ${n(streams)} streams`}
                </button>
              </Actions>
            </div>
          )}
        </div>
      </Fold>
    </FigureFrame>
  );
}

/** A label above the track on a phone, beside it from the small breakpoint up. */
const LANE = "sm:grid sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:items-center sm:gap-x-3";

function Baseline() {
  return <span className="absolute inset-x-0 bottom-0 h-px bg-fg/40" />;
}

/** The track sits inside a small margin so marks and axis numbers at either end are not clipped. */
function Lane({ label, height = "20px", children }: { label: string; height?: string; children: ReactNode }) {
  return (
    <div className={`mb-2 sm:mb-1.5 ${LANE}`}>
      <p className="wd-narrow text-[0.8rem] leading-tight mb-0.5 sm:mb-0 text-fg">{label}</p>
      <div className="px-3">
        <div className="relative" style={{ height }}>
          {children}
        </div>
      </div>
    </div>
  );
}
