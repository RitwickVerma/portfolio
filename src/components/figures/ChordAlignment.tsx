"use client";

import { Fragment, useId, useMemo, useRef, useState, useEffect } from "react";
import { compare, type Comparison } from "@/lib/chordAlign";
import { GRACE_DURATION, GRACE_LINES, GRACE_ROWS, clock } from "@/lib/chordAlignFixture";
import { chordVerdict, rowRanges } from "./chordVerdict";
import ChordMatrix from "./ChordMatrix";
import { FigureFrame, Fold, Presets, Verdict } from "./kit";

// Chordist lines a chord chart up with the timed lyrics of the recording. This figure runs that
// alignment, the real one ported from chordist/align.py, on a chart you can edit, beside the greedy
// scan the widget used before, for the same rows. Every number on it is recomputed from the rows as
// they stand, the score matrix included.
//
// What it is not: the real thing reads a scraped chart and the timed lines of whatever song is
// playing. Here the song is fixed ("Amazing Grace", public domain) and so are its lines.

type Kind = "missing" | "full" | "repeat" | "one";
interface Row {
  id: number;
  text: string;
}

const LINES = GRACE_LINES;
const PRESETS: readonly { id: Kind; label: string }[] = [
  { id: "missing", label: "A line missing" },
  { id: "full", label: "Full chart" },
  { id: "repeat", label: "Last verse twice" },
  { id: "one", label: "A one-word row" },
];
const fullChart = (): Row[] => GRACE_ROWS.map((text, id) => ({ id, text }));
/** What the figure opens on: the chart with 'Twas grace that taught my heart to fear (row 5) left out. */
const MISSING = 4;
const openingChart = (): Row[] => fullChart().filter((_, k) => k !== MISSING);
const MAX_ROWS = 24;

const small =
  "inline-flex items-center justify-center min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 px-2 rounded-[var(--r-chip)] border border-fg/40 text-base leading-none hover:border-fg disabled:opacity-45 disabled:hover:border-fg/40";

