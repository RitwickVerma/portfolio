import { describe, it, expect } from "vitest";
import { answers } from "./answers";
import { buildCorpus } from "./corpus";
import { JUDGMENTS } from "./eval";
import { notes } from "./notes";
import { noteText } from "./notes.server";
import { buildIndex, search, type SearchResult } from "./search";
import { takeApartHref, understand, MAX_NAMED } from "./understanding";

const index = buildIndex(buildCorpus(notes.map((n) => noteText(n.slug))));
const TODAY = "2026-11-11";

/** The line for a query as the hero draws it. */
const line = (q: string) => {
  const result = search(index, q);
  return understand(index, result, answers(q, TODAY));
};
const labels = (q: string) => line(q).map((u) => u.label);

describe("the line says what the engine did, and only that", () => {
  it("respelling: names the word it searched for and the one typed", () => {
    expect(labels("fitmen ")).toEqual(["fitment, spelled from fitmen"]);
    expect(line("fitmen ")[0]).toMatchObject({ kind: "respell", found: "fitment" });
  });

  it("rewrite: names what it added and what it rewrote", () => {
    const l = labels("ir");
    expect(l).toHaveLength(1);
    expect(l[0]).toMatch(/^added: .+ \(rewrite of ir\)$/);
    expect(line("ir")[0].kind).toBe("rewrite");
    // The words are the corpus's, never stems ("queri").
    expect(l[0]).not.toMatch(/queri\b|rank\b(?!ing)/);
  });

  it("rewrite: a long table entry is cut to a few words and a count", () => {
    const l = labels("infra")[0];
    expect(l).toMatch(/and \d+ more\) ?$|\(rewrite of infra\)$/);
    expect(l.split(",").length).toBeLessThanOrEqual(MAX_NAMED + 1);
  });

  it("filter: a kind and a stack, as a visitor would type them", () => {
    expect(labels("kind:project")).toEqual(["filter kind:project"]);
    expect(labels("kind:work")).toEqual(["filter kind:work"]);
    expect(labels("tech:kotlin")).toEqual(["filter tech:kotlin"]);
  });

  it("phrase: as typed, and not an excluded one", () => {
    expect(labels('"query transform" ')).toContain('phrase "query transform"');
    expect(labels('replay -"traffic replay"').some((x) => x.startsWith("phrase"))).toBe(false);
  });

  it("exclusion: what was left out", () => {
    expect(labels("replay -plutus")).toEqual(["leaving out: plutus"]);
  });

  it("answer row showing: the line does not repeat the subject and intent the row already says", () => {
    for (const q of ["how many years of c++", "how long at ebay", "how many projects", "where is he based"]) {
      expect(answers(q, TODAY), q).not.toBeNull();
      expect(labels(q), q).toEqual([]);
    }
  });

  it("answer row showing: what the engine did to the words stays (respelling, rewrite, filter, exclusion, phrase)", () => {
    // answers() does not fire on a query with operators, so pair a real answer with each plan's result.
    const row = answers("how many projects", TODAY);
    expect(row).not.toBeNull();
    const withRow = (q: string) => understand(index, search(index, q), row).map((u) => u.label);
    expect(withRow("fitmen ")).toEqual(["fitment, spelled from fitmen"]);
    expect(withRow("ir")[0]).toMatch(/^added: .+ \(rewrite of ir\)$/);
    expect(withRow("kind:project")).toEqual(["filter kind:project"]);
    expect(withRow("replay -plutus")).toEqual(["leaving out: plutus"]);
    expect(withRow('"query transform" ')).toEqual(['phrase "query transform"']);
  });

  it("the guard can fail: with no answer row, the same words still get a line", () => {
    expect(answers("how many", TODAY)).toBeNull();
    expect(labels("how many")).toEqual(["main, spelled from many"]);
  });

  it("a question's own words are not reported as respelled (\"many\" is not in the record)", () => {
    // Without the answer the engine does respell it; with one, the word was part of the question.
    expect(labels("how many")).toEqual(["main, spelled from many"]);
    expect(labels("how many projects")).toEqual([]);
    expect(labels("how many years of c++").some((x) => x.includes("spelled"))).toBe(false);
  });

  it("combines in a fixed order: respelling, rewrite, filter, phrase, exclusion", () => {
    const kinds = line('hire him fitmen kind:note "query transform" -plutus').map((u) => u.kind);
    expect(kinds).toEqual([...kinds].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)));
    expect(new Set(kinds).size).toBeGreaterThanOrEqual(4);
  });

  it("nothing: a plain query the engine matched as typed has no line at all", () => {
    for (const q of ["fitment", "c++", "traffic replay", "kotlin", ""]) expect(line(q), q).toEqual([]);
  });

  it("does not report a prefix completion while a word is still being typed", () => {
    expect(line("fitm")).toEqual([]);
  });
});

const ORDER = ["respell", "rewrite", "filter", "phrase", "exclude"];

describe("take it apart", () => {
  it("links to the engine room on the same query, encoded", () => {
    expect(takeApartHref("how many years of c++")).toBe("/engine/?q=how%20many%20years%20of%20c%2B%2B#xray");
    expect(takeApartHref(" a&b ")).toBe("/engine/?q=a%26b#xray");
  });
});

/** Freeze a result all the way down: a write to it throws in strict mode. */
function freeze<T>(o: T): T {
  if (o && typeof o === "object" && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of o instanceof Map ? o.values() : Object.values(o)) freeze(v);
  }
  return o;
}

describe("the answer and the line are additions, not ranking changes", () => {
  const queries = [...JUDGMENTS.map((j) => j.query), "how many years of c++", "where is he based", "fitmen ", "kind:project", "hire him", "ir"];

  it("search() output is byte-identical before and after answers() and understand() have read it, for every judged query", () => {
    for (const q of queries) {
      const before = JSON.stringify(search(index, q));
      const result: SearchResult = freeze(search(index, q));
      // Both are pure readers: they run on a frozen result without throwing and leave it as it was.
      understand(index, result, answers(q, TODAY));
      expect(JSON.stringify(result), q).toBe(before);
      expect(JSON.stringify(search(index, q)), q).toBe(before);
    }
  });

  it("every judged query still searches to the same hits whether or not the line is computed", () => {
    for (const j of JUDGMENTS) {
      const ids = search(index, j.query).hits.map((h) => h.doc.id);
      line(j.query);
      expect(search(index, j.query).hits.map((h) => h.doc.id)).toEqual(ids);
    }
  });

  it("the guard can fail: a frozen result that was written to would throw", () => {
    const result = freeze(search(index, "fitment"));
    expect(() => {
      (result.plan as unknown as { term: string }[]).push({ term: "x" });
    }).toThrow();
  });
});
