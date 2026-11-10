import { clock } from "@/lib/chordAlignFixture";
import type { Comparison } from "@/lib/chordAlign";

// The one sentence under the chord figure's drawing, computed from the two runs. Pure, so a test can
// pin the wording to the numbers. Tone is `warn` only when the greedy scan did worse than the
// alignment (fewer rows placed, or a last row earlier than the alignment's).

export interface ChordVerdict {
  tone: "ok" | "warn" | "plain";
  title: string;
  /** Row numbers (1-based) the greedy scan lost while the alignment placed them. */
  lost: number[];
  /** Row numbers where the two methods gave different lines (including a row only one of them placed). */
  differing: number[];
  /** Row numbers the greedy scan placed, but on a different line from the alignment. */
  wrong: number[];
}

const plural = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;

/** "6 to 11", "6 and 9", "6, 7 and 9 to 11": row numbers as runs. */
export function rowRanges(rows: number[]): string {
  const parts: string[] = [];
  let k = 0;
  while (k < rows.length) {
    let e = k;
    while (e + 1 < rows.length && rows[e + 1] === rows[e] + 1) e++;
    parts.push(e - k >= 2 ? `${rows[k]} to ${rows[e]}` : rows.slice(k, e + 1).join(", "));
    k = e + 1;
  }
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : (parts[0] ?? "");
}

export function chordVerdict(cmp: Comparison, n: number): ChordVerdict {
  const a = cmp.alignmentRun;
  const g = cmp.greedyRun;
  const lost: number[] = [];
  const differing: number[] = [];
  const wrong: number[] = [];
  for (let r = 0; r < n; r++) {
    if (a.match[r] !== g.match[r]) differing.push(r + 1);
    if (g.match[r] === null && a.match[r] !== null) lost.push(r + 1);
    if (g.match[r] !== null && a.match[r] !== g.match[r]) wrong.push(r + 1);
  }
  if (n === 0) return { tone: "plain", title: "There are no rows to place.", lost, differing, wrong };
  if (a.placed === 0 && g.placed === 0) return { tone: "plain", title: `Neither method finds a line for any of the ${n} rows.`, lost, differing, wrong };
  if (differing.length === 0) {
    const title = a.placed === n ? `Both methods give all ${n} rows the same lines.` : `Both methods agree: ${a.placed} of ${n} rows get a line, the rest get none.`;
    return { tone: "ok", title, lost, differing, wrong };
  }
  const head = `Alignment places ${a.placed} of ${n} rows; the greedy scan places ${g.placed}`;
  let tail = "";
  let worse = g.placed < a.placed;
  if (g.times && a.times) {
    const gap = Math.round(a.times[n - 1]) - Math.round(g.times[n - 1]);
    if (gap > 0) {
      tail = ` and ends ${plural(gap, "second", "seconds")} early (last row at ${clock(g.times[n - 1])}, not ${clock(a.times[n - 1])})`;
      worse = true;
    } else if (gap < 0) tail = ` and ends ${plural(-gap, "second", "seconds")} late`;
  } else if (!g.times) tail = ", so it has no time for any row";
  if (tail === "" && g.placed === a.placed) tail = `, but gives ${plural(differing.length, "row", "rows")} a different line`;
  return { tone: worse ? "warn" : "plain", title: `${head}${tail}.`, lost, differing, wrong };
}
