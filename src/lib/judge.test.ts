import { describe, it, expect } from "vitest";
import { buildCorpus } from "./corpus";
import { notes } from "./notes";
import { noteText } from "./notes.server";
import { buildIndex, CONTROL, TREATMENT } from "./search";
import { evaluate, evaluateQuery, gradeOf, JUDGMENTS } from "./eval";
import {
  cleanGrades,
  disagreementLine,
  evaluateWith,
  exportGrades,
  JUDGE_VERSION,
  judgeRows,
  mergedIds,
  parseStored,
  serializeStored,
  setGrade,
  type Grade,
  type Grades,
} from "./judge";

const index = buildIndex(buildCorpus(notes.map((n) => noteText(n.slug))));
const rankers = { treatment: TREATMENT, control: CONTROL };
const judgment = (q: string) => {
  const j = JUDGMENTS.find((x) => x.query === q);
  if (!j) throw new Error(`no judgment for ${q}`);
  return j;
};
// Two queries where the rankers differ: a fixture small enough to read, drawn from the real set.
const FIXTURE = [judgment("fitment"), judgment("testing")];

/** The owner's grade for every document in the corpus: what eval.ts itself sees. */
function ownerGradesEverywhere(queries = FIXTURE): Grades {
  const out: Grades = {};
  for (const j of queries) {
    out[j.query] = {};
    for (const d of index.docs) {
      const g = gradeOf(j, d.id);
      if (g > 0) out[j.query][d.id] = g as Grade;
    }
  }
  return out;
}

describe("evaluateWith", () => {
  it("given my grades for every document, reproduces eval.ts's numbers exactly", () => {
    const r = evaluateWith(index, ownerGradesEverywhere(), rankers, FIXTURE);
    expect(r.graded).toBe(2);
    for (const side of ["treatment", "control"] as const) {
      const expected = evaluate(index, rankers[side], FIXTURE);
      expect(r.you[side].p1).toBe(expected.p1);
      expect(r.you[side].mrr).toBe(expected.mrr);
      expect(r.you[side].ndcg).toBe(expected.ndcg);
      expect(r.owner[side].ndcg).toBe(expected.ndcg);
      expect(r.you[side].queries.map((q) => q.top)).toEqual(expected.queries.map((q) => q.top));
    }
  });

  it("given my grades on the shown rows only, matches my grades cut to the shown rows", () => {
    const grades: Grades = {};
    for (const j of FIXTURE) {
      grades[j.query] = {};
      for (const id of mergedIds(index, j, rankers)) grades[j.query][id] = gradeOf(j, id) as Grade;
    }
    const r = evaluateWith(index, grades, rankers, FIXTURE);
    for (const side of ["treatment", "control"] as const) {
      expect(r.you[side].p1).toBeCloseTo(r.ownerOnShown[side].p1, 12);
      expect(r.you[side].mrr).toBeCloseTo(r.ownerOnShown[side].mrr, 12);
      expect(r.you[side].ndcg).toBeCloseTo(r.ownerOnShown[side].ndcg, 12);
    }
    expect(r.queries.every((q) => q.disagreements.length === 0)).toBe(true);
  });

  it("counts an ungraded row as 0: only the graded queries enter, and a row graded 0 is a grade", () => {
    const none = evaluateWith(index, {}, rankers, FIXTURE);
    expect(none.graded).toBe(0);
    expect(none.queries).toEqual([]);

    const ids = mergedIds(index, FIXTURE[0], rankers);
    const allNot: Grades = { fitment: { [ids[0]]: 0 } };
    const r = evaluateWith(index, allNot, rankers, FIXTURE);
    expect(r.graded).toBe(1); // the second query has no grades and is left out
    expect(r.you.treatment.queries.map((q) => q.query)).toEqual(["fitment"]);
    expect(r.you.treatment.p1).toBe(0);
    expect(r.you.treatment.mrr).toBe(0);
    expect(r.you.treatment.ndcg).toBe(0);
    expect(r.queries[0].graded).toBe(1);
    // The rows left alone are marked as such, so a disagreement with an ungraded row can say so.
    expect(r.queries[0].rows.filter((v) => v.ungraded).length).toBe(r.queries[0].rows.length - 1);

    // One row graded relevant: every other row is 0, so the metric depends on where that row ranks.
    const top = evaluateQuery(index, FIXTURE[0], TREATMENT).top[0];
    const one = evaluateWith(index, { fitment: { [top]: 2 } }, rankers, FIXTURE);
    expect(one.you.treatment.p1).toBe(1);
    expect(one.you.treatment.mrr).toBe(1);
    expect(one.you.treatment.ndcg).toBe(1); // the ideal is the one document the visitor called relevant
  });

  it("ignores grades for documents that are not in the corpus", () => {
    const r = evaluateWith(index, { fitment: { "no-such-doc": 2 } }, rankers, FIXTURE);
    expect(r.you.treatment.p1).toBe(0);
  });

  it("counts the rows where the visitor and the owner differ, and names them", () => {
    const j = FIXTURE[0];
    const ids = mergedIds(index, j, rankers);
    const grades: Grades = { [j.query]: {} };
    for (const id of ids) grades[j.query][id] = gradeOf(j, id) as Grade;
    // Flip two rows to a grade the owner did not give.
    const flipped = ids.slice(0, 2);
    for (const id of flipped) grades[j.query][id] = ((gradeOf(j, id) + 1) % 3) as Grade;
    const q = evaluateWith(index, grades, rankers, FIXTURE).queries[0];
    expect(q.rows.map((r) => r.id)).toEqual(ids);
    expect(q.disagreements.map((d) => d.id)).toEqual(flipped);
    expect(disagreementLine(q)).toBe(`You and I disagree on 2 of ${ids.length} rows.`);
    for (const d of q.disagreements) expect(d.you).not.toBe(d.owner);
    expect(q.rows.every((r) => !r.ungraded)).toBe(true);
  });

  it("says so when there is nothing to disagree on", () => {
    const j = FIXTURE[1];
    const grades: Grades = { [j.query]: {} };
    for (const id of mergedIds(index, j, rankers)) grades[j.query][id] = gradeOf(j, id) as Grade;
    const q = evaluateWith(index, grades, rankers, FIXTURE).queries[0];
    expect(disagreementLine(q)).toBe(`You and I agree on all ${q.rows.length} rows.`);
  });

  it("keeps every metric in [0, 1]", () => {
    const grades: Grades = {};
    for (const j of JUDGMENTS.slice(0, 8)) {
      grades[j.query] = {};
      mergedIds(index, j, rankers).forEach((id, i) => (grades[j.query][id] = (i % 3) as Grade));
    }
    const r = evaluateWith(index, grades, rankers, JUDGMENTS);
    for (const p of [r.you, r.owner, r.ownerOnShown]) {
      for (const s of [p.treatment, p.control]) for (const v of [s.p1, s.mrr, s.ndcg]) expect(v >= 0 && v <= 1 + 1e-9).toBe(true);
    }
  });
});

