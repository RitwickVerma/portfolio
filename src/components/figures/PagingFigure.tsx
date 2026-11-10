"use client";

import { useState } from "react";
import { ROWS, RUNS, cooldownFor, failed, initialRuns, nextRun, pages, sent, type Rule, type Run } from "@/lib/paging";

// The paging rule of the note on a strip of made-up health checks. Press a run
// to flip it. The pages are computed from the strip, not drawn.

const GLYPH: Record<Run, string> = { 0: "", 1: "×", 2: "?" };
const WORD: Record<Run, string> = { 0: "healthy", 1: "failed", 2: "could not be checked" };

export default function PagingFigure() {
  const [runs, setRuns] = useState<Record<string, Run[]>>(initialRuns);
  const [rule, setRule] = useState<Rule>("gated");

  const flags = Object.fromEntries(ROWS.map((r) => [r.id, pages(runs[r.id], rule, { cooldown: cooldownFor(r) })]));
  const totalFailed = ROWS.reduce((n, r) => n + failed(runs[r.id]), 0);
  const totalSent = ROWS.reduce((n, r) => n + sent(flags[r.id]), 0);

  const press = (id: string, i: number, watchdog: boolean) =>
    setRuns({ ...runs, [id]: runs[id].map((v, j) => (j === i ? nextRun(v, watchdog) : v)) });

  return (
    <figure className="my-8 border-t-2 border-fg pt-4" aria-labelledby="paging-cap">
      <p className="fact mb-3">
        Each cell is one run, five minutes apart. Press one to change it. × failed, ? could not be checked, ▲ a page was sent.
      </p>
      <div role="region" aria-label="Sixteen health check runs for three conditions. Scrolls sideways on a narrow screen." tabIndex={0} className="overflow-x-auto pb-2">
        <div className="min-w-max">
          {ROWS.map((row) => (
            <div key={row.id} className="mb-3">
              <p className="fact mb-1">{row.label}</p>
              <ul className="flex gap-1">
                {runs[row.id].map((v, i) => {
                  const paged = flags[row.id][i];
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => press(row.id, i, row.watchdog)}
                        aria-label={`${row.label}, run ${i + 1} of ${RUNS}: ${WORD[v]}${paged ? ", a page is sent" : ""}. Press to change.`}
                        className={`w-8 h-14 flex flex-col items-center justify-between py-1 border-[1.5px] border-fg text-sm leading-none hover:border-accent ${v === 1 ? "bg-fg text-bg" : ""} ${v === 2 ? "border-dashed" : ""}`}
                      >
                        <span aria-hidden="true">{GLYPH[v]}</span>
                        <span aria-hidden="true" className="text-[0.7rem]">{paged ? "▲" : ""}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
        <p aria-live="polite" className="wd-semi text-[1.25rem] font-bold" data-testid="paging-count">
          {totalFailed} checks failed, {totalSent} {totalSent === 1 ? "page" : "pages"} sent
        </p>
        <button
          type="button"
          role="switch"
          aria-checked={rule === "every"}
          onClick={() => setRule(rule === "gated" ? "every" : "gated")}
          className="inline-flex items-center gap-2 min-h-8 px-3 py-1 rounded-[4px] border-[1.5px] border-fg text-[0.9rem] hover:border-accent aria-checked:bg-fg aria-checked:text-bg"
        >
          Naive rule: page on every failure
          <span className="fact !text-inherit" aria-hidden="true">{rule === "every" ? "on" : "off"}</span>
        </button>
        <button type="button" className="btn-quiet" onClick={() => setRuns(initialRuns())}>
          Reset the strip
        </button>
      </div>

      <figcaption id="paging-cap" className="fact mt-4 max-w-[60ch]">
        The note&apos;s rule on made-up runs: a condition pages once it has failed two runs in a row, and not again while it persists. The cooldown (six hours for a service check, twelve for the watchdog) is longer than this strip, so no second page can show. The note does not say what a fault that clears and returns counts as; here it is a new fault. It models the rule, not the script.
      </figcaption>
    </figure>
  );
}
