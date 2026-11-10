import { describe, it, expect } from "vitest";
import {
  buildIndex, search, planQuery, parseQuery, tokenize, stem, highlight, snippet, editDistance, nearestTerms,
  CONTROL, TREATMENT, PHRASE_BONUS, type SearchDoc,
} from "./search";

const doc = (id: string, title: string, text: string, keywords: string[] = [], kind: SearchDoc["kind"] = "Project"): SearchDoc => ({
  id,
  kind,
  title,
  context: "",
  text,
  keywords,
  href: `/#${id}`,
});

const docs = [
  doc("cache", "A per-request cache", "Each repeated backend lookup runs only once. Failures are never cached.", [], "eBay"),
  doc("replay", "Traffic replay", "Replayed 50,000 production queries against old and new builds.", ["C++", "testing"], "eBay"),
  doc("tv", "Ambilight", "A headless .NET service reads the video plane. Written in C#.", ["Tizen"]),
  doc("kbd", "Keyboard firmware", "ZMK on a RISC-V SoC, traced from PCB photos.", ["C", "Ghidra"]),
  doc("java", "Library system", "Built in Java EE with servlets.", [], "Earlier work"),
  doc("note", "Notes on replay", "Production traffic is odd. A replay of it finds what tests miss.", ["testing"], "Note"),
];
const index = buildIndex(docs);
const ids = (q: string, config = TREATMENT) => search(index, q, config).hits.map((h) => h.doc.id);

describe("tokenize", () => {
  it("keeps C++, C# and .NET as their own terms, apart from C", () => {
    expect(tokenize("C++ and C# on .NET, plus C")).toEqual(["cpp", "csharp", "dotnet", "plus", "c"]);
  });

  it("drops thousands separators so a number is one term", () => {
    expect(tokenize("50,000 queries, 2,549 tests")).toEqual(["50000", "query", "2549", "test"]);
  });

  it("drops stopwords and splits on punctuation", () => {
    expect(tokenize("the per-request cache of the engine")).toEqual(["per", "request", "cach", "engin"]);
  });
});

describe("stem", () => {
  it.each([
    ["caching", "cach"],
    ["cached", "cach"],
    ["cache", "cach"],
    ["tests", "test"],
    ["testing", "test"],
    ["queries", "query"],
    ["running", "run"],
    ["replayed", "replay"],
    ["rewriting", "rewrit"],
    ["rewrite", "rewrit"],
  ])("%s -> %s", (word, expected) => expect(stem(word)).toBe(expected));

  it("leaves short words, numbers and -ss/-us endings alone", () => {
    expect(stem("zmk")).toBe("zmk");
    expect(stem("2022")).toBe("2022");
    expect(stem("class")).toBe("class");
    expect(stem("plutus")).toBe("plutus");
  });
});

describe("parseQuery", () => {
  it("separates phrases, exclusions, filters and free terms", () => {
    const p = parseQuery('"traffic replay" caching -java kind:note tech:kotlin ');
    expect(p.phrases).toEqual([["traffic", "replay"]]);
    expect(p.terms).toEqual(["cach"]);
    expect(p.excluded).toEqual(["java"]);
    expect(p.kinds).toEqual(["Note"]);
    expect(p.tech).toEqual(["kotlin"]);
    expect(p.stillTyping).toBe(false);
  });

  it("an unclosed quote is a phrase in progress", () => {
    expect(parseQuery('"traffic rep').phrases).toEqual([["traffic", "rep"]]);
  });

  it("kind:work spans both kinds of job, and an unknown kind is reported, not ignored", () => {
    expect(parseQuery("kind:work").kinds).toEqual(["eBay", "Earlier work"]);
    expect(parseQuery("kind:poetry x").unknownKinds).toEqual(["poetry"]);
  });

  it("a hyphen inside a word is not an exclusion", () => {
    const p = parseQuery("per-request ");
    expect(p.excluded).toEqual([]);
    expect(p.terms).toEqual(["per", "request"]);
  });

  it("only a free term at the end is still being typed", () => {
    expect(parseQuery("rep").stillTyping).toBe(true);
    expect(parseQuery("rep ").stillTyping).toBe(false);
    expect(parseQuery("replay kind:note").stillTyping).toBe(false);
    expect(parseQuery('"traffic replay"').stillTyping).toBe(false);
  });
});

