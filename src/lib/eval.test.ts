import { describe, it, expect } from "vitest";
import { buildCorpus } from "./corpus";
import { notes } from "./notes";
import { noteText } from "./notes.server";
import { buildIndex, CONTROL, TREATMENT } from "./search";
import { evaluate, gradeOf, JUDGMENTS } from "./eval";

const corpus = buildCorpus(notes.map((n) => noteText(n.slug)));
const index = buildIndex(corpus);

describe("judged query set", () => {
  it("every judgment names documents that exist", () => {
    for (const j of JUDGMENTS) {
      for (const key of Object.keys(j.relevant)) {
        const found = key.endsWith("*") ? corpus.some((d) => d.id.startsWith(key.slice(0, -1))) : corpus.some((d) => d.id === key);
        expect(found, `${j.query}: ${key}`).toBe(true);
      }
    }
  });

  it("queries are unique", () => {
    const qs = JUDGMENTS.map((j) => j.query);
    expect(new Set(qs).size).toBe(qs.length);
  });

  it("an exact key beats a prefix key, and the longest prefix wins", () => {
    const j = { query: "x", relevant: { "work-0-0": 2, "work-*": 1, "work-1-*": 2 } } as const;
    expect(gradeOf(j, "work-0-0")).toBe(2);
    expect(gradeOf(j, "work-0-3")).toBe(1);
    expect(gradeOf(j, "work-1-2")).toBe(2);
    expect(gradeOf(j, "project-plutus")).toBe(0);
  });
});

// A regression guard, not a boast: I wrote the engine and the judgments both.
// If a change to the tokenizer, the rewriter or the priors costs relevance,
// these numbers fall and the build says so.
describe("relevance", () => {
  const control = evaluate(index, CONTROL);
  const treatment = evaluate(index, TREATMENT);

  it("the treatment answers every judged query with a relevant first result", () => {
    for (const q of treatment.queries) expect(q.firstRelevant, q.query).toBe(1);
    expect(treatment.p1).toBe(1);
    expect(treatment.mrr).toBe(1);
  });

  it("nDCG@5 holds at 0.9 or better", () => {
    expect(treatment.ndcg).toBeGreaterThanOrEqual(0.9);
  });

  it("the treatment beats plain BM25 on every aggregate and loses badly on no query", () => {
    expect(treatment.p1).toBeGreaterThan(control.p1);
    expect(treatment.mrr).toBeGreaterThan(control.mrr);
    expect(treatment.ndcg).toBeGreaterThan(control.ndcg + 0.1);
    treatment.queries.forEach((q, i) => expect(q.ndcg, q.query).toBeGreaterThan(control.queries[i].ndcg - 0.1));
  });

  it("metrics stay in range", () => {
    for (const s of [control, treatment]) {
      for (const q of s.queries) {
        expect(q.ndcg).toBeGreaterThanOrEqual(0);
        expect(q.ndcg).toBeLessThanOrEqual(1 + 1e-9);
      }
    }
  });
});
