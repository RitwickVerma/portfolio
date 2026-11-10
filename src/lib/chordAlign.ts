// Chordist's row-to-line alignment, ported from chordist/align.py (gitlab.com/ritwick7/chordist,
// commit cf4f358), and the greedy scan it replaced, ported from applet/contents/ui/ChordsView.qml
// as it stood in the repo's first commit (52db806).
//
// The job: a chord chart is a list of text rows, a recording has a list of timed lyric lines, and
// the two never agree line for line. Needleman-Wunsch over (row x line) finds the one best
// monotonic pairing, so a weak row cannot drag the rows after it out of place.
//
// Pure functions, no dependencies. Every function here is the original's, line for line, except:
//   - arguments are arrays, not the service's chart and lyrics dicts;
//   - `alignDetail` also returns the matrices and the traceback path the original computes and
//     throws away, so a figure can draw them; `align` is `alignDetail(...).match`;
//   - `tokens` strips combining marks with \p{M} where Python uses unicodedata.combining, and
//     splits words on letters and digits. Identical on Latin text; not checked on Devanagari.

/** Below this the two lines do not look like the same words at all; a free gap beats pairing them. */
export const MIN_SIMILARITY = 0.5;

const WORD = new RegExp("[\\p{L}\\p{N}]+", "gu");
const COMBINING = new RegExp("\\p{M}", "gu");

/** titles.tokens: casefold, drop diacritics, split into words. */
export function tokens(text: string): string[] {
  return (text || "").normalize("NFKD").replace(COMBINING, "").toLowerCase().match(WORD) ?? [];
}

/** Levenshtein distance, capped: only 0, 1 and "more than 1" are ever needed. */
export function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 1) return 2;
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current.push(Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] !== b[j - 1] ? 1 : 0)));
    }
    previous = current;
  }
  return previous[previous.length - 1];
}

/** The same word despite spelling drift: equal, one a prefix of the other (3+ letters), or one edit apart. */
export function tokenMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length >= 3 && b.length >= 3 && (a.startsWith(b) || b.startsWith(a))) return true;
  return editDistance(a, b) <= 1;
}

/** `_similarity`: how much two word lists look like the same words, 0..1. */
export function similarityWords(rowWords: string[], lineWords: string[]): number {
  if (rowWords.length === 0 || lineWords.length === 0) return 0;
  // A one-word row ("haan", an instrumental "x4") matches half the song, so it may never anchor a line.
  if (rowWords.length < 2) return 0;
  const joinedRow = rowWords.join(" ");
  const joinedLine = lineWords.join(" ");
  if (joinedLine.includes(joinedRow) || joinedRow.includes(joinedLine)) return 1;
  let hits = 0;
  for (const word of rowWords) {
    if (word.length < 2) continue;
    if (lineWords.some((other) => tokenMatch(word, other))) hits++;
  }
  if (hits < 2) return 0;
  return hits / Math.min(rowWords.length, lineWords.length);
}

/** How much a chart row and a lyric line look like the same words, 0..1. */
export function similarity(row: string, line: string): number {
  return similarityWords(tokens(row), tokens(line));
}

/** 0 = border cell, 1 = diagonal (a real pair), 2 = skip a row, 3 = skip a line. */
export type Step = 0 | 1 | 2 | 3;

export interface PathCell {
  /** Matrix coordinates: i counts rows taken so far, j counts lines. Cell (i, j) is row i-1 against line j-1. */
  i: number;
  j: number;
  step: Step;
}

export interface Alignment {
  /** Raw word-overlap similarity of row i and line j, n x m. */
  similarity: number[][];
  /** What a pair is worth: similarity minus MIN_SIMILARITY when it clears it, else 0. n x m. */
  substitution: number[][];
  /** Best total agreement for the first i rows and first j lines, (n+1) x (m+1). */
  value: number[][];
  /** Which move produced each value cell, (n+1) x (m+1). */
  step: Step[][];
  /** For each row, the index of the line it matched, or null. */
  match: (number | null)[];
  /** The traceback, from the bottom right corner up and left until it leaves the matrix. */
  path: PathCell[];
}

