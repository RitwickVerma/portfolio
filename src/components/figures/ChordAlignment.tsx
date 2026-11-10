"use client";

import { useId, useMemo, useRef, useState, useEffect, type KeyboardEvent } from "react";
import { MIN_SIMILARITY, compare, type Comparison } from "@/lib/chordAlign";
import { GRACE_DURATION, GRACE_LINES, GRACE_ROWS, clock } from "@/lib/chordAlignFixture";

// Chordist lines a chord chart up with the timed lyrics of the recording. This figure runs that
// alignment, the real one ported from chordist/align.py, on a chart you can edit: every number on
// it is recomputed from the rows as they stand, the score matrix included. The switch runs the
// greedy scan the widget used before, for the same rows.
//
// What it is not: the real thing reads a scraped chart and the timed lines of whatever song is
// playing. Here the song is fixed ("Amazing Grace", public domain) and so are its lines.

type Method = "alignment" | "greedy";
type Cells = "path" | "similarity" | "value";
interface Row {
  id: number;
  text: string;
}

const LINES = GRACE_LINES;
const NAME: Record<Method, string> = { alignment: "Alignment", greedy: "Greedy scan" };
const f = (x: number) => x.toFixed(2);
const fullChart = (): Row[] => GRACE_ROWS.map((text, id) => ({ id, text }));
/** What the figure opens on: the chart with 'Twas grace that taught my heart to fear (row 5) left out. */
const MISSING = 4;
const openingChart = (): Row[] => fullChart().filter((_, k) => k !== MISSING);
const MAX_ROWS = 24;

const quiet =
  "fact inline-flex min-h-6 items-center rounded-[3px] border border-transparent px-1.5 py-0.5 underline decoration-fg/30 underline-offset-4 hover:text-fg aria-[pressed=true]:border-fg aria-[pressed=true]:font-semibold aria-[pressed=true]:text-fg aria-[pressed=true]:no-underline disabled:opacity-45 disabled:no-underline";

function lineText(j: number | null, times: number[] | null, i: number): string {
  // "0:34, line 5", or, for a row nothing matched, the time its neighbours imply.
  if (j !== null) return `${clock(LINES[j].t)}, line ${j + 1}`;
  return times ? `no line, about ${clock(times[i])} by interpolation` : "no line";
}