export default function ChordAlignment() {
  const uid = useId();
  const [rows, setRows] = useState<Row[]>(openingChart);
  const [active, setActive] = useState<Kind | null>("missing");
  const nextId = useRef(GRACE_ROWS.length);
  const pendingFocus = useRef<string | null>(null);

  const texts = useMemo(() => rows.map((r) => r.text), [rows]);
  const cmp: Comparison = useMemo(() => compare(texts, LINES, GRACE_DURATION), [texts]);
  const n = rows.length;
  const a = cmp.alignmentRun;
  const g = cmp.greedyRun;
  const verdict = chordVerdict(cmp, n);
  // Lyric lines the alignment gave no row, between two rows it did place: the gap the chart left.
  const gaps = useMemo(() => {
    const placed = cmp.alignmentRun.match;
    const used = new Set(placed.filter((j): j is number => j !== null));
    const first = Math.min(...used);
    const last = Math.max(...used);
    const after = new Map<number, number[]>();
    for (let j = first + 1; j < last; j++) {
      if (used.has(j)) continue;
      let prev = -1;
      placed.forEach((pj, r) => {
        if (pj !== null && pj < j) prev = r;
      });
      after.set(prev, [...(after.get(prev) ?? []), j]);
    }
    return used.size === 0 ? new Map<number, number[]>() : after;
  }, [cmp]);

  useEffect(() => {
    if (pendingFocus.current) {
      document.getElementById(pendingFocus.current)?.focus();
      pendingFocus.current = null;
    }
  });

  const rowInput = (id: number) => `${uid}-row-${id}`;

  function commit(next: Row[], focusId?: number) {
    setRows(next);
    setActive(null);
    if (focusId !== undefined) pendingFocus.current = rowInput(focusId);
  }

  function duplicate(index: number) {
    if (n >= MAX_ROWS) return;
    const copy = { id: nextId.current++, text: rows[index].text };
    commit([...rows.slice(0, index + 1), copy, ...rows.slice(index + 1)], copy.id);
  }

  function remove(index: number) {
    const next = rows.filter((_, k) => k !== index);
    commit(next, next[Math.min(index, next.length - 1)]?.id);
  }

  function preset(kind: Kind) {
    nextId.current = GRACE_ROWS.length;
    if (kind === "full") setRows(fullChart());
    else if (kind === "missing") setRows(openingChart());
    else if (kind === "repeat") {
      const again = GRACE_ROWS.slice(8).map((text) => ({ id: nextId.current++, text }));
      setRows([...fullChart(), ...again]);
    } else setRows(fullChart().map((r) => (r.id === 3 ? { ...r, text: "amen" } : r)));
    setActive(kind);
  }

  return (
    <FigureFrame
      claim="Leave one row out and the greedy matcher loses the rest of the song"
      how={
        <>
          Chordist needs a time for every row of a chord chart. Press &ldquo;Full chart&rdquo; to put the missing row back, &ldquo;A line missing&rdquo; to take it out.
        </>
      }
      caption="This is the real alignment and the widget's first matcher ported to TypeScript, run on one fixed public-domain song with mostly invented timestamps; Chordist itself reads a scraped chart and whatever is playing."
      about={
        <>
          <p>
            The alignment is a TypeScript port of Chordist&apos;s <code className="font-mono text-[0.8rem]">align.py</code>, checked in the tests against its output on 43 cases. The greedy scan is the widget&apos;s first matcher, ported from the
            repo&apos;s first commit, where it already ignores one-word rows. The version that dragged every row after a one-word row is not in the history, so it is not here, and the failure the figure opens on is one I found by running it, not
            one the repo recorded.
          </p>
          <p>
            The lyrics are public domain (Newton, 1779). The first four timestamps are the repo&apos;s test fixture; the rest and the 90 s length are invented, and the chart has no chords. A real chart is scraped and messier. Agreement, in the
            table of scores, is the alignment&apos;s own score applied to each method&apos;s pairs.
          </p>
        </>
      }
    >
      <Presets<Kind> label="Try" items={PRESETS} active={active} onPick={preset} />

      <div>
        <p className="fact mb-2 max-w-[62ch]">
          Times are minutes:seconds into the song. Alignment: the best fit for the whole song. Greedy scan: the first good match, never going back.
        </p>
        <table className="w-full max-w-2xl table-fixed border-collapse text-left">
          <caption className="sr-only">Each chart row with the time each method gives it. A row marked lost found no line.</caption>
          <colgroup>
            <col className="w-16 sm:w-28" />
            <col />
            <col className="w-16 sm:w-28" />
          </colgroup>
          <thead>
            <tr className="align-bottom text-[0.8rem] leading-tight sm:text-sm">
              <th scope="col" className="pb-1.5 pr-1 text-center font-semibold text-fg">
                Alignment
                <span className="fact block font-normal tabular-nums">
                  {a.placed} of {n}
                </span>
              </th>
              <th scope="col" className="px-2 pb-1.5 font-normal text-muted">
                Chart row
              </th>
              <th scope="col" className="pb-1.5 pl-1 text-center font-semibold text-fg">
                Greedy scan
                <span className="fact block font-normal tabular-nums">
                  {g.placed} of {n}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {n === 0 && (
              <tr>
                <td colSpan={3} className="border-t-2 border-fg py-3 fact">
                  No chart rows, so there is nothing to align.
                </td>
              </tr>
            )}
            {rows.map((row, index) => {
              const ja = a.match[index];
              const jg = g.match[index];
              const differs = ja !== jg;
              const first = index === 0 ? "border-t-2 border-fg" : "border-t border-border";
              return (
                <Fragment key={row.id}>
                <tr className="align-middle">
                  <td className={`${first} px-1 py-1.5 text-center tabular-nums`}>
                    {ja !== null ? (
                      <span className="text-base font-semibold">{clock(LINES[ja].t)}</span>
                    ) : jg !== null ? (
                      <span className="text-sm text-muted">
                        none<span className="sr-only">: the alignment gives this row no line</span>
                      </span>
                    ) : (
                      <span className="text-sm text-muted">
                        none<span className="sr-only">: neither method finds a line</span>
                      </span>
                    )}
                  </td>
                  <th scope="row" className={`${first} px-2 py-1.5 text-left text-base font-normal leading-snug`}>
                    <span className="fact mr-1.5 tabular-nums">{index + 1}</span>
                    {row.text.trim() === "" ? <span className="text-muted">(empty row)</span> : row.text}
                  </th>
                  <td className={`${first} px-1 py-1.5 text-center tabular-nums`}>
                    {jg !== null ? (
                      <span className={`text-base ${differs ? "font-semibold text-warn" : "font-semibold"}`}>
                        {differs && <span aria-hidden="true">✗ </span>}
                        {clock(LINES[jg].t)}
                        {differs && <span className="sr-only">, not the alignment&rsquo;s {ja !== null ? clock(LINES[ja].t) : "no line"}</span>}
                      </span>
                    ) : ja !== null ? (
                      <span className="text-base font-bold text-warn">
                        lost<span className="sr-only">: the greedy scan finds no line for this row</span>
                      </span>
                    ) : (
                      <span className="text-sm text-muted">none</span>
                    )}
                  </td>
                </tr>
                {(gaps.get(index) ?? []).map((j) => (
                  <tr key={`gap-${j}`} className="align-middle">
                    <td className="border-t border-dashed border-border px-1 py-1 text-center text-sm tabular-nums text-fg">{clock(LINES[j].t)}</td>
                    <th scope="row" className="border-t border-dashed border-border px-2 py-1 text-left text-sm font-normal italic leading-snug text-fg">
                      No chart row for this lyric: &ldquo;{LINES[j].text}&rdquo;
                    </th>
                    <td className="border-t border-dashed border-border" />
                  </tr>
                ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <Verdict tone={verdict.tone} title={verdict.title}>
        {verdict.lost.length > 0 || verdict.wrong.length > 0 ? (
          <>
            {verdict.lost.length > 0 ? <>The greedy scan lost {verdict.lost.length === 1 ? "row" : "rows"} {rowRanges(verdict.lost)}: no line found. </> : null}
            {verdict.wrong.length > 0 ? <>It put {verdict.wrong.length === 1 ? "row" : "rows"} {rowRanges(verdict.wrong)} on a different line from the alignment (marked ✗).</> : null}
          </>
        ) : null}
      </Verdict>

      <div className="space-y-1">
        <Fold summary="Edit the chart">
          <p className="fact mb-2 max-w-[62ch]">Change a row&rsquo;s words, copy it or delete it, and both columns above update.</p>
          <ol className="max-w-xl">
            {rows.map((row, index) => (
              <li key={row.id} className="flex items-center gap-1.5 border-b border-border py-1">
                <span className="fact w-6 shrink-0 text-right tabular-nums" aria-hidden="true">
                  {index + 1}
                </span>
                <input
                  id={rowInput(row.id)}
                  type="text"
                  value={row.text}
                  aria-label={`Chart row ${index + 1}`}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => {
                    setRows(rows.map((r) => (r.id === row.id ? { ...r, text: e.target.value } : r)));
                    setActive(null);
                  }}
                  className="min-h-11 w-full min-w-0 flex-1 border-b border-border bg-transparent px-1 text-base text-fg outline-none focus-visible:border-accent sm:min-h-9"
                />
                <button type="button" className={small} aria-label={`Copy row ${index + 1}`} title="Copy this row" disabled={n >= MAX_ROWS} onClick={() => duplicate(index)}>
                  <span aria-hidden="true" className="text-xl">
                    +
                  </span>
                  <span aria-hidden="true" className="ml-1.5 hidden text-[0.95rem] sm:inline">
                    Copy
                  </span>
                </button>
                <button type="button" className={small} aria-label={`Delete row ${index + 1}`} title="Delete this row" onClick={() => remove(index)}>
                  <span aria-hidden="true" className="text-xl">
                    ×
                  </span>
                  <span aria-hidden="true" className="ml-1.5 hidden text-[0.95rem] sm:inline">
                    Delete
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </Fold>

        <Fold summary="The table of scores">
          <ChordMatrix cmp={cmp} rows={texts} />
        </Fold>

        <Fold summary="The twelve timed lines">
          <ol className="grid gap-x-8 sm:grid-cols-2">
            {LINES.map((l, j) => (
              <li key={j} className="fact flex gap-3 border-b border-border py-1">
                <span className="w-16 shrink-0 font-mono text-xs">
                  L{j + 1} {clock(l.t)}
                </span>
                <span>{l.text}</span>
              </li>
            ))}
          </ol>
        </Fold>
      </div>
    </FigureFrame>
  );
}
