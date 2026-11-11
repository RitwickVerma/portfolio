// "Judge it yourself": the engine room's judged queries, graded by the visitor.
//
// The replay table is only as good as the judgments, and I wrote those. This
// module lets the visitor write their own for the rows one query returns and
// recomputes the same three metrics from them, against both rankers, beside
// mine. The metric code is eval.ts's (evaluate, evaluateQuery, gradeOf); nothing
// here re-derives a metric. What is new is the bookkeeping around it: which
// rows a visitor is shown, what a grade map becomes as a judgment, where the two
// sets of grades disagree, and the shape of the exported file.
//
// Pure: no DOM, no storage, no clock (the caller passes the time).

import { evaluate, evaluateQuery, gradeOf, type EvalSummary, type Judgment } from "./eval";
import { snippet, tokenize, type DocKind, type RankerConfig, type SearchIndex } from "./search";

/** Eval.ts's scale, unchanged: 2 is an answer I would give in person, 1 a fair one, 0 not an answer. */
export type Grade = 0 | 1 | 2;
export const GRADES: readonly { grade: Grade; label: string }[] = [
  { grade: 2, label: "Relevant" },
  { grade: 1, label: "Partly" },
  { grade: 0, label: "Not" },
];

/** A visitor's grades: query, then document id, then grade. A document missing from the map is ungraded, and counts as 0. */
export type Grades = Record<string, Record<string, Grade>>;

export interface Rankers {
  treatment: RankerConfig;
  control: RankerConfig;
}

/** The version of the exported JSON and of the stored state. Bump it when the shape changes. */
export const JUDGE_VERSION = 1;

/** The one sessionStorage key the section keeps its state under. */
export const STORAGE_KEY = "engine-judge";

// ─── Which rows the visitor sees ────────────────────────────────────────────

export interface JudgeRow {
  id: string;
  kind: DocKind;
  title: string;
  snippet: string;
  /** Stems of the query, for marking the words in the snippet. */
  stems: string[];
  href: string;
}

/**
 * The top five of each ranker, merged and de-duplicated, in id order. The order
 * is the one thing a reader could use to tell the rankers apart, so it is
 * neither ranker's: ids start with the kind of record, so the list is grouped
 * that way and tells nothing else.
 */
export function mergedIds(index: SearchIndex, judgment: Judgment, rankers: Rankers): string[] {
  const ids = new Set<string>();
  for (const config of [rankers.treatment, rankers.control]) for (const id of evaluateQuery(index, judgment, config).top) ids.add(id);
  return [...ids].sort();
}

/** The merged rows of one query, drawn from the documents themselves. */
export function judgeRows(index: SearchIndex, judgment: Judgment, rankers: Rankers): JudgeRow[] {
  const stems = tokenize(judgment.query);
  const byId = new Map(index.docs.map((d) => [d.id, d]));
  const rows: JudgeRow[] = [];
  for (const id of mergedIds(index, judgment, rankers)) {
    const doc = byId.get(id);
    if (doc) rows.push({ id, kind: doc.kind, title: doc.title, snippet: snippet(doc.text, stems), stems, href: doc.href });
  }
  return rows;
}

// ─── Grades, validated ──────────────────────────────────────────────────────

const isGrade = (n: unknown): n is Grade => n === 0 || n === 1 || n === 2;
// A trailing * is a prefix key to gradeOf, and these two names are not documents.
const isDocId = (id: string) => id.length > 0 && !id.endsWith("*") && id !== "__proto__";

/**
 * Whatever came out of storage or a paste, reduced to grades for the given
 * queries: unknown queries, bad ids and values off the scale are dropped, and a
 * query left with no grades is dropped too.
 */
export function cleanGrades(raw: unknown, queries: readonly string[]): Grades {
  const out: Grades = {};
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return out;
  const known = new Set(queries);
  for (const [query, perDoc] of Object.entries(raw)) {
    if (!known.has(query) || typeof perDoc !== "object" || perDoc === null || Array.isArray(perDoc)) continue;
    const kept: Record<string, Grade> = {};
    for (const [id, g] of Object.entries(perDoc)) if (isDocId(id) && isGrade(g)) kept[id] = g;
    if (Object.keys(kept).length > 0) out[query] = kept;
  }
  return out;
}

/** Set one grade; the grade a row already has clears it (back to ungraded). Returns a new object. */
export function setGrade(grades: Grades, query: string, id: string, grade: Grade): Grades {
  const mine = { ...(grades[query] ?? {}) };
  if (mine[id] === grade) delete mine[id];
  else mine[id] = grade;
  const next = { ...grades };
  if (Object.keys(mine).length === 0) delete next[query];
  else next[query] = mine;
  return next;
}

export const gradedCount = (grades: Grades): number => Object.keys(grades).length;

// ─── What the visitor's grades say ──────────────────────────────────────────

export interface RowVerdict {
  id: string;
  /** What the visitor gave it; 0 when left ungraded. */
  you: Grade;
  /** What eval.ts's judgment gives it. */
  owner: Grade;
  /** True when the visitor left the row ungraded, so `you` is the default 0 and not a choice. */
  ungraded: boolean;
}

export interface JudgeQuery {
  query: string;
  /** Every merged row of the query, with both grades. */
  rows: RowVerdict[];
  /** The rows where the two grades differ. */
  disagreements: RowVerdict[];
  /** How many of the rows the visitor graded explicitly. */
  graded: number;
}