/** Needleman-Wunsch over (row x line) with gaps free: the single best monotonic pairing. */
export function alignDetail(rows: string[], lines: string[]): Alignment {
  const n = rows.length;
  const m = lines.length;
  const rowWords = rows.map(tokens);
  const lineWords = lines.map(tokens);
  const sim: number[][] = [];
  const substitution: number[][] = [];
  for (let i = 0; i < n; i++) {
    sim.push([]);
    substitution.push([]);
    for (let j = 0; j < m; j++) {
      const score = similarityWords(rowWords[i], lineWords[j]);
      sim[i].push(score);
      substitution[i].push(score >= MIN_SIMILARITY ? score - MIN_SIMILARITY : 0);
    }
  }

  const value: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  const step: Step[][] = Array.from({ length: n + 1 }, () => new Array<Step>(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const pair = value[i - 1][j - 1] + substitution[i - 1][j - 1];
      const skipRow = value[i - 1][j];
      const skipLine = value[i][j - 1];
      if (substitution[i - 1][j - 1] > 0 && pair >= skipRow && pair >= skipLine) {
        value[i][j] = pair;
        step[i][j] = 1;
      } else if (skipRow >= skipLine) {
        value[i][j] = skipRow;
        step[i][j] = 2;
      } else {
        value[i][j] = skipLine;
        step[i][j] = 3;
      }
    }
  }

  const match: (number | null)[] = new Array<number | null>(n).fill(null);
  const path: PathCell[] = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    const direction = step[i][j];
    path.push({ i, j, step: direction });
    if (direction === 1) {
      match[i - 1] = j - 1;
      i--;
      j--;
    } else if (direction === 2) i--;
    else j--;
  }
  return { similarity: sim, substitution, value, step, match, path };
}

/** Pair chart rows with lyric lines, monotonically, for best total agreement. */
export function align(rows: string[], lines: string[]): (number | null)[] {
  return alignDetail(rows, lines).match;
}

export interface TimedLine {
  t: number;
  text: string;
}

/**
 * One time per row, from a pairing: a matched row takes its line's time, the rows between two
 * matched rows share the time between them evenly, and the rows before the first and after the
 * last share out the time to the start and to `duration`. Null when nothing matched.
 */
export function timesFromMatch(match: (number | null)[], lines: TimedLine[], duration = 0): number[] | null {
  const times: (number | null)[] = match.map((line) => (line === null ? null : lines[line].t));
  const known = times.flatMap((value, index) => (value === null ? [] : [index]));
  if (known.length === 0) return null;
  const first = known[0];
  const last = known[known.length - 1];
  let previous = first;
  for (const index of known.slice(1)) {
    const span = index - previous;
    for (let offset = 1; offset < span; offset++) {
      times[previous + offset] = (times[previous] as number) + (((times[index] as number) - (times[previous] as number)) * offset) / span;
    }
    previous = index;
  }
  const lastTime = times[last] as number;
  const firstTime = times[first] as number;
  const end = Math.max(duration || 0, lastTime);
  for (let index = 0; index < first; index++) times[index] = (firstTime * (index + 1)) / (first + 1);
  const tail = match.length - 1 - last;
  for (let index = last + 1; index < match.length; index++) times[index] = lastTime + ((end - lastTime) * (index - last)) / (tail + 1);
  return times as number[];
}

/** row_times: align, then give every row a time. Null when there is nothing to align or nothing matched. */
export function rowTimes(rows: string[], lines: TimedLine[], duration = 0): number[] | null {
  if (rows.length === 0 || lines.length === 0) return null;
  return timesFromMatch(align(rows, lines.map((l) => l.text)), lines, duration);
}

// ---------------------------------------------------------------------------------------------
// The greedy scan: ChordsView.qml `scoreLine` and `buildSchedule` at 52db806, the widget's own
// matcher before the service aligned. It walks the recorded lines in order and, for each, takes
// the best-scoring row at or after a cursor (stopping early at a near-exact score), then moves
// the cursor past that row. It has the same one-word rule as the alignment. What it lacks is any
// way to take a pairing back: a row it anchors early moves the cursor and the rows it skipped
// stay unmatched.

