import { describe, it, expect } from "vitest";
import { buildIndex, search, planQuery, tokenize, stem, highlight, snippet, type SearchDoc } from "./search";

const doc = (id: string, title: string, text: string, keywords: string[] = []): SearchDoc => ({
  id,
  kind: "Project",
  title,
  context: "",
  text,
  keywords,
  href: `/#${id}`,
});

const docs = [
  doc("cache", "A per-request cache", "Each repeated backend lookup runs only once. Failures are never cached."),
  doc("replay", "Traffic replay", "Replayed 50,000 production queries against old and new builds.", ["C++", "testing"]),
  doc("tv", "Ambilight", "A headless .NET service reads the video plane. Written in C#.", ["Tizen"]),
  doc("kbd", "Keyboard firmware", "ZMK on a RISC-V SoC, traced from PCB photos.", ["C", "Ghidra"]),
  doc("java", "Library system", "Built in Java EE with servlets."),
];
const index = buildIndex(docs);
const ids = (q: string) => search(index, q).hits.map((h) => h.doc.id);

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

describe("search", () => {
  it("finds a document by any inflection of its words", () => {
    expect(ids("caching ")).toEqual(["cache"]);
    expect(ids("replay ")).toEqual(["replay"]);
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
    expect(ids("jav ")).toEqual([]);
    const plan = planQuery(index, "rep");
    expect(plan.find((t) => t.term === "replay")).toMatchObject({ source: "prefix", from: "rep" });
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

  it("a prior lifts a document past an otherwise equal one", () => {
    const two = buildIndex([doc("plain", "Same", "same text"), { ...doc("lifted", "Same", "same text"), prior: 1.25 }]);
    const hits = search(two, "same ").hits;
    expect(hits.map((h) => h.doc.id)).toEqual(["lifted", "plain"]);
    expect(hits[0].score / hits[1].score).toBeCloseTo(1.25);
  });

  it("is deterministic: equal scores keep corpus order", () => {
    const same = buildIndex([doc("first", "Same", "same text"), doc("second", "Same", "same text")]);
    expect(search(same, "same ").hits.map((h) => h.doc.id)).toEqual(["first", "second"]);
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

  it("returns short text whole and starts long text at the first matching sentence", () => {
    expect(snippet("Short.", ["x"])).toBe("Short.");
    const long = `${"Filler sentence about nothing. ".repeat(10)}The needle is here. More after it.`;
    const s = snippet(long, ["needl"]);
    expect(s.startsWith("… The needle is here.")).toBe(true);
    expect(s.length).toBeLessThan(260);
  });
});
