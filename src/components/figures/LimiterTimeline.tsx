"use client";

import { useId, useRef, useState } from "react";
import { GLOBAL_LIMIT } from "@/lib/sudostamp";
import {
  COMPUTER_NAME,
  EXAMPLE,
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

// The phone's rate limiter, driven by what you send. Every row is the real
// Limiter (SudoStamp's Limiter.kt, ported with its tests) or, under "per
// address", the cooldown that shipped in 1.3.0, replayed on the figure's own
// clock. The figure only feeds requests in and reads the state out.
//
// It is not the app: no phone, no pam_rssh, no network. The clock is the
// figure's, and an answer takes two seconds because the figure says so.

const MAX_REQUESTS = 24;

function Choice<T extends string | number>({
  label,
  value,
  options,
  onChange,
  className = "",
}: {
  label: string;
  value: T;
  options: { value: T; text: string }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const go = (from: number, step: number) => {
    const n = (from + step + options.length) % options.length;
    onChange(options[n].value);
    refs.current[n]?.focus();
  };
  return (
    <div className={className}>
      <span id={id} className="fact block pb-1">
        {label}
      </span>
      <div role="radiogroup" aria-labelledby={id} className="flex flex-wrap gap-1">
        {options.map((o, i) => {
          const on = o.value === value;
          return (
            <button
              key={String(o.value)}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              onClick={() => onChange(o.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                  e.preventDefault();
                  go(i, 1);
                } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                  e.preventDefault();
                  go(i, -1);
                } else if (e.key === "Home") {
                  e.preventDefault();
                  go(0, 0);
                } else if (e.key === "End") {
                  e.preventDefault();
                  go(options.length - 1, 0);
                }
              }}
              className={`wd-narrow min-h-8 px-3 rounded-[var(--r-chip)] border text-[0.95rem] leading-none ${on ? "bg-fg text-background border-fg" : "border-border text-fg hover:border-fg"}`}
            >
              {o.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function stateText(r: Row, keying: Keying): string {
  const parts: string[] = [];
  if (r.state.quietLeftMs > 0) parts.push(`quiet for ${leftText(r.state.quietLeftMs)} more`);
  for (const c of r.state.cooling) parts.push(`${c.who} cooling down for ${leftText(c.leftMs)} more`);
  if (r.state.windowCount !== null) parts.push(`${r.state.windowCount} of ${GLOBAL_LIMIT} unapproved in the last 10 min`);
  if (parts.length === 0) parts.push(keying === "address" ? "no address cooling down" : "nothing holding back");
  return parts.join("; ");
}

function outcomeText(r: Row): { head: string; rest: string } {
  switch (r.outcome) {
    case "refused":
      const why = r.reason ?? "";
      return { head: r.rule === "payload" ? "Refused before you were asked." : "Refused. You were not asked.", rest: `${why.charAt(0).toUpperCase()}${why.slice(1)}.` };
    case "approved":
      return { head: "You were asked.", rest: "You approved." };
    case "denied":
      return { head: "You were asked.", rest: "You denied." };
    case "ignored":
      return { head: "You were asked.", rest: "No answer for 60 s, so it timed out." };
  }
}

function announce(r: Row): string {
  const o = outcomeText(r);
  return `Request ${r.n}, ${COMPUTER_NAME[r.from]}, at ${clockText(r.atMs)}: ${o.head} ${o.rest}`;
}

export default function LimiterTimeline() {
  const [keying, setKeying] = useState<Keying>("computer");
  const [inputs, setInputs] = useState<RequestInput[]>(EXAMPLE);
  const [from, setFrom] = useState<Computer>("b");
  const [fresh, setFresh] = useState(true);
  const [payload, setPayload] = useState(32);
  const [answer, setAnswer] = useState<Answer>("deny");
  const [gapMs, setGapMs] = useState<number>(5_000);
  const [said, setSaid] = useState("");

  const rows = timeline(inputs, keying);
  const full = inputs.length >= MAX_REQUESTS;

  const send = () => {
    if (full) return;
    const next = [...inputs, { from, fresh, payload, answer, gapMs }];
    setInputs(next);
    const rows2 = timeline(next, keying);
    const last = rows2[rows2.length - 1];
    if (last) setSaid(announce(last));
  };

  const other = keying === "computer" ? "1.3" : "1.4";

  return (
    <figure className="my-8">
      <div className="border-2 border-fg rounded-[var(--r-box)]">
        <div className="p-4 border-b border-border">
          <Choice<Keying>
            label="The phone counts requests by"
            value={keying}
            onChange={(k) => {
              setKeying(k);
              setSaid(k === "computer" ? "Counting by computer, as in 1.4." : "Counting by address, as in 1.3.");
            }}
            options={[
              { value: "computer", text: "computer (1.4)" },
              { value: "address", text: "address (1.3)" },
            ]}
          />
        </div>

        {rows.length === 0 ? (
          <p className="fact p-4 border-b border-border">Nothing sent yet. Send a request below.</p>
        ) : (
          <ol aria-label="Requests, oldest first" className="divide-y divide-border border-b border-border">
            {rows.map((r) => {
              const o = outcomeText(r);
              const differs = r.asked !== r.askedUnderOther;
              return (
                <li key={r.n} className="px-4 py-3">
                  <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <span className="fact tabular-nums">{clockText(r.atMs)}</span>
                    <span className="font-semibold">{COMPUTER_NAME[r.from]}</span>
                    <span className="fact">
                      from <span className="font-mono text-[0.75rem]">{r.address}</span>, {r.payload} bytes
                    </span>
                  </p>
                  <p className="mt-0.5 leading-snug">
                    <strong className="font-semibold">{o.head}</strong> {o.rest}
                  </p>
                  <p className="fact mt-0.5">Now: {stateText(r, keying)}.</p>
                  {differs && (
                    <p className="fact mt-0.5">
                      {r.asked ? (
                        <span className="text-warn">Under {other}, the same requests would have refused this one.</span>
                      ) : (
                        <span className="text-ok">Under {other}, the same requests would have asked you here.</span>
                      )}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        <form
          className="p-4"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            <Choice<Computer>
              label="Request from"
              value={from}
              onChange={setFrom}
              options={[
                { value: "a", text: "Computer A" },
                { value: "b", text: "Computer B" },
              ]}
            />
            <Choice<string>
              label="Source address"
              value={fresh ? "new" : "same"}
              onChange={(v) => setFresh(v === "new")}
              options={[
                { value: "same", text: "the same one" },
                { value: "new", text: "a new one each time" },
              ]}
            />
            <Choice<number>
              label="It asks the phone to sign"
              value={payload}
              onChange={setPayload}
              options={[
                { value: 32, text: "32 bytes, a challenge" },
                { value: 100, text: "100 bytes, something else" },
              ]}
            />
            <Choice<Answer>
              label="If the phone asks, you"
              value={answer}
              onChange={setAnswer}
              options={[
                { value: "approve", text: "approve" },
                { value: "deny", text: "deny" },
                { value: "ignore", text: "ignore it" },
              ]}
            />
            <Choice<number>
              className="sm:col-span-2"
              label="It arrives after the previous request is over"
              value={gapMs}
              onChange={setGapMs}
              options={GAPS_MS.map((g) => ({ value: g, text: gapText(g) }))}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <button type="submit" className="btn" disabled={full}>
              Send request
            </button>
            <button
              type="button"
              className="fact underline decoration-fg/30 underline-offset-4 hover:text-fg"
              onClick={() => {
                setInputs([]);
                setSaid("Cleared.");
              }}
            >
              Start over
            </button>
            <button
              type="button"
              className="fact underline decoration-fg/30 underline-offset-4 hover:text-fg"
              onClick={() => {
                setInputs(EXAMPLE);
                setSaid("Example restored.");
              }}
            >
              Replay the example
            </button>
          </div>
          {full && <p className="fact mt-3">That is {MAX_REQUESTS} requests. Start over to send more.</p>}
        </form>
      </div>
      <div role="status" className="sr-only">
        {said}
      </div>
      <figcaption className="mt-3 fact">
        Each row is the app&apos;s own limiter, ported to TypeScript with its constants and messages, replaying what you send. Under &ldquo;address&rdquo; it is the per-address cooldown from 1.3, which had no quiet period and no overall cap. The clock is the
        figure&apos;s, an answer takes two seconds by assumption, and the addresses are from the documentation range. No phone, no pam_rssh and no network are involved.
      </figcaption>
    </figure>
  );
}