describe("search", () => {
  it("finds a document by any inflection of its words", () => {
    expect(ids("caching ")).toEqual(["cache"]);
    expect(ids("replayed ").sort()).toEqual(["note", "replay"]);
  });

  it("C++ does not match C# or plain C", () => {
    expect(ids("c++ ")).toEqual(["replay"]);
    expect(ids("c# ")).toEqual(["tv"]);
  });

  it("ranks a title match above a body match", () => {
    const both = buildIndex([
      doc("body", "Something else", "This mentions firmware once in passing among other words."),
      doc("title", "Firmware", "Short text."),
    ]);
    expect(search(both, "firmware ").hits.map((h) => h.doc.id)).toEqual(["title", "body"]);
  });

  it("completes the word being typed, and scores a completion below an exact match", () => {
    expect(ids("jav")).toEqual(["java"]);
    const plan = planQuery(index, "rep");
    expect(plan.find((t) => t.term === "replay")).toMatchObject({ source: "prefix", from: "rep" });
  });

  it("a phrase needs its words adjacent and in order", () => {
    expect(ids('"traffic replay"')).toEqual(["replay"]);
    expect(ids('"replay traffic"')).toEqual([]);
    // "production traffic" appears in the note; the other document has both words apart.
    expect(ids('"production traffic"')).toEqual(["note"]);
  });

  it("a phrase cannot straddle two fields or two keywords", () => {
    const two = buildIndex([doc("x", "Reverse", "engineering is fun", ["open", "source"])]);
    expect(search(two, '"reverse engineering"').hits).toEqual([]);
    expect(search(two, '"open source"').hits).toEqual([]);
  });

  it("a phrase match multiplies the score", () => {
    const loose = search(index, "traffic replay ").hits.find((h) => h.doc.id === "replay")!;
    const exact = search(index, '"traffic replay"').hits.find((h) => h.doc.id === "replay")!;
    expect(exact.score / loose.score).toBeCloseTo(PHRASE_BONUS);
    expect(exact.explain.phrases).toBe(1);
  });

  it("-term removes documents that contain it", () => {
    expect(ids("replay -production ")).toEqual([]);
    expect(ids("testing -traffic ")).toEqual([]);
    expect(ids("replay -odd ")).toEqual(["replay"]);
  });

  it("kind: filters results and facets still count what the filter hid", () => {
    const r = search(index, "replay kind:note ");
    expect(r.hits.map((h) => h.doc.id)).toEqual(["note"]);
    expect(r.facets).toEqual({ eBay: 1, Note: 1 });
  });

  it("tech: matches keywords only, and a filter alone lists what it selects", () => {
    expect(ids("tech:testing")).toEqual(["replay", "note"]);
    expect(ids("tech:c++")).toEqual(["replay"]);
    expect(ids("kind:note")).toEqual(["note"]);
  });

  it("rewrites a visitor's word into the site's vocabulary, at a lower weight", () => {
    const plan = planQuery(index, "hacking ");
    expect(plan.find((t) => t.term === "ghidra")).toMatchObject({ source: "rewrite", from: "hack" });
    expect(plan.find((t) => t.term === "ghidra")!.weight).toBeLessThan(1);
    expect(ids("hacking ")).toEqual(["kbd"]);
  });

  it("an exact term outranks the same term reached by rewrite", () => {
    const two = buildIndex([doc("a", "Android app", "Kotlin."), doc("b", "Mobile app", "Kotlin.")]);
    expect(search(two, "mobile ").hits[0].doc.id).toBe("b");
  });

  it("a misspelt word falls back to its nearest spelling, and says so in the plan", () => {
    const r = search(index, "firmwrae ");
    expect(r.hits.map((h) => h.doc.id)).toEqual(["kbd"]);
    expect(r.plan.find((t) => t.source === "fuzzy")).toMatchObject({ term: "firmwar", from: "firmwra" });
  });

  it("a word that matches is never respelled", () => {
    expect(search(index, "replay ").plan.every((t) => t.source !== "fuzzy")).toBe(true);
  });

  it("the control ranker has no rewrites, completions, spelling help or priors", () => {
    expect(ids("hacking ", CONTROL)).toEqual([]);
    expect(ids("jav", CONTROL)).toEqual([]);
    expect(ids("firmwrae ", CONTROL)).toEqual([]);
    const lifted = buildIndex([doc("plain", "Same", "same text"), { ...doc("lifted", "Same", "same text"), prior: 2 }]);
    expect(search(lifted, "same ", CONTROL).hits.map((h) => h.doc.id)).toEqual(["plain", "lifted"]);
    expect(search(lifted, "same ", TREATMENT).hits.map((h) => h.doc.id)).toEqual(["lifted", "plain"]);
  });

  it("returns nothing, and a plan with zero document counts, for a term the corpus lacks", () => {
    const r = search(index, "kubernetes ");
    expect(r.hits).toEqual([]);
    expect(r.plan).toEqual([{ term: "kubernet", source: "typed", weight: 1, df: 0 }]);
    expect(r.total).toBe(docs.length);
  });

  it("an empty or all-stopword query matches nothing", () => {
    expect(ids("")).toEqual([]);
    expect(ids("the of and")).toEqual([]);
  });

  it("is deterministic: equal scores keep corpus order", () => {
    const same = buildIndex([doc("first", "Same", "same text"), doc("second", "Same", "same text")]);
    expect(search(same, "same ").hits.map((h) => h.doc.id)).toEqual(["first", "second"]);
  });
});