export default function ChordAlignment() {
  const uid = useId();
  const [rows, setRows] = useState<Row[]>(openingChart);
  const [method, setMethod] = useState<Method>("alignment");
  const [cells, setCells] = useState<Cells>("path");
  const [sel, setSel] = useState<{ i: number; j: number } | null>(null);
  const [announce, setAnnounce] = useState("");
  const nextId = useRef(GRACE_ROWS.length);
  const pendingFocus = useRef<string | null>(null);

  const texts = useMemo(() => rows.map((r) => r.text), [rows]);
  const cmp: Comparison = useMemo(() => compare(texts, LINES, GRACE_DURATION), [texts]);
  const n = rows.length;
  const m = LINES.length;
  const { alignment: dp } = cmp;
  const runs = { alignment: cmp.alignmentRun, greedy: cmp.greedyRun };
  const other: Method = method === "alignment" ? "greedy" : "alignment";
  const shown = runs[method];
  const rival = runs[other];

  // The selected cell defaults to where the traceback starts, and is clamped when rows go away.
  const cell = { i: Math.min(sel?.i ?? n, n), j: Math.min(sel?.j ?? m, m) };

  useEffect(() => {
    if (pendingFocus.current) {
      document.getElementById(pendingFocus.current)?.focus();
      pendingFocus.current = null;
    }
  });

  const rowInput = (id: number) => `${uid}-row-${id}`;
  const cellId = (i: number, j: number) => `${uid}-c-${i}-${j}`;

  function say(next: string[], lead: string) {
    const c = compare(next, LINES, GRACE_DURATION);
    const last = (r: typeof c.alignmentRun) => (r.times ? clock(r.times[next.length - 1]) : "none");
    setAnnounce(
      `${lead} Alignment places ${c.alignmentRun.placed} of ${next.length} rows, last row at ${last(c.alignmentRun)}. Greedy scan places ${c.greedyRun.placed}, last row at ${last(c.greedyRun)}.`,
    );
  }

  function commit(next: Row[], lead: string, focusId?: number) {
    setRows(next);
    if (focusId !== undefined) pendingFocus.current = rowInput(focusId);
    say(
      next.map((r) => r.text),
      lead,
    );
  }

  function duplicate(index: number) {
    if (n >= MAX_ROWS) return;
    const copy = { id: nextId.current++, text: rows[index].text };
    commit([...rows.slice(0, index + 1), copy, ...rows.slice(index + 1)], `Row ${index + 1} duplicated.`, copy.id);
  }

  function remove(index: number) {
    const next = rows.filter((_, k) => k !== index);
    const focus = next[Math.min(index, next.length - 1)];
    commit(next, `Row ${index + 1} deleted.`, focus?.id);
  }

  function preset(kind: "full" | "missing" | "repeat" | "one") {
    nextId.current = GRACE_ROWS.length;
    if (kind === "full") commit(fullChart(), "The whole chart, twelve rows.");
    else if (kind === "missing") commit(openingChart(), "The chart without its fifth row.");
    else if (kind === "repeat") {
      const again = GRACE_ROWS.slice(8).map((text) => ({ id: nextId.current++, text }));
      commit([...fullChart(), ...again], "The last verse is in the chart twice.");
    } else commit(fullChart().map((r) => (r.id === 3 ? { ...r, text: "amen" } : r)), "Row 4 is now one word.");
    setSel(null);
  }

  function onGridKey(e: KeyboardEvent<HTMLTableCellElement>, i: number, j: number) {
    let ti = i;
    let tj = j;
    if (e.key === "ArrowUp") ti = Math.max(0, i - 1);
    else if (e.key === "ArrowDown") ti = Math.min(n, i + 1);
    else if (e.key === "ArrowLeft") tj = Math.max(0, j - 1);
    else if (e.key === "ArrowRight") tj = Math.min(m, j + 1);
    else if (e.key === "Home") tj = 0;
    else if (e.key === "End") tj = m;
    else return;
    e.preventDefault();
    document.getElementById(cellId(ti, tj))?.focus();
  }

  // Which cells each method uses, in matrix coordinates (row i against line j is cell i+1, j+1).
  const pathAt = new Map(dp.path.map((p) => [`${p.i},${p.j}`, p.step]));
  const dpPairs = new Set(dp.path.filter((p) => p.step === 1).map((p) => `${p.i},${p.j}`));
  const greedyPairs = new Set(cmp.greedy.picks.map((p) => `${p.row + 1},${p.line + 1}`));
  const mine = method === "alignment" ? dpPairs : greedyPairs;
  const theirs = method === "alignment" ? greedyPairs : dpPairs;

  const rowLast = (r: typeof shown) => (r.times && n > 0 ? clock(r.times[n - 1]) : "none");
  const greedyBehind = cmp.greedyRun.agreement < cmp.alignmentRun.agreement - 1e-9;

  return (
    <figure className="my-8" aria-label="Aligning a chord chart to timed lyrics">
      <p className="fact">
        The rows are a chord chart, the recording is twelve timed lines. It opens with one row of the chart left out. Edit a row, copy it with + or drop it with ×.
      </p>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="fact">Try</span>
        {(
          [
            ["missing", "A line missing"],
            ["full", "Full chart"],
            ["repeat", "Last verse twice"],
            ["one", "A one-word row"],
          ] as ["missing" | "full" | "repeat" | "one", string][]
        ).map(([k, label]) => (
          <button key={k} type="button" className={quiet} onClick={() => preset(k)}>
            {label}
          </button>
        ))}
      </div>

      <p role="status" className="sr-only">
        {announce}
      </p>

      <table className="mt-4 w-full border-collapse text-left">
        <caption className="sr-only">The same rows, matched both ways. Choose a method to see its pairs in the list and the matrix.</caption>
        <thead className="fact">
          <tr>
            <th scope="col" className="py-1 pr-3 font-normal">
              Method
            </th>
            <th scope="col" className="py-1 pr-3 font-normal">
              Rows on a line
            </th>
            <th scope="col" className="py-1 pr-3 font-normal">
              Agreement
            </th>
            <th scope="col" className="py-1 font-normal">
              Last row at
            </th>
          </tr>
        </thead>
        <tbody>
          {(["alignment", "greedy"] as Method[]).map((k) => (
            <tr key={k} className="border-t border-border">
              <th scope="row" className="py-1 pr-3 text-left font-normal">
                <button type="button" className={`${quiet} ${method === k ? "" : "text-muted"}`} aria-pressed={method === k} onClick={() => setMethod(k)}>
                  {NAME[k]}
                </button>
              </th>
              <td className="py-1.5 pr-3 font-mono text-[0.75rem]">
                {runs[k].placed} of {n}
              </td>
              <td className="py-1.5 pr-3 font-mono text-[0.75rem]">{f(runs[k].agreement)}</td>
              <td className={`py-1.5 font-mono text-[0.75rem] ${k === "greedy" && greedyBehind && n > 0 ? "text-warn" : ""}`}>{rowLast(runs[k])}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ol className="mt-5 border-t-2 border-fg">
        {n === 0 && <li className="py-3 fact">No chart rows, so there is nothing to align.</li>}
        {rows.map((row, index) => {
          const j = shown.match[index];
          const jOther = rival.match[index];
          const differs = j !== jOther;
          return (
            <li key={row.id} className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-x-2 border-b border-border py-2">
              <span className="fact font-mono text-[0.7rem]" aria-hidden="true">
                {index + 1}
              </span>
              <input
                id={rowInput(row.id)}
                type="text"
                value={row.text}
                aria-label={`Chart row ${index + 1}`}
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => setRows(rows.map((r) => (r.id === row.id ? { ...r, text: e.target.value } : r)))}
                className="w-full min-w-0 border-b border-border bg-transparent py-1 text-base text-fg outline-none focus-visible:border-accent"
              />
              <span className="flex">
                <button
                  type="button"
                  className="fact inline-flex h-7 w-7 items-center justify-center text-[1.15rem] leading-none hover:text-fg disabled:opacity-45"
                  aria-label={`Duplicate row ${index + 1}`}
                  title="Duplicate this row"
                  disabled={n >= MAX_ROWS}
                  onClick={() => duplicate(index)}
                >
                  +
                </button>
                <button type="button" className="fact inline-flex h-7 w-7 items-center justify-center text-[1.15rem] leading-none hover:text-fg" aria-label={`Delete row ${index + 1}`} title="Delete this row" onClick={() => remove(index)}>
                  ×
                </button>
              </span>
              <p className="fact col-start-2 col-end-4 mt-0.5 leading-snug">
                <span className="sr-only">{NAME[method]}: </span>
                {j !== null ? (
                  <>
                    <mark className="mr-2 px-1 font-mono text-[0.7rem]">{clock(LINES[j].t)}</mark>
                    <span>{LINES[j].text}</span>
                  </>
                ) : (
                  lineText(null, shown.times, index)
                )}
                {differs && (
                  <span>
                    {" "}
                    · {other === "greedy" ? "greedy" : "alignment"}: {jOther === null ? "no line" : `${clock(LINES[jOther].t)}, line ${jOther + 1}`}
                  </span>
                )}
              </p>
            </li>
          );
        })}
      </ol>

      <div role="group" aria-label="What the matrix cells show" className="mt-8 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="fact">Matrix cells</span>
        {(
          [
            ["path", "Traceback"],
            ["similarity", "Similarity"],
            ["value", "Value"],
          ] as [Cells, string][]
        ).map(([k, label]) => (
          <button key={k} type="button" className={quiet} aria-pressed={cells === k} onClick={() => setCells(k)}>
            {label}
          </button>
        ))}
      </div>
      <p className="fact mt-2">
        The score matrix the alignment fills in: row i against line j, the corner is where the traceback starts. It scrolls sideways on a narrow screen.
      </p>
      <div className="mt-2 overflow-x-auto" id={`${uid}-matrix`}>
        <table role="grid" aria-label="Score matrix: chart rows down, timed lines across" className="border-collapse font-mono text-[0.62rem] leading-none">
          <thead>
            <tr>
              <th scope="col" className="min-w-9 px-1 pb-1">
                <span className="sr-only">Rows against lines</span>
              </th>
              <th scope="col" className="min-w-10 px-0.5 pb-1 font-normal text-muted">
                start
              </th>
              {LINES.map((l, j) => (
                <th key={j} scope="col" className="min-w-10 px-0.5 pb-1 font-normal text-muted" title={l.text}>
                  <span className="block text-fg">L{j + 1}</span>
                  <span className="block pt-0.5">{clock(l.t)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: n + 1 }, (_, i) => (
              <tr key={i}>
                <th scope="row" className="pr-1.5 text-right font-normal text-muted" title={i > 0 ? rows[i - 1].text : "no rows taken"}>
                  <span className={i > 0 ? "text-fg" : ""}>{i === 0 ? "start" : `R${i}`}</span>
                </th>
                {Array.from({ length: m + 1 }, (_, j) => {
                  const key = `${i},${j}`;
                  const edge = i === 0 || j === 0;
                  const isMine = mine.has(key);
                  const isTheirs = !isMine && theirs.has(key);
                  const step = pathAt.get(key);
                  const sim = edge ? 0 : dp.similarity[i - 1][j - 1];
                  const active = cell.i === i && cell.j === j;
                  let text = "";
                  if (cells === "value") text = f(dp.value[i][j]);
                  else if (edge) text = "";
                  else if (cells === "similarity") text = sim > 0 ? f(sim) : "·";
                  else if (isMine || isTheirs) text = f(sim);
                  else if (method === "alignment" && step === 2) text = "↑";
                  else if (method === "alignment" && step === 3) text = "←";
                  else if (sim >= MIN_SIMILARITY) text = "·";
                  const tone = isMine ? "bg-hit text-ink font-semibold" : isTheirs ? "text-fg shadow-[inset_0_0_0_1.5px_var(--fg)]" : step ? "text-fg" : "text-muted";
                  const label = edge
                    ? `${i === 0 ? "No rows" : `Row ${i}`}, ${j === 0 ? "no lines" : `line ${j}`}: value ${f(dp.value[i][j])}`
                    : `Row ${i}, line ${j}: similarity ${f(sim)}, value ${f(dp.value[i][j])}${isMine ? `, a pair in the ${NAME[method].toLowerCase()}` : ""}${isTheirs ? `, a pair in the ${NAME[other].toLowerCase()}` : ""}${step === 2 && !isMine ? ", on the traceback: skip the row" : ""}${step === 3 && !isMine ? ", on the traceback: skip the line" : ""}`;
                  return (
                    <td
                      key={j}
                      id={cellId(i, j)}
                      role="gridcell"
                      tabIndex={active ? 0 : -1}
                      aria-selected={active}
                      aria-label={label}
                      onFocus={() => setSel({ i, j })}
                      onClick={() => setSel({ i, j })}
                      onKeyDown={(e) => onGridKey(e, i, j)}
                      className={`h-7 min-w-10 border border-border px-0.5 text-center align-middle outline-none aria-selected:outline-2 aria-selected:-outline-offset-2 aria-selected:outline-accent ${edge ? "bg-surface" : ""} ${tone}`}
                    >
                      {text}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Readout cmp={cmp} rows={texts} i={cell.i} j={cell.j} />

      <details className="mt-4">
        <summary className="fact cursor-pointer">The twelve timed lines</summary>
        <ol className="mt-2 grid gap-x-8 sm:grid-cols-2">
          {LINES.map((l, j) => (
            <li key={j} className="fact flex gap-3 border-b border-border py-1">
              <span className="w-12 shrink-0 font-mono text-[0.7rem]">
                L{j + 1} {clock(l.t)}
              </span>
              <span>{l.text}</span>
            </li>
          ))}
        </ol>
      </details>

      <figcaption className="fact mt-4 leading-snug">
        The alignment is a TypeScript port of Chordist&apos;s <code className="font-mono text-[0.7rem]">align.py</code>, checked in the tests against its output on 43 cases. The greedy scan is the widget&apos;s first matcher, ported
        from the repo&apos;s first commit, where it already ignores one-word rows. The version that dragged every row after a one-word row is not in the history, so it is not here, and the failure it opens on is one I found by
        running it, not one the repo recorded. Yellow cells are the selected method&apos;s pairs, outlined cells the other&apos;s. The lyrics are public domain (Newton, 1779). The first four timestamps are the repo&apos;s test
        fixture; the rest and the 90 s length are invented, and the chart has no chords. A real chart is scraped and messier. Agreement is the alignment&apos;s own score applied to each method&apos;s pairs.
      </figcaption>
    </figure>
  );
}

/** The arithmetic of one cell, from the same matrices the table above is drawn from. */
function Readout({ cmp, rows, i, j }: { cmp: Comparison; rows: string[]; i: number; j: number }) {
  const dp = cmp.alignment;
  const head = i === 0 || j === 0 ? "Edge of the matrix" : `Row ${i} against line ${j}`;
  let body: React.ReactNode;
  if (i === 0 || j === 0) {
    body = <>With no rows or no lines taken there is nothing to pair, so the value is 0.</>;
  } else {
    const sim = dp.similarity[i - 1][j - 1];
    const sub = dp.substitution[i - 1][j - 1];
    const pair = dp.value[i - 1][j - 1] + sub;
    const skipRow = dp.value[i - 1][j];
    const skipLine = dp.value[i][j - 1];
    const step = dp.step[i][j];
    body = (
      <>
        <span className="block">&ldquo;{rows[i - 1]}&rdquo;</span>
        <span className="block">&ldquo;{LINES[j - 1].text}&rdquo;</span>
        <span className="block mt-1">
          Similarity {f(sim)}
          {sub > 0 ? `, so a pair is worth ${f(sim)} - ${MIN_SIMILARITY} = ${f(sub)}.` : sim > 0 ? `, under ${MIN_SIMILARITY}, so a pair is worth 0.` : ", so a pair is worth 0."} Pair {f(pair)} (taken only when it is worth something and not beaten), skip the row{" "}
          {f(skipRow)}, skip the line {f(skipLine)}. The cell takes {step === 1 ? "the pair" : step === 2 ? "skip the row" : "skip the line"}: value {f(dp.value[i][j])}.
        </span>
      </>
    );
  }
  return (
    <div role="group" aria-label="Selected matrix cell" className="mt-3 border-t border-border pt-2 fact leading-snug">
      <span className="font-semibold text-fg">{head}. </span>
      {body}
    </div>
  );
}
