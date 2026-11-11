import { describe, it, expect } from "vitest";
import { buildCorpus } from "./corpus";
import { notes } from "./notes";
import { noteText } from "./notes.server";
import { buildIndex, highlight, parseQuery, scoreLine, search, snippet, termLine, tokenize } from "./search";

// Found by an independent review, each one reproduced before it was fixed. These run on the whole
// corpus, notes included: the record-only corpus the older tests use was too small to show them.
const index = buildIndex(buildCorpus(notes.map((n) => noteText(n.slug))));

/** A spread of real queries: every 9th term of the vocabulary, plus the forms the UI can produce. */
const QUERIES = [
  ...index.terms.filter((_, i) => i % 2 === 0).map((t) => `${t} `),
  "kind:note",
  "kind:project",
  "tech:kotlin",
  '"search engine" "c++" ',
  '"traffic replay" ',
  "performance testing ",
  "hdr kind:note ",
];

/**
 * Rounding as a person does it, half up, on the decimal digits and not on the binary float: the
 * product is first printed to ten decimals, so 2.5249999999 is 2.52 and 0.4250000000 is 0.43.
 */
function byHand(product: number): string {
  const [whole, frac = ""] = product.toFixed(10).split(".");
  const cents = BigInt(whole + frac.slice(0, 2)) + (Number(frac[2]) >= 5 ? BigInt(1) : BigInt(0));
  const text = cents.toString().padStart(3, "0");
  return `${text.slice(0, -2)}.${text.slice(-2)}`;
}

