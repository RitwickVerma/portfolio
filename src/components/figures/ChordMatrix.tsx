"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { MIN_SIMILARITY, type Comparison } from "@/lib/chordAlign";
import { GRACE_LINES as LINES, clock } from "@/lib/chordAlignFixture";
import { Segmented } from "./kit";

// The table of scores behind the alignment, in a Fold: chart rows down, timed lines across. The
// alignment's traceback is drawn as a connected ribbon of cells; the readout beside it shows the
// three numbers one cell compares.

type Method = "alignment" | "greedy";
type Cells = "path" | "similarity" | "value";

const NAME: Record<Method, string> = { alignment: "Alignment", greedy: "Greedy scan" };
const f = (x: number) => x.toFixed(2);

export default function ChordMatrix({ cmp, rows }: { cmp: Comparison; rows: string[] }) {
  const uid = useId();
  const [method, setMethod] = useState<Method>("alignment");
  const [cells, setCells] = useState<Cells>("path");
  const [sel, setSel] = useState<{ i: number; j: number } | null>(null);
  const n = rows.length;
  const m = LINES.length;
  const dp = cmp.alignment;
  const other: Method = method === "alignment" ? "greedy" : "alignment";
  // The selected cell defaults to where the traceback starts, and is clamped when rows go away.
  const cell = { i: Math.min(sel?.i ?? n, n), j: Math.min(sel?.j ?? m, m) };
  const cellId = (i: number, j: number) => `${uid}-c-${i}-${j}`;

  const pathAt = new Map(dp.path.map((p) => [`${p.i},${p.j}`, p.step]));
  const dpPairs = new Set(dp.path.filter((p) => p.step === 1).map((p) => `${p.i},${p.j}`));
  const greedyPairs = new Set(cmp.greedy.picks.map((p) => `${p.row + 1},${p.line + 1}`));
  const mine = method === "alignment" ? dpPairs : greedyPairs;
  const theirs = method === "alignment" ? greedyPairs : dpPairs;

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

  return (
    <div className="space-y-4">
      <p className="fact max-w-[62ch]">
        Chart rows run down, timed lyric lines across. Each cell holds the best total score for the first i rows against the first j lines; the alignment reads its answer by walking back from the bottom right corner.
      </p>
      <Segmented<Method>
        label="Pairs from"
        options={[
          { id: "alignment", label: "Alignment" },
          { id: "greedy", label: "Greedy scan" },
        ]}
        value={method}
        onChange={setMethod}
      />
      <Segmented<Cells>
        label="Cells show"
        options={[
          { id: "path", label: "Traceback" },
          { id: "similarity", label: "Similarity" },
          { id: "value", label: "Value" },
        ]}
        value={cells}
        onChange={setCells}
      />

      <ul aria-label="What the colours mean" className="flex flex-wrap gap-x-5 gap-y-1.5 text-[0.8rem] leading-tight text-fg">
        <Key swatch={<span className="inline-block h-4 w-6 rounded-[2px] bg-hit" />}>A pair the {NAME[method].toLowerCase()} chose</Key>
        <Key swatch={<span className="inline-block h-4 w-6 rounded-[2px] shadow-[inset_0_0_0_2px_var(--fg)]" />}>A pair the {NAME[other].toLowerCase()} chose</Key>
        {method === "alignment" && (
          <>
            <Key swatch={<span className="inline-block h-4 w-6 rounded-[2px] bg-hit/60 text-center font-mono text-xs leading-4">←</span>}>A skip: a line (←) or a row (↑) left out</Key>
            <Key swatch={<span className="inline-block h-2 w-2 rounded-full bg-fg" />}>Joins the steps of the path, read from the bottom right corner back</Key>
          </>
        )}
        {cells === "path" && <Key swatch={<span className="w-6 text-center font-mono">·</span>}>Similar enough to pair, not used</Key>}
        <Key swatch={<span className="inline-block h-4 w-6 rounded-[2px] shadow-[inset_0_0_0_3px_var(--fg)]" />}>The selected cell, broken down in the three numbers</Key>
      </ul>

      <p className="fact">The table scrolls sideways when it does not fit. Tap a cell to see its three numbers.</p>
      <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
        <div className="max-w-full overflow-x-auto" id={`${uid}-matrix`}>
          <table role="grid" aria-label="Score matrix: chart rows down, timed lines across" className="border-separate border-spacing-0 font-mono text-xs leading-none">
            <thead>
              <tr>
                <th scope="col" className="min-w-11 px-1 pb-1">
                  <span className="sr-only">Rows against lines</span>
                </th>
                <th scope="col" className="min-w-11 px-0.5 pb-1 font-normal text-muted">
                  start
                </th>
                {LINES.map((l, j) => (
                  <th key={j} scope="col" className="min-w-11 px-0.5 pb-1 font-normal text-muted" title={l.text}>
                    <span className="block text-fg">L{j + 1}</span>
                    <span className="block pt-0.5">{clock(l.t)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: n + 1 }, (_, i) => (
                <tr key={i}>
                  <th scope="row" className="pr-1.5 text-right font-normal text-muted" title={i > 0 ? rows[i - 1] : "no rows taken"}>
                    <span className={i > 0 ? "text-fg" : ""}>{i === 0 ? "start" : `R${i}`}</span>
                  </th>
                  {Array.from({ length: m + 1 }, (_, j) => {
                    const key = `${i},${j}`;
                    const edge = i === 0 || j === 0;
                    const isMine = mine.has(key);
                    const isTheirs = !isMine && theirs.has(key);
                    const step = method === "alignment" ? pathAt.get(key) : undefined;
                    const sim = edge ? 0 : dp.similarity[i - 1][j - 1];
                    const active = cell.i === i && cell.j === j;
                    let text = "";
                    if (cells === "value") text = f(dp.value[i][j]);
                    else if (edge) text = "";
                    else if (cells === "similarity") text = sim > 0 ? f(sim) : "·";
                    else if (isMine || isTheirs) text = f(sim);
                    else if (step === 2) text = "↑";
                    else if (step === 3) text = "←";
                    else if (sim >= MIN_SIMILARITY) text = "·";
                    const tone = isMine
                      ? "bg-hit text-ink font-semibold"
                      : isTheirs
                        ? "text-fg shadow-[inset_0_0_0_2px_var(--fg)]"
                        : step
                          ? "bg-hit/60 font-semibold text-fg"
                          : edge
                            ? "bg-surface text-muted"
                            : "text-muted";
                    const joint = method === "alignment" && step === 1;
                    const gridLine = step || isMine ? "" : "border-b border-r border-border";
                    const label = edge
                      ? `${i === 0 ? "No rows" : `Row ${i}`}, ${j === 0 ? "no lines" : `line ${j}`}: value ${f(dp.value[i][j])}`
                      : `Row ${i}, line ${j}: similarity ${f(sim)}, value ${f(dp.value[i][j])}${isMine ? `, a pair in the ${NAME[method].toLowerCase()}` : ""}${isTheirs ? `, a pair in the ${NAME[other].toLowerCase()}` : ""}${step === 2 ? ", on the traceback: skip the row" : ""}${step === 3 ? ", on the traceback: skip the line" : ""}`;
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
                        className={`relative h-8 min-w-11 cursor-pointer px-0.5 text-center align-middle outline-none aria-selected:z-10 aria-selected:outline-solid aria-selected:outline-[3px] aria-selected:-outline-offset-3 aria-selected:outline-fg ${gridLine} ${tone}`}
                      >
                        {joint && <span aria-hidden="true" className="absolute -left-[5px] -top-[5px] z-10 h-2.5 w-2.5 rounded-full bg-fg ring-2 ring-background" />}
                        {text}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Readout cmp={cmp} rows={rows} i={cell.i} j={cell.j} />
      </div>

      <p className="fact max-w-[62ch]">
        Agreement, the alignment&rsquo;s own score applied to each method&rsquo;s pairs: alignment {f(cmp.alignmentRun.agreement)}, greedy scan {f(cmp.greedyRun.agreement)}.
      </p>
    </div>
  );
}

function Key({ swatch, children }: { swatch: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden="true" className="shrink-0">
        {swatch}
      </span>
      <span>{children}</span>
    </li>
  );
}

/** One cell's decision as three comparable numbers, from the same matrices the table is drawn from. */
function Readout({ cmp, rows, i, j }: { cmp: Comparison; rows: string[]; i: number; j: number }) {
  const dp = cmp.alignment;
  const edge = i === 0 || j === 0;
  let body: ReactNode;
  if (edge) {
    body = <p className="fact">With no rows or no lines taken there is nothing to pair: value 0.00.</p>;
  } else {
    const sim = dp.similarity[i - 1][j - 1];
    const sub = dp.substitution[i - 1][j - 1];
    const choices = [
      { id: 1, label: "Pair", n: dp.value[i - 1][j - 1] + sub, note: `${f(dp.value[i - 1][j - 1])} + ${f(sub)}`, note2: `similarity ${f(sim)} − ${MIN_SIMILARITY}` },
      { id: 2, label: "Skip row", n: dp.value[i - 1][j], note: "the cell above", note2: `row ${i} left out` },
      { id: 3, label: "Skip line", n: dp.value[i][j - 1], note: "the cell to the left", note2: `line ${j} left out` },
    ];
    const step = dp.step[i][j];
    body = (
      <>
        <p className="fact leading-snug">
          Chart: &ldquo;{rows[i - 1]}&rdquo;
          <br />
          Lyric: &ldquo;{LINES[j - 1].text}&rdquo;
        </p>
        <ul className="mt-2 grid grid-cols-3 gap-1.5">
          {choices.map((c) => (
            <li key={c.id} data-taken={step === c.id} className="rounded-[var(--r-chip)] border border-border px-2 py-1.5 data-[taken=true]:border-2 data-[taken=true]:border-fg data-[taken=true]:bg-hit data-[taken=true]:text-ink">
              <span className="block text-xs">{c.label}</span>
              <span className="wd-semi block text-lg font-bold tabular-nums leading-tight">{f(c.n)}</span>
              <span className="block text-xs leading-tight">{c.note}</span>
              <span className="block text-xs leading-tight opacity-80">{c.note2}</span>
              {step === c.id && <span className="block pt-0.5 text-xs font-semibold">taken</span>}
            </li>
          ))}
        </ul>
        <p className="fact mt-1.5">
          Cell value (the best of the three): <span className="font-semibold text-fg tabular-nums">{f(dp.value[i][j])}</span>
        </p>
      </>
    );
  }
  return (
    <div role="group" aria-label="Selected matrix cell" className="w-full max-w-[22rem] min-w-[min(100%,16rem)] flex-1 basis-64 border-t border-border pt-2">
      <p className="wd-semi text-base font-bold">{edge ? "Edge of the table" : `Row ${i} against line ${j}`}</p>
      {body}
    </div>
  );
}
