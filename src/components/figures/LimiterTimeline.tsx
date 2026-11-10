"use client";

import { useEffect, useRef, useState } from "react";
import { GLOBAL_LIMIT } from "@/lib/sudostamp";
import {
  COMPUTER_NAME,
  GAPS_MS,
  clockText,
  gapText,
  leftText,
  timeline,
  type Answer,
  type Computer,
  type Keying,
  type RequestInput,
  type Row,
} from "@/lib/sudostampSim";
import { Actions, FigureFrame, Fold, Presets, QuietAction, Segmented, Verdict } from "./kit";

// The phone's rate limiter, driven by what you send. Every row is the real
// Limiter (SudoStamp's Limiter.kt, ported with its tests) or, under "by
// address", the cooldown that shipped in 1.3.0, replayed on the figure's own
// clock. The figure only feeds requests in and reads the state out; the
// presets below are lists of requests, not rules.

const MAX_REQUESTS = 24;

type PresetId = "rotate" | "quick" | "big";

const req = (from: Computer, answer: Answer, gapMs: number, extra: Partial<RequestInput> = {}): RequestInput => ({
  from,
  fresh: false,
  payload: 32,
  answer,
  gapMs,
  ...extra,
});

/** Each one-tap scenario is a list of requests fed to the same replay. */
const SCENARIOS: Record<PresetId, RequestInput[]> = {
  // A computer you denied retries from a new address every time. The figure opens on the first request alone.
  rotate: [req("b", "deny", 0, { fresh: true }), req("b", "deny", 5_000, { fresh: true }), req("b", "deny", 5_000, { fresh: true }), req("b", "deny", 5_000, { fresh: true })],
  // You approve, and the next two arrive straight behind it.
  quick: [req("a", "approve", 0), req("a", "approve", 0), req("a", "approve", 0)],
  // Something that is not a 32-byte challenge.
  big: [req("a", "approve", 0, { payload: 100 })],
};

const PRESETS: readonly { id: PresetId; label: string }[] = [
  { id: "rotate", label: "Rotate the address" },
  { id: "quick", label: "Ask again right after a yes" },
  { id: "big", label: "Send 100 bytes" },
];

const KEYING: readonly { id: Keying; label: string }[] = [
  { id: "computer", label: "by computer (now)" },
  { id: "address", label: "by address (before)" },
];

function stateText(r: Row, keying: Keying): string {
  const parts: string[] = [];
  if (r.state.quietLeftMs > 0) parts.push(`quiet for ${leftText(r.state.quietLeftMs)} more`);
  for (const c of r.state.cooling) parts.push(`${c.who} cooling down for ${leftText(c.leftMs)} more`);
  if (r.state.windowCount !== null) parts.push(`${r.state.windowCount} of ${GLOBAL_LIMIT} unapproved in the last 10 min`);
  if (parts.length === 0) parts.push(keying === "address" ? "no address cooling down" : "nothing holding back");
  return parts.join("; ");
}

/** What happened to a request, in plain words. `tone` is for the computed outcome only. */
function outcomeOf(r: Row): { word: string; tone: "ok" | "plain" } {
  switch (r.outcome) {
    case "refused":
      return { word: "Refused, phone stayed silent", tone: "ok" };
    case "approved":
      return { word: "Asked, you approved", tone: "plain" };
    case "denied":
      return { word: "Asked, you denied", tone: "plain" };
    case "ignored":
      return { word: "Asked, no answer for 60 s", tone: "plain" };
  }
}

const upper = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;
const times = (n: number) => (n === 1 ? "1 time" : `${n} times`);

const COLS = "grid-cols-[2.75rem_2.75rem_1fr] sm:grid-cols-[3rem_6.5rem_1fr]";

