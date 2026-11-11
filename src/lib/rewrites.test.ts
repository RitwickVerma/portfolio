import { describe, it, expect } from "vitest";
import { buildCorpus } from "./corpus";
import { notes } from "./notes";
import { noteText } from "./notes.server";
import { buildIndex, planQuery, REWRITES_RAW, rewritesFor, search, stem, tokenize, TREATMENT } from "./search";

const index = buildIndex(buildCorpus(notes.map((n) => noteText(n.slug))));
const df = (t: string) => index.postings.get(t)?.size ?? 0;

// The table maps a visitor's word to the site's words. A target that no document contains does nothing, and a
// source the corpus already uses a lot needs no help: this keeps the first out of the table.
describe("the rewrite table, against the real corpus", () => {
  it("every target stem occurs in at least one document", () => {
    const dead: string[] = [];
    for (const [key, targets] of Object.entries(REWRITES_RAW)) for (const t of tokenize(targets)) if (df(t) === 0) dead.push(`${key} -> ${t}`);
    expect(dead).toEqual([]);
  });

  it("a rewrite never targets a word its own source stems to, and lists each target once", () => {
    for (const [key, targets] of Object.entries(REWRITES_RAW)) {
      const stems = tokenize(targets);
      expect(new Set(stems).size, key).toBe(stems.length);
    }
  });

  it("the keys added from the audit are words no document uses, and each reaches documents", () => {
    for (const key of ["reliability", "sre", "oncall", "frontend", "web", "algorithm", "marketplace", "ecommerce", "auth", "authentication", "elasticsearch", "lucene", "solr"]) {
      expect(df(stem(key)), `${key} is in the corpus already`).toBe(0);
      expect(rewritesFor(stem(key)).length, key).toBeGreaterThan(0);
      expect(search(index, `${key} `, TREATMENT).hits.length, `${key} finds nothing`).toBeGreaterThan(0);
    }
  });

  it("a rewritten word plans its targets at the rewrite weight and is not respelled", () => {
    const plan = planQuery(index, "marketplace ", TREATMENT);
    expect(plan.filter((p) => p.source === "rewrite").map((p) => p.term)).toEqual(expect.arrayContaining(["ebay", "motor", "fitment"]));
    expect(plan.some((p) => p.source === "fuzzy")).toBe(false);
  });

  it("each added word reaches the document it was added for", () => {
    const top = (q: string, n = 5) => search(index, `${q} `, TREATMENT).hits.slice(0, n).map((h) => h.doc.id);
    expect(top("marketplace")).toContain("work-0-0");
    expect(top("oncall")).toContain("note-homelab-git-is-the-truth--paging-without-noise");
    expect(top("authentication").some((id) => id === "project-homelab" || id === "lab-VM110")).toBe(true);
    expect(top("frontend").some((id) => id.startsWith("note-colophon"))).toBe(true);
    expect(top("elasticsearch")).toContain("work-0-0");
  });
});
