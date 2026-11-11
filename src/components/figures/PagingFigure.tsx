"use client";

import { useState } from "react";
import { FigureFrame, Fold, Presets, QuietAction, Segmented, Verdict } from "./kit";
import { ROWS, SCENARIOS, cooldownFor, failed, initialRuns, nextRun, pages, pagingVerdict, plural, totals, type Rule, type Run, type ScenarioId } from "@/lib/paging";

// The paging rule of the note on a strip of made-up health checks. The pages
// are computed from the strip by lib/paging, not drawn by hand.

const WORD: Record<Run, string> = { 0: "healthy", 1: "failed", 2: "could not be checked" };
const RULES: { id: Rule; label: string }[] = [
  { id: "gated", label: "Page once per new fault" },
  { id: "every", label: "Page on every failure" },
];

export default function PagingFigure() {
  const [runs, setRuns] = useState<Record<string, Run[]>>(initialRuns);
  const [rule, setRule] = useState<Rule>("gated");
  const [active, setActive] = useState<ScenarioId | null>("lasts");

  const flags = Object.fromEntries(ROWS.map((r) => [r.id, pages(runs[r.id], rule, { cooldown: cooldownFor(r) })]));
  const said = pagingVerdict(totals(runs, rule), rule);

  const pick = (id: ScenarioId) => {
    setRuns(SCENARIOS.find((s) => s.id === id)!.runs());
    setActive(id);
  };
  const press = (id: string, i: number, watchdog: boolean) => {
    setRuns({ ...runs, [id]: runs[id].map((v, j) => (j === i ? nextRun(v, watchdog) : v)) });
    setActive(null);
  };

  return (
    <FigureFrame
      claim="A fault that keeps failing pages me once, not on every check."
      how={<>Press &ldquo;Page on every failure&rdquo;: the same checks, far more pages.</>}
      caption="The note's rule applied to made-up checks, not the script itself."
      about={
        <>
          <p>A page goes out only when a condition has failed two runs in a row. While it keeps failing it does not page again until a cooldown has passed: six hours for a service check, twelve for the watchdog. That is longer than this strip, so a second page can never show here. A check that could not run counts as a fault of its own.</p>
          <p>The note also says a flapping condition costs one message, not one per flap. The model keeps that by treating a fault that clears and returns inside the cooldown as the same alert. The note does not spell out the mechanism; that is my reading of it.</p>
          <p>One square is one run of the health check, which the note says runs every five minutes. The failures are not real.</p>
        </>
      }
    >
      <Segmented label="Rule" options={RULES} value={rule} onChange={setRule} />
      <Presets label="Checks" items={SCENARIOS} active={active} onPick={pick} />

      <div>
        {ROWS.map((row) => (
          <div key={row.id} className="mb-3 last:mb-0">
            <p className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="font-semibold">{row.label}</span>
              <span className="text-[0.95rem] leading-snug text-fg/75">
                {failed(runs[row.id])} failed, {plural(flags[row.id].filter(Boolean).length, "page", "pages")}
              </span>
            </p>
            <ol className="flex gap-[3px] mt-1" aria-label={`${row.label}, twelve checks, oldest first`}>
              {runs[row.id].map((v, i) => (
                <li
                  key={i}
                  aria-label={`${WORD[v]}${flags[row.id][i] ? ", page sent" : ""}`}
                  className={`flex-1 min-w-0 h-12 border border-fg flex flex-col items-center justify-between py-0.5 text-base font-bold leading-none ${v === 1 ? "bg-fg text-background" : ""} ${v === 2 ? "border-dashed" : ""}`}
                >
                  <span aria-hidden="true">{v === 1 ? "×" : v === 2 ? "?" : ""}</span>
                  <span aria-hidden="true" className="text-sm">{flags[row.id][i] ? "▲" : ""}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
        <p className="text-[0.95rem] leading-snug text-fg/75 mt-2">One square is one check, five minutes apart; an empty one passed. × failed, ? could not be checked, ▲ a page was sent.</p>
      </div>

      <Verdict tone={said.tone} title={said.title}>
        <p data-testid="paging-detail">{said.detail}</p>
      </Verdict>

      <Fold summary="More controls">
        <p className="text-[0.95rem] leading-snug text-fg/75 mb-2">Press a square to flip it. The watchdog checks can also be &ldquo;could not be checked&rdquo;.</p>
        <div role="region" aria-label="Flip individual checks. Scrolls sideways on a narrow screen." tabIndex={0} className="overflow-x-auto pb-2">
          <div className="min-w-max">
            {ROWS.map((row) => (
              <div key={row.id} className="mb-2">
                <p className="text-[0.95rem] leading-snug text-fg/75">{row.label}</p>
                <ul className="flex gap-1">
                  {runs[row.id].map((v, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => press(row.id, i, row.watchdog)}
                        aria-label={`${row.label}, check ${i + 1} of ${runs[row.id].length}: ${WORD[v]}. Press to change.`}
                        className={`w-11 h-11 border-[1.5px] border-fg text-sm leading-none hover:border-accent ${v === 1 ? "bg-fg text-background" : ""} ${v === 2 ? "border-dashed" : ""}`}
                      >
                        {v === 1 ? "×" : v === 2 ? "?" : ""}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <QuietAction
          onClick={() => {
            setRuns(initialRuns());
            setActive("lasts");
          }}
        >
          Reset the checks
        </QuietAction>
      </Fold>
    </FigureFrame>
  );
}