describe("the rows a visitor is shown", () => {
  it("are both rankers' top five, merged once, in an order that is neither's", () => {
    for (const j of JUDGMENTS) {
      const ids = mergedIds(index, j, rankers);
      const t = evaluateQuery(index, j, TREATMENT).top;
      const c = evaluateQuery(index, j, CONTROL).top;
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.length).toBeLessThanOrEqual(10);
      expect([...ids].sort()).toEqual([...new Set([...t, ...c])].sort());
      expect(ids).toEqual([...ids].sort());
    }
  });

  it("carry a title, a kind, a snippet and a link", () => {
    const rows = judgeRows(index, FIXTURE[0], rankers);
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.title.length).toBeGreaterThan(0);
      expect(r.kind.length).toBeGreaterThan(0);
      expect(r.snippet.length).toBeGreaterThan(0);
      expect(r.href.length).toBeGreaterThan(0);
    }
  });
});

describe("grades", () => {
  it("pressing the grade a row has clears it, and a query with no grades left disappears", () => {
    let g = setGrade({}, "fitment", "a", 2);
    expect(g).toEqual({ fitment: { a: 2 } });
    g = setGrade(g, "fitment", "a", 1);
    expect(g).toEqual({ fitment: { a: 1 } });
    g = setGrade(g, "fitment", "a", 1);
    expect(g).toEqual({});
  });

  it("does not change the object it was given", () => {
    const before: Grades = { fitment: { a: 2 } };
    setGrade(before, "fitment", "b", 0);
    expect(before).toEqual({ fitment: { a: 2 } });
  });

  it("cleanGrades keeps only known queries, plain ids and grades on the scale", () => {
    const raw = { fitment: { a: 2, b: 3, "c*": 1, __proto__x: 1, d: "2" }, nope: { a: 1 }, testing: [1], tests: {} };
    expect(cleanGrades(raw, ["fitment", "testing", "tests"])).toEqual({ fitment: { a: 2, __proto__x: 1 } });
    expect(cleanGrades(null, ["fitment"])).toEqual({});
    expect(cleanGrades([], ["fitment"])).toEqual({});
  });

  it("stored state round-trips, and anything else is the empty state", () => {
    const qs = JUDGMENTS.map((j) => j.query);
    const s = { version: JUDGE_VERSION, at: 3, grades: { fitment: { "work-0-0": 2 as Grade } } };
    expect(parseStored(serializeStored(s), qs)).toEqual(s);
    const empty = { version: JUDGE_VERSION, at: 0, grades: {} };
    expect(parseStored(null, qs)).toEqual(empty);
    expect(parseStored("{not json", qs)).toEqual(empty);
    expect(parseStored(JSON.stringify({ version: 99, at: 2, grades: s.grades }), qs)).toEqual(empty);
    expect(parseStored(JSON.stringify({ ...s, at: 9999 }), qs).at).toBe(qs.length - 1);
    expect(parseStored(JSON.stringify({ ...s, at: -4 }), qs).at).toBe(0);
  });
});

describe("export", () => {
  const order = JUDGMENTS.map((j) => j.query);
  const grades: Grades = { testing: { "work-0-1": 2, "work-1-0": 0 }, fitment: { "work-0-0": 1 } };
  const out = exportGrades(grades, order, new Date("2026-11-10T12:00:00.000Z"));

  it("has a stable shape: version, queries with their grades, evaluatedAt", () => {
    expect(Object.keys(out)).toEqual(["version", "queries", "evaluatedAt"]);
    for (const q of out.queries) expect(Object.keys(q)).toEqual(["query", "grades"]);
    expect(out.version).toBe(JUDGE_VERSION);
    expect(out.evaluatedAt).toBe("2026-11-10T12:00:00.000Z");
  });

  it("lists graded queries in the judged set's order, with every grade including 0", () => {
    expect(out.queries.map((q) => q.query)).toEqual(["fitment", "testing"]);
    expect(out.queries[1].grades).toEqual({ "work-0-1": 2, "work-1-0": 0 });
  });

  it("survives JSON and leaves out ungraded queries", () => {
    expect(JSON.parse(JSON.stringify(out))).toEqual(out);
    expect(exportGrades({}, order, new Date(0)).queries).toEqual([]);
  });
});