export interface Pair {
  treatment: EvalSummary;
  control: EvalSummary;
}

export interface JudgeEval {
  /** Queries with at least one grade; everything below is over these and no others. */
  graded: number;
  queries: JudgeQuery[];
  /** The visitor's grades. Documents they were not shown count as ungraded, so their ideal ranking is built from the rows they saw. */
  you: Pair;
  /** eval.ts's own numbers for the same queries: the judgments of the replay table, over the whole corpus. */
  owner: Pair;
  /** The owner's grades cut to the rows the visitor was shown: the same restriction as `you`, so the two differ only in the grades. */
  ownerOnShown: Pair;
}

const asGrade = (n: number): Grade => (n >= 2 ? 2 : n >= 1 ? 1 : 0);

/** A grade map as the judgment eval.ts takes. Grade 0 is simply absent from `relevant`. */
export function judgmentFrom(query: string, perDoc: Record<string, Grade>): Judgment {
  const relevant: Record<string, 1 | 2> = {};
  for (const [id, g] of Object.entries(perDoc)) if (g > 0 && isDocId(id)) relevant[id] = g as 1 | 2;
  return { query, relevant };
}

/**
 * Recompute P@1, MRR and nDCG@5 for treatment and control from the visitor's
 * grades, over the queries they have graded, and set them beside the owner's.
 * `queries` is the judged set (eval.ts's JUDGMENTS). Ungraded rows are 0.
 */
export function evaluateWith(index: SearchIndex, grades: Grades, rankers: Rankers, queries: readonly Judgment[]): JudgeEval {
  const known = new Set(index.docs.map((d) => d.id));
  const graded: Judgment[] = queries.filter((j) => grades[j.query] && Object.keys(grades[j.query]).length > 0);
  const mine = graded.map((j) => {
    const perDoc: Record<string, Grade> = {};
    for (const [id, g] of Object.entries(grades[j.query])) if (known.has(id)) perDoc[id] = g;
    return { owner: j, you: judgmentFrom(j.query, perDoc) };
  });
  const rows = (j: Judgment): string[] => mergedIds(index, j, rankers);
  const shown = graded.map((j) => {
    const relevant: Record<string, 1 | 2> = {};
    for (const id of rows(j)) {
      const g = gradeOf(j, id);
      if (g > 0) relevant[id] = g as 1 | 2;
    }
    return { query: j.query, relevant } satisfies Judgment;
  });
  const pair = (judgments: Judgment[]): Pair => ({
    treatment: evaluate(index, rankers.treatment, judgments),
    control: evaluate(index, rankers.control, judgments),
  });

  const perQuery = mine.map(({ owner, you }): JudgeQuery => {
    const verdicts = rows(owner).map(
      (id): RowVerdict => ({ id, you: asGrade(gradeOf(you, id)), owner: asGrade(gradeOf(owner, id)), ungraded: grades[owner.query]?.[id] === undefined }),
    );
    return {
      query: owner.query,
      rows: verdicts,
      disagreements: verdicts.filter((v) => v.you !== v.owner),
      graded: verdicts.filter((v) => !v.ungraded).length,
    };
  });

  return {
    graded: graded.length,
    queries: perQuery,
    you: pair(mine.map((m) => m.you)),
    owner: pair(graded),
    ownerOnShown: pair(shown),
  };
}

/** The sentence under a query's rows: how many rows the two sets of grades split on. */
export function disagreementLine(q: JudgeQuery): string {
  const n = q.rows.length;
  if (q.disagreements.length === 0) return `You and I agree on all ${n} rows.`;
  return `You and I disagree on ${q.disagreements.length} of ${n} rows.`;
}

// ─── Export ─────────────────────────────────────────────────────────────────

export interface ExportedGrades {
  version: number;
  queries: { query: string; grades: Record<string, Grade> }[];
  evaluatedAt: string;
}

/** The grades as the file a visitor copies: queries in the judged set's order, graded ones only. */
export function exportGrades(grades: Grades, order: readonly string[], now: Date): ExportedGrades {
  return {
    version: JUDGE_VERSION,
    queries: order.filter((q) => grades[q] && Object.keys(grades[q]).length > 0).map((query) => ({ query, grades: { ...grades[query] } })),
    evaluatedAt: now.toISOString(),
  };
}

// ─── Stored state ───────────────────────────────────────────────────────────

export interface Stored {
  version: number;
  /** Position in the judged set, so a reload comes back to the query the visitor was on. */
  at: number;
  grades: Grades;
}

export const emptyStored = (): Stored => ({ version: JUDGE_VERSION, at: 0, grades: {} });

/** Storage text to state; anything unreadable, or from another version, is the empty state. */
export function parseStored(raw: string | null, queries: readonly string[]): Stored {
  if (!raw) return emptyStored();
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return emptyStored();
    const d = data as Record<string, unknown>;
    if (d.version !== JUDGE_VERSION) return emptyStored();
    const at = typeof d.at === "number" && Number.isInteger(d.at) ? Math.min(Math.max(d.at, 0), Math.max(0, queries.length - 1)) : 0;
    return { version: JUDGE_VERSION, at, grades: cleanGrades(d.grades, queries) };
  } catch {
    return emptyStored();
  }
}

export const serializeStored = (s: Stored): string => JSON.stringify(s);