function Log({ rows, keying }: { rows: Row[]; keying: Keying }) {
  const other = keying === "computer" ? "Old way" : "New way";
  return (
    <div>
      <div aria-hidden="true" className={`fact grid ${COLS} gap-x-2 pl-3 pb-1 border-b border-border`}>
        <span>Time</span>
        <span>
          <span className="sm:hidden">From</span>
          <span className="hidden sm:inline">Computer</span>
        </span>
        <span>What the phone did</span>
      </div>
      <ol aria-label="Requests, oldest first" className="divide-y divide-border">
        {rows.map((r) => {
          const o = outcomeOf(r);
          const differs = r.asked !== r.askedUnderOther;
          // Asked here but the other counting would have stayed silent: the cost of the old way.
          const costly = differs && r.asked;
          const rule = o.tone === "ok" ? "border-ok" : costly ? "border-warn" : "border-fg/30";
          return (
            <li key={r.n} data-outcome={r.outcome} className={`border-l-4 ${rule} pl-2 py-2 grid ${COLS} gap-x-2 items-baseline`}>
              <span className="fact tabular-nums">{clockText(r.atMs)}</span>
              <span className="font-semibold">
                <span className="sm:hidden" aria-hidden="true">
                  {r.from.toUpperCase()}
                </span>
                <span className="sr-only sm:not-sr-only">{COMPUTER_NAME[r.from]}</span>
              </span>
              <span className={`font-semibold leading-snug ${o.tone === "ok" ? "text-ok" : ""}`}>{o.word}</span>
              <span className="col-start-3 fact leading-snug">
                address <span className="font-mono text-[0.75rem] text-fg">{r.address}</span>
                {r.payload !== 32 ? `, ${r.payload} bytes` : ""}
                {r.reason ? `. ${upper(r.reason)}.` : ""}
              </span>
              {differs && (
                <span className={`col-start-3 fact leading-snug ${costly ? "text-warn" : "text-ok"}`}>
                  {costly ? `${other}: the phone would stay silent here.` : `${other}: you would be asked here.`}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function LimiterTimeline() {
  const [keying, setKeying] = useState<Keying>("computer");
  const [inputs, setInputs] = useState<RequestInput[]>(SCENARIOS.rotate.slice(0, 1));
  const [preset, setPreset] = useState<PresetId | null>(null);
  const [from, setFrom] = useState<Computer>("b");
  const [fresh, setFresh] = useState(true);
  const [payload, setPayload] = useState(32);
  const [answer, setAnswer] = useState<Answer>("deny");
  const [gapMs, setGapMs] = useState<number>(5_000);
  const logRef = useRef<HTMLDivElement>(null);
  const verdictRef = useRef<HTMLDivElement>(null);
  const sent = useRef(false);

  const rows = timeline(inputs, keying);
  const full = inputs.length >= MAX_REQUESTS;

  // A request sent from the fold below puts its row and the verdict out of
  // sight; bring both back. Only after the visitor's own Send, never on load.
  useEffect(() => {
    if (!sent.current) return;
    sent.current = false;
    const last = logRef.current?.querySelector("li:last-child");
    const v = verdictRef.current;
    if (!last || !v) return;
    const H = window.innerHeight;
    const rowTop = last.getBoundingClientRect().top;
    const vBottom = v.getBoundingClientRect().bottom;
    let dy = Math.max(0, vBottom - (H - 8));
    if (rowTop - dy < 72) dy = rowTop - 72;
    if (Math.abs(dy) > 1) window.scrollBy({ top: dy, behavior: "auto" });
  }, [inputs]);

  const send = () => {
    if (full) return;
    sent.current = true;
    setPreset(null);
    setInputs([...inputs, { from, fresh, payload, answer, gapMs }]);
  };

  const askedNow = rows.filter((r) => r.asked).length;
  const askedOther = rows.filter((r) => r.askedUnderOther).length;
  const last = rows[rows.length - 1];

  let verdict: { tone: "ok" | "warn" | "plain"; title: string };
  if (!last) {
    verdict = { tone: "plain", title: "Nothing sent yet" };
  } else if (askedNow === askedOther) {
    verdict = { tone: "plain", title: askedNow === 0 ? "Either way of counting, the phone never asks you here." : `Either way of counting, the phone asks you ${times(askedNow)} here.` };
  } else if (keying === "computer") {
    verdict = { tone: "ok", title: `Counting by computer, the phone asks you ${times(askedNow)}. Counting by address, it would have asked ${askedOther}.` };
  } else {
    verdict = { tone: "warn", title: `Counting by address, the phone asks you ${times(askedNow)}. Counting by computer, it would ask only ${askedOther}.` };
  }

  const set = (id: PresetId) => {
    setInputs(SCENARIOS[id]);
    setPreset(id);
  };

  return (
    <FigureFrame
      claim="Changing address does not get a second prompt"
      how="Your phone asks you to approve each admin command (sudo) a computer runs. You denied this computer once. Press “Rotate the address” to watch it retry from new network addresses."
      caption="This replays the app's own limiter code on the figure's clock; there is no phone and no network."
      about={
        <>
          <p>
            Each row is the app&apos;s own limiter, ported to TypeScript with its constants and messages. Counted by address, it is the per-address cooldown from 1.3, which had no quiet period and no overall cap. Counted by computer, it is the limiter from 1.4.
          </p>
          <p>The clock is the figure&apos;s, an answer takes two seconds by assumption, and the addresses are from the documentation range. No phone, no pam_rssh and no network are involved.</p>
        </>
      }
    >
      <Presets label="Try" items={PRESETS} active={preset} onPick={set} />
      <Segmented<Keying> label="The phone counts requests" options={KEYING} value={keying} onChange={setKeying} />

      <div ref={logRef}>{rows.length === 0 ? <p className="fact">Pick a scenario above, or send your own request below.</p> : <Log rows={rows} keying={keying} />}</div>

      <div ref={verdictRef}>
        <Verdict tone={verdict.tone} title={verdict.title}>
          {last ? (
            <>
              Latest, request {last.n} from {COMPUTER_NAME[last.from]} at {clockText(last.atMs)}: {outcomeOf(last).word.toLowerCase()}.
            </>
          ) : null}
        </Verdict>
      </div>

      <Fold summary="Send your own request">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <Segmented<Computer>
            label="Request from"
            value={from}
            onChange={setFrom}
            options={[
              { id: "a", label: "Computer A" },
              { id: "b", label: "Computer B" },
            ]}
          />
          <Segmented<string>
            label="Source address"
            value={fresh ? "new" : "same"}
            onChange={(v) => setFresh(v === "new")}
            options={[
              { id: "same", label: "the same one" },
              { id: "new", label: "a new one each time" },
            ]}
          />
          <Segmented<string>
            label="It asks the phone to sign"
            value={String(payload)}
            onChange={(v) => setPayload(Number(v))}
            options={[
              { id: "32", label: "32 bytes, a challenge" },
              { id: "100", label: "100 bytes, something else" },
            ]}
          />
          <Segmented<Answer>
            label="If the phone asks, you"
            value={answer}
            onChange={setAnswer}
            options={[
              { id: "approve", label: "approve" },
              { id: "deny", label: "deny" },
              { id: "ignore", label: "ignore it" },
            ]}
          />
          <Segmented<string>
            label="It arrives after the previous request is over"
            value={String(gapMs)}
            onChange={(v) => setGapMs(Number(v))}
            options={GAPS_MS.map((g) => ({ id: String(g), label: gapText(g) }))}
          />
          <Actions>
            <button type="submit" className="btn" disabled={full}>
              Send request
            </button>
            <QuietAction
              onClick={() => {
                setInputs([]);
                setPreset(null);
              }}
            >
              Start over
            </QuietAction>
          </Actions>
          {full && <p className="fact">That is {MAX_REQUESTS} requests. Start over to send more.</p>}
        </form>
      </Fold>

      {rows.length > 0 && (
        <Fold summary="What the phone remembers after each request">
          <ol aria-label="State after each request" className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.n} className="py-1.5 fact">
                <span className="tabular-nums">{r.n}.</span> {stateText(r, keying)}.
              </li>
            ))}
          </ol>
        </Fold>
      )}
    </FigureFrame>
  );
}