describe("explain", () => {
  it("the parts multiply back to the score", () => {
    const lifted = buildIndex([{ ...docs[1], prior: 1.3 }, ...docs.slice(2)]);
    for (const q of ["replay production ", '"traffic replay" c++ ', "hacking "]) {
      for (const hit of search(lifted, q).hits) {
        const sum = hit.explain.terms.reduce((s, t) => s + t.score, 0);
        expect(sum * hit.explain.prior * PHRASE_BONUS ** hit.explain.phrases).toBeCloseTo(hit.score, 10);
        for (const t of hit.explain.terms) {
          const boosted = t.tf[0] * TREATMENT.boost.title + t.tf[1] * TREATMENT.boost.keywords + t.tf[2] * TREATMENT.boost.text;
          expect(t.boostedTf).toBeCloseTo(boosted);
          expect(t.score).toBeCloseTo(t.weight * t.idf * ((boosted * (TREATMENT.k1 + 1)) / (boosted + TREATMENT.k1 * t.norm)));
        }
      }
    }
  });

  it("records which field each match came from", () => {
    const hit = search(index, "replay ").hits.find((h) => h.doc.id === "replay")!;
    expect(hit.explain.terms[0].tf).toEqual([1, 0, 1]);
  });
});

describe("spelling", () => {
  it("counts an adjacent swap as one edit", () => {
    expect(editDistance("fitmnet", "fitment")).toBe(1);
    expect(editDistance("cache", "cache")).toBe(0);
    expect(editDistance("cach", "catch")).toBe(1);
    expect(editDistance("abc", "xyz")).toBe(3);
  });

  it("offers nothing for short words or numbers", () => {
    expect(nearestTerms(index, "zmx")).toEqual([]);
    expect(nearestTerms(index, "50001")).toEqual([]);
  });
});

describe("highlight and snippet", () => {
  it("marks every inflection of a matched stem, and nothing else", () => {
    const segs = highlight("Failures are never cached. The cache is per request.", ["cach"]);
    expect(segs.filter((s) => s.hit).map((s) => s.text)).toEqual(["cached", "cache"]);
    expect(segs.map((s) => s.text).join("")).toBe("Failures are never cached. The cache is per request.");
  });

  it("marks C++ whole and 50,000 whole", () => {
    expect(highlight("Written in C++.", ["cpp"]).find((s) => s.hit)?.text).toBe("C++");
    expect(highlight("Replayed 50,000 queries.", ["50000"]).find((s) => s.hit)?.text).toBe("50,000");
  });

  it("returns short text whole and starts long text at the densest matching sentence", () => {
    expect(snippet("Short.", ["x"])).toBe("Short.");
    const long = `One needle early. ${"Filler sentence about nothing. ".repeat(10)}The needle sits in a haystack here. More after it.`;
    const s = snippet(long, ["needl", "haystack"]);
    expect(s.startsWith("… The needle sits in a haystack here.")).toBe(true);
    expect(s.length).toBeLessThan(260);
  });
});