/** Util.normalize in the QML: lowercase, anything but Latin letters, digits and Devanagari to a space. */
export function qmlNormalize(text: string): string {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u00c0-\u024f\u0900-\u097f ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** ChordsView.scoreLine: the same word-overlap score as `similarity`, on the QML's own tokenizer. */
export function greedyScore(rowText: string, activeText: string): number {
  const row = qmlNormalize(rowText);
  const active = activeText;
  if (!row || !active) return 0;
  const rowWords = row.split(" ");
  const activeWords = active.split(" ");
  if (rowWords.length < 2) return 0;
  if (row.includes(active) || active.includes(row)) return 1;
  let hits = 0;
  for (const word of rowWords) {
    if (word.length < 2) continue;
    if (activeWords.some((other) => tokenMatch(word, other))) hits++;
  }
  if (hits < 2) return 0;
  return hits / Math.min(rowWords.length, activeWords.length);
}

/** A pick the greedy scan accepted: lyric line `line` was given to chart row `row` at this score. */
export interface GreedyPick {
  line: number;
  row: number;
  score: number;
}

/** The scan's lines are skipped when shorter than this once normalised. */
export const GREEDY_MIN_LINE = 3;
/** And a pick is accepted only at or above this score. */
export const GREEDY_ACCEPT = 0.6;
/** The scan stops looking for a better row once one scores this well. */
export const GREEDY_STOP = 0.99;

export function greedyDetail(rows: string[], lines: string[]): { match: (number | null)[]; picks: GreedyPick[] } {
  const match: (number | null)[] = new Array<number | null>(rows.length).fill(null);
  const picks: GreedyPick[] = [];
  let cursor = 0;
  for (let n = 0; n < lines.length; n++) {
    const text = qmlNormalize(lines[n]);
    if (text.length < GREEDY_MIN_LINE) continue;
    let best = -1;
    let bestScore = 0;
    for (let j = cursor; j < rows.length; j++) {
      if (!rows[j]) continue;
      const score = greedyScore(rows[j], text);
      if (score > bestScore) {
        bestScore = score;
        best = j;
      }
      if (score >= GREEDY_STOP) break;
    }
    if (best >= 0 && bestScore >= GREEDY_ACCEPT) {
      if (match[best] === null) match[best] = n;
      picks.push({ line: n, row: best, score: bestScore });
      cursor = best + 1;
    }
  }
  return { match, picks };
}

/** For each row, the line the greedy scan gave it, or null. */
export function greedyAlign(rows: string[], lines: string[]): (number | null)[] {
  return greedyDetail(rows, lines).match;
}

// ---------------------------------------------------------------------------------------------
// Both matchers on one input, scored alike. Not in the original: the alignment maximises the sum
// of its pair values, so that sum is the fair yardstick for any pairing, greedy included.

export interface Run {
  match: (number | null)[];
  /** One time per row, or null when no row matched. */
  times: number[] | null;
  /** Rows given a line. */
  placed: number;
  /** Sum of the pair values (similarity minus MIN_SIMILARITY) over this pairing; the alignment's objective. */
  agreement: number;
}

export interface Comparison {
  alignment: Alignment;
  alignmentRun: Run;
  greedy: { match: (number | null)[]; picks: GreedyPick[] };
  greedyRun: Run;
}

function run(match: (number | null)[], substitution: number[][], lines: TimedLine[], duration: number): Run {
  let agreement = 0;
  match.forEach((line, row) => {
    if (line !== null) agreement += substitution[row][line];
  });
  return { match, times: timesFromMatch(match, lines, duration), placed: match.filter((l) => l !== null).length, agreement };
}

export function compare(rows: string[], lines: TimedLine[], duration = 0): Comparison {
  const texts = lines.map((l) => l.text);
  const alignment = alignDetail(rows, texts);
  const greedy = greedyDetail(rows, texts);
  return {
    alignment,
    alignmentRun: run(alignment.match, alignment.substitution, lines, duration),
    greedy,
    greedyRun: run(greedy.match, alignment.substitution, lines, duration),
  };
}
