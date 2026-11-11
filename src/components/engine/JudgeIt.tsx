"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Marked, ResultLink } from "@/components/search/parts";
import { JUDGMENTS } from "@/lib/eval";
import {
  disagreementLine,
  evaluateWith,
  exportGrades,
  GRADES,
  gradedCount,
  judgeRows,
  parseStored,
  serializeStored,
  setGrade,
  STORAGE_KEY,
  type Grade,
  type JudgeRow,
  type Pair,
  type Stored,
} from "@/lib/judge";
import { CONTROL, TREATMENT } from "@/lib/search";
import { useSearchIndex } from "@/lib/useSearchIndex";

const RANKERS = { treatment: TREATMENT, control: CONTROL };
const ORDER = JUDGMENTS.map((j) => j.query);
const pct = (n: number) => `${Math.round(n * 100)}%`;
const word: Record<Grade, string> = { 2: "relevant", 1: "partly", 0: "not relevant" };

// The visitor's grades live in sessionStorage under one key, so a reload keeps
// them and closing the tab drops them. A store, so React reads the one value;
// when storage is blocked the grades live in memory for the life of the page.
let cache: string | null = null;
const listeners = new Set<() => void>();
function readRaw(): string {
  if (cache === null) {
    try {
      cache = sessionStorage.getItem(STORAGE_KEY) ?? "";
    } catch {
      cache = "";
    }
  }
  return cache;
}
function writeRaw(value: string) {
  cache = value;
  try {
    if (value) sessionStorage.setItem(STORAGE_KEY, value);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Blocked storage: the grades stay in memory.
  }
  for (const l of listeners) l();
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const noopSubscribe = () => () => {};

const button =
  "inline-flex items-center justify-center min-h-11 sm:min-h-9 px-3 rounded-[var(--r-chip)] border border-fg/40 text-[0.95rem] leading-tight transition-colors duration-[var(--dur-tap)] hover:border-fg disabled:opacity-50 disabled:hover:border-fg/40 disabled:cursor-not-allowed";

function MetricsTable({ you, owner }: { you: Pair; owner: Pair }) {
  const rows: { label: string; pick: (s: Pair["treatment"]) => string }[] = [
    { label: "P@1", pick: (s) => pct(s.p1) },
    { label: "MRR", pick: (s) => s.mrr.toFixed(2) },
    { label: "nDCG@5", pick: (s) => s.ndcg.toFixed(2) },
  ];
  return (
    <div className="overflow-x-auto max-w-[44rem]">
      <table className="w-full min-w-[20rem] border-collapse text-[0.95rem]" data-judge-metrics>
        <caption className="sr-only">Metrics under your grades and under mine, for the queries you have graded</caption>
        <thead>
          <tr className="fact text-left">
            <td className="py-1" />
            <th scope="colgroup" colSpan={2} className="font-normal py-1 pr-4">
              Your grades
            </th>
            <th scope="colgroup" colSpan={2} className="font-normal py-1">
              My grades
            </th>
          </tr>
          <tr className="fact text-left border-b border-fg">
            <th scope="col" className="font-normal py-2 pr-3">
              <span className="sr-only">Metric</span>
            </th>
            <th scope="col" className="font-normal py-2 pr-3">
              Treatment
            </th>
            <th scope="col" className="font-normal py-2 pr-4">
              Control
            </th>
            <th scope="col" className="font-normal py-2 pr-3">
              Treatment
            </th>
            <th scope="col" className="font-normal py-2">
              Control
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-border" data-metric={r.label}>
              <th scope="row" className="text-left font-normal py-1.5 pr-3">
                {r.label}
              </th>
              <td className="py-1.5 pr-3 font-mono text-sm" data-cell="you-treatment">
                {r.pick(you.treatment)}
              </td>
              <td className="py-1.5 pr-4 font-mono text-sm" data-cell="you-control">
                {r.pick(you.control)}
              </td>
              <td className="py-1.5 pr-3 font-mono text-sm" data-cell="owner-treatment">
                {r.pick(owner.treatment)}
              </td>
              <td className="py-1.5 font-mono text-sm" data-cell="owner-control">
                {r.pick(owner.control)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Grade the results of the judged queries and watch the replay's metrics
 * recompute from your grades. `first` is the first query's merged rows, built
 * with the page, so the server HTML shows a real list (with its controls off)
 * and the section reads without JavaScript. Everything after that is computed
 * in the tab by lib/judge.ts, over the same index the replay used.
 */
export default function JudgeIt({ first }: { first: JudgeRow[] }) {
  const { index, full } = useSearchIndex();
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const raw = useSyncExternalStore(subscribe, readRaw, () => "");
  const stored: Stored = useMemo(() => parseStored(raw, ORDER), [raw]);
  const { at, grades } = stored;
  const judgment = JUDGMENTS[at];
  const ready = hydrated && full;

  const rows: JudgeRow[] | null = useMemo(() => (full ? judgeRows(index, judgment, RANKERS) : at === 0 ? first : null), [full, index, judgment, at, first]);
  const result = useMemo(() => (full && gradedCount(grades) > 0 ? evaluateWith(index, grades, RANKERS, JUDGMENTS) : null), [full, index, grades]);
  const titles = useMemo(() => new Map(index.docs.map((d) => [d.id, d.title])), [index]);

  const save = (next: Stored) => writeRaw(serializeStored(next));
  const heading = useRef<HTMLParagraphElement>(null);
  const moved = useRef(false);
  useEffect(() => {
    if (moved.current) heading.current?.focus();
    moved.current = false;
  }, [at]);
  const go = (to: number) => {
    moved.current = true;
    save({ ...stored, at: Math.min(Math.max(to, 0), JUDGMENTS.length - 1) });
  };

  const [copy, setCopy] = useState<{ state: "idle" | "copied" | "fallback"; text: string }>({ state: "idle", text: "" });
  const area = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (copy.state === "fallback") {
      area.current?.focus();
      area.current?.select();
    }
  }, [copy]);
  const onCopy = async () => {
    const text = JSON.stringify(exportGrades(grades, ORDER, new Date()), null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopy({ state: "copied", text });
    } catch {
      setCopy({ state: "fallback", text });
    }
  };

  const here = result?.queries.find((q) => q.query === judgment.query);
  const graded = gradedCount(grades);
  const gradeOfRow = (id: string): Grade | undefined => grades[judgment.query]?.[id];

  return (
    <div data-judge>
      {/* Before hydration, which is all that a visitor without JavaScript ever gets; React does not render noscript children. */}
      {!hydrated ? <p className="mb-4 max-w-[68ch]" data-judge-nojs>Grading needs JavaScript: the grade buttons switch on once it has loaded.</p> : null}

      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p ref={heading} tabIndex={-1} className="wd-semi text-2xl font-extrabold leading-tight outline-none" data-judge-query>
          <span className="sr-only">Query: </span>
          <span className="font-mono text-[0.85em]">{judgment.query}</span>
        </p>
        <p className="fact" data-judge-position>
          Query {at + 1} of {JUDGMENTS.length}
        </p>
      </div>
      <p className="mt-3 max-w-[68ch] text-fg/85">
        The top five from each of the two rankers, merged into one list, so nothing here says which ranker produced what. Mark each result relevant, partly
        or not for this query. A row you leave ungraded counts as not relevant; pressing a grade a second time clears it.
      </p>
      {!ready && hydrated ? (
        <p className="fact mt-2" role="status">
          Loading the search index; the grade buttons switch on when it is in.
        </p>
      ) : null}

      {rows ? (
        <ul className="mt-6 border-b border-border max-w-[64rem]" data-judge-rows>
          {rows.map((row) => {
            const given = gradeOfRow(row.id);
            return (
              <li key={row.id} className="border-t border-border py-3 grid gap-x-6 gap-y-2 sm:grid-cols-[1fr_auto]" data-judge-row data-doc={row.id}>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-baseline gap-x-3">
                    <ResultLink href={row.href} className="link font-semibold">
                      {row.title}
                    </ResultLink>
                    <span className="fact">{row.kind}</span>
                  </p>
                  <p className="mt-1 text-[0.95rem] text-fg/80 max-w-[68ch]">
                    <Marked text={row.snippet} stems={row.stems} />
                  </p>
                </div>
                <div role="group" aria-label={`Your grade for ${row.title}`} className="flex flex-wrap gap-1.5 sm:justify-end sm:self-start">
                  {GRADES.map(({ grade, label }) => (
                    <button
                      key={grade}
                      type="button"
                      data-grade={grade}
                      disabled={!ready}
                      aria-pressed={given === grade}
                      onClick={() => save({ ...stored, grades: setGrade(grades, judgment.query, row.id, grade) })}
                      className={`${button} aria-pressed:bg-fg aria-pressed:text-background aria-pressed:border-fg`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-6 border-y border-border py-3" role="status">
          Loading this query&apos;s results.
        </p>
      )}

      {here ? (
        <p className="mt-4 max-w-[72ch]" data-judge-disagree>
          {disagreementLine(here)}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" className={button} disabled={!ready || at === 0} onClick={() => go(at - 1)} data-judge-prev>
          Previous query
        </button>
        <button type="button" className={button} disabled={!ready || at === JUDGMENTS.length - 1} onClick={() => go(at + 1)} data-judge-next>
          Next query
        </button>
        <button type="button" className={button} disabled={!ready || (graded === 0 && at === 0)} onClick={() => (setCopy({ state: "idle", text: "" }), writeRaw(""))} data-judge-reset>
          Start over
        </button>
      </div>

      {graded > 0 && !result ? (
        <p className="mt-8 fact" role="status">
          You have grades from earlier; the numbers come back when the search index has loaded.
        </p>
      ) : null}

      {result ? (
        <div className="mt-12" data-judge-result>
          <h3 className="wd-semi text-xl font-extrabold leading-tight max-w-[40ch]">
            {result.graded === 1 ? "On the one query you graded" : `On the ${result.graded} queries you graded`}, your grades give these numbers.
          </h3>
          <p className="mt-2 max-w-[68ch] text-fg/85">
            The same three metrics as the replay table, computed by the same code from your grades, for treatment and for control, beside mine for the same
            queries. P@1 is the share of queries whose first result is relevant, MRR the mean of one over the rank of the first relevant result, nDCG@5 the
            graded gain of the top five against the best possible five. Rows you did not grade count as not relevant.
          </p>
          <div className="mt-5">
            <MetricsTable you={result.you} owner={result.owner} />
          </div>
          <p className="fact mt-3 max-w-[72ch]" data-judge-note>
            You saw the top five of each ranker, so your ideal ranking for nDCG@5 is made of the rows you saw; mine, above, is made of the whole corpus. Cut to the
            rows you saw, my grades give treatment P@1 {pct(result.ownerOnShown.treatment.p1)}, MRR {result.ownerOnShown.treatment.mrr.toFixed(2)}, nDCG@5{" "}
            {result.ownerOnShown.treatment.ndcg.toFixed(2)}; control P@1 {pct(result.ownerOnShown.control.p1)}, MRR {result.ownerOnShown.control.mrr.toFixed(2)},
            nDCG@5 {result.ownerOnShown.control.ndcg.toFixed(2)}.
          </p>

          <h3 className="wd-semi text-xl font-extrabold leading-tight max-w-[40ch] mt-10">Where you and I disagree.</h3>
          <ul className="mt-3 border-b border-border" data-judge-disagreements>
            {result.queries.map((q) => (
              <li key={q.query} className="border-t border-border py-3" data-judge-query-line={q.query}>
                <p>
                  <span className="font-mono text-xs">{q.query}</span> <span className="ml-2">{disagreementLine(q)}</span>
                </p>
                {q.disagreements.length > 0 ? (
                  <ul className="mt-1.5 space-y-0.5 text-[0.95rem] text-fg/85">
                    {q.disagreements.map((d) => (
                      <li key={d.id}>
                        {titles.get(d.id) ?? d.id}: {d.ungraded ? "you left it ungraded, which counts as not relevant" : `you said ${word[d.you]}`}, I said {word[d.owner]}.
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-10 border-t border-border pt-6">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={button} disabled={!ready || graded === 0} onClick={onCopy} data-judge-copy>
            Copy my grades
          </button>
          <p className="fact max-w-[60ch]" role="status" data-judge-copy-status>
            {copy.state === "copied"
              ? `Copied the grades for ${graded} ${graded === 1 ? "query" : "queries"} as JSON.`
              : copy.state === "fallback"
                ? "This browser would not let the page copy, so the JSON is selected below; copy it from there."
                : ""}
          </p>
        </div>
        <p className="fact mt-2 max-w-[68ch]">I did not build a way to email them to me: nothing leaves this page unless you copy it and send it yourself.</p>
        {copy.state === "fallback" ? (
          <textarea
            ref={area}
            readOnly
            value={copy.text}
            rows={10}
            aria-label="Your grades as JSON"
            className="mt-3 w-full max-w-[68ch] border border-fg/40 bg-transparent p-2 font-mono text-xs"
            data-judge-fallback
          />
        ) : null}
      </div>
    </div>
  );
}