describe("the score as displayed", () => {
  it("every printed score line multiplies back to the printed score, by hand", () => {
    let checked = 0;
    let inexact = 0;
    for (const q of QUERIES) {
      for (const hit of search(index, q).hits) {
        const line = scoreLine(hit);
        const product = [line.base, ...line.factors.map((f) => f.value)].reduce((p, v) => p * Number(v), 1);
        if (line.exact) {
          expect(byHand(product), `${q} / ${hit.doc.id}: ${line.base} x ${line.factors.map((f) => f.value).join(" x ")}`).toBe(line.total);
        }
        if (!line.exact) {
          // Only a filter-only hit may be inexact: its base is exactly 1, so nothing can be printed finer.
          expect(line.listedByFilter, `${q} / ${hit.doc.id}`).toBe(true);
          expect(Math.abs(product - hit.score)).toBeLessThan(1e-9);
          inexact += 1;
        }
        expect(line.total).toBe(hit.score.toFixed(2));
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(1000);
    // The inexact ones exist (0.425 prints as 0.42 or 0.43), so the "approximately" sign is reachable.
    expect(inexact).toBeGreaterThan(0);
  });

  it("every printed term row multiplies back to its printed score, by hand", () => {
    let checked = 0;
    for (const q of QUERIES) {
      for (const hit of search(index, q).hits.slice(0, 20)) {
        for (const t of hit.explain.terms) {
          const row = termLine(t);
          expect(byHand(Number(row.weight) * Number(row.idf) * Number(row.saturation)), `${q} / ${hit.doc.id} / ${t.term}`).toBe(row.score);
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });
});

describe("query language, the cases the review broke", () => {
  it('-"a phrase" removes documents with the phrase; it does not require it', () => {
    const p = parseQuery('replay -"traffic replay" ');
    expect(p.phrases).toEqual([]);
    expect(p.excludedPhrases).toEqual([tokenize("traffic replay")]);
    const all = search(index, "replay ").hits.map((h) => h.doc.id);
    const withPhrase = search(index, 'replay "traffic replay" ').hits.map((h) => h.doc.id);
    const without = search(index, 'replay -"traffic replay" ').hits.map((h) => h.doc.id);
    expect(withPhrase.length).toBeGreaterThan(0);
    expect(without.length).toBe(all.length - withPhrase.length);
    for (const id of withPhrase) expect(without).not.toContain(id);
  });

  it('-"oneword" is a plain exclusion', () => {
    expect(parseQuery('-"replay"').excluded).toEqual(tokenize("replay"));
  });

  it("kind:earlier selects earlier work alone, which is what its facet chip sends", () => {
    const hits = search(index, "built kind:earlier ").hits;
    expect(hits.length).toBeGreaterThan(0);
    for (const h of hits) expect(h.doc.kind).toBe("Earlier work");
    expect(parseQuery("kind:earlier").kinds).toEqual(["Earlier work"]);
  });
});

describe("tokenizer, the cases the review broke", () => {
  it("a comma joins digits only as a thousands separator", () => {
    expect(tokenize("50,000 queries")).toEqual(["50000", "query"]);
    expect(tokenize("1,234,567")).toEqual(["1234567"]);
    expect(tokenize("2020,2021,2022")).toEqual(["2020", "2021", "2022"]);
  });

  it("C++ and C# are languages only at the start of a word", () => {
    expect(tokenize("c++ and C#")).toEqual(["cpp", "csharp"]);
    expect(tokenize("(C++)")).toEqual(["cpp"]);
    expect(tokenize("abc++ pc#")).not.toContain("cpp");
    expect(tokenize("abc++ pc#")).not.toContain("csharp");
  });
});

describe("snippet", () => {
  it("shows the matched word even when it sits deep inside one long sentence", () => {
    const long = `${"filler word ".repeat(40)}and then the needle appears here ${"more filler ".repeat(20)}end.`;
    const stems = tokenize("needle");
    const shown = snippet(long, stems);
    expect(shown.length).toBeLessThanOrEqual(240);
    expect(highlight(shown, stems).some((s) => s.hit)).toBe(true);
    expect(shown.startsWith("… ")).toBe(true);
  });

  it("no result of a one-term query is left without a visible reason", () => {
    let unexplained = 0;
    let checked = 0;
    for (const term of index.terms.filter((_, i) => i % 5 === 0)) {
      for (const hit of search(index, `${term} `).hits.slice(0, 8)) {
        const stems = hit.matched;
        const inTitle = highlight(hit.doc.title, stems).some((s) => s.hit);
        const inSnippet = highlight(snippet(hit.doc.text, stems), stems).some((s) => s.hit);
        const inKeywords = (hit.doc.keywords ?? []).some((k) => tokenize(k).some((t) => stems.includes(t)));
        if (!inTitle && !inSnippet && !inKeywords) unexplained += 1;
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(500);
    expect(unexplained).toBe(0);
  });

  it("a long run with no space is cut at the limit, not left whole", () => {
    expect(snippet("x".repeat(400), ["nothing"]).length).toBeLessThanOrEqual(231);
  });

  it("a match after one very long unbroken token is still shown", () => {
    const stems = tokenize("needle");
    const shown = snippet(`${"a".repeat(300)} needle`, stems);
    expect(highlight(shown, stems).some((x) => x.hit)).toBe(true);
    expect(shown.length).toBeLessThanOrEqual(234);
  });

  it("the highlighter reads a list of numbers as the tokenizer does", () => {
    expect(highlight("ran in 2020,2021 and 2022", ["2021"]).some((x) => x.hit && x.text === "2021")).toBe(true);
    expect(highlight("50,000 queries", ["50000"]).some((x) => x.hit && x.text === "50,000")).toBe(true);
  });
});

describe("stemmer and metrics, pinned to known values", () => {
  it("a plural meets its singular, including plurals of -ing and -ed words", async () => {
    const { stem } = await import("./search");
    // The families a reordered stemmer split, found by running old and new over the whole vocabulary.
    for (const [a, b] of [["settings", "setting"], ["findings", "finding"], ["readings", "reading"], ["timings", "timing"], ["tests", "test"], ["queries", "query"]]) {
      expect(stem(a), `${a} / ${b}`).toBe(stem(b));
    }
    expect(stem("released")).toBe(stem("release"));
    expect(stem("closed")).toBe(stem("close"));
    expect(stem("cached")).toBe(stem("cache"));
  });

  it("nDCG@5 of a known ranking is the number worked by hand", async () => {
    const { evaluateQuery } = await import("./eval");
    const { TREATMENT } = await import("./search");
    // "alpha" three times in A, once in B: A ranks first. B is the better answer (grade 2), A the fair one (grade 1).
    const tiny = buildIndex([
      { id: "a", kind: "Project", title: "alpha alpha", context: "", text: "alpha", href: "/" },
      { id: "b", kind: "Project", title: "other", context: "", text: "alpha and many more words that make this body longer than the first", href: "/" },
      { id: "c", kind: "Project", title: "unrelated", context: "", text: "nothing here", href: "/" },
    ]);
    const q = evaluateQuery(tiny, { query: "alpha", relevant: { b: 2, a: 1 } }, TREATMENT);
    expect(q.top).toEqual(["a", "b"]);
    expect(q.firstRelevant).toBe(1);
    // DCG = 1/log2(2) + 3/log2(3); ideal = 3/log2(2) + 1/log2(3).
    const got = 1 + 3 / Math.log2(3);
    const ideal = 3 + 1 / Math.log2(3);
    expect(q.ndcg).toBeCloseTo(got / ideal, 12);
    expect(q.ndcg).toBeCloseTo(0.7967, 3);
  });
});
