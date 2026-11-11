import { describe, it, expect } from "vitest";
import { buildCorpus } from "./corpus";
import { notes } from "./notes";
import { noteText } from "./notes.server";
import { buildIndex, stem, type SearchDoc } from "./search";
import { applyCompletion, completions, MAX_COMPLETIONS } from "./complete";

const doc = (id: string, title: string, text: string, keywords: string[] = []): SearchDoc => ({ id, kind: "Project", title, context: "", text, keywords, href: "/" });

// df: alpha 4 docs, alpine 3, alpenglow 1, alphabet 2. "queries" is the commoner form of the stem "queri".
const tiny = buildIndex([
  doc("1", "alpha", "alpha alpine alphabet queries"),
  doc("2", "alpha", "alpha alpine alphabet queries query"),
  doc("3", "alpha", "alpha alpine the alpenglow alps"),
  doc("4", "alpha", "alpha"),
  doc("5", "other", "queries query queries", ["C++"]),
]);

describe("completions", () => {
  it("offers the index's words that extend the last word, commonest document frequency first", () => {
    expect(completions(tiny, "alp").map((c) => c.word)).toEqual(["alpha", "alpine", "alphabet", "alpenglow"]);
    expect(completions(tiny, "alp").map((c) => c.df)).toEqual([4, 3, 2, 1]);
  });

  it("shows the commonest surface form of a stem, not the stem", () => {
    // The term is "queri"; the corpus says "queries" three times and "query" twice.
    expect(stem("queries")).toBe("queri");
    expect(tiny.forms.get("queri")).toEqual(["queries", "query"]);
    expect(completions(tiny, "quer").map((c) => c.word)).toEqual(["queries"]);
    // "alps" and "alp" share the typed word's own term, so they are not offered as additions.
    expect(completions(tiny, "alp").map((c) => c.word)).not.toContain("alps");
  });

  it("excludes the typed term itself and a completion equal to what was typed", () => {
    expect(completions(tiny, "alpha").map((c) => c.word)).toEqual(["alphabet"]);
    expect(completions(tiny, "alphabet")).toEqual([]);
    // "queri" is the typed word's own term: nothing to add.
    expect(completions(tiny, "queries")).toEqual([]);
  });

  it("is silent when the last word is not growing", () => {
    expect(completions(tiny, "alp ")).toEqual([]);
    expect(completions(tiny, '"alp')).toEqual([]);
    expect(completions(tiny, "kind:alp")).toEqual([]);
    expect(completions(tiny, "-alp")).toEqual([]);
    expect(completions(tiny, "")).toEqual([]);
  });

  it("needs two letters and ignores numbers", () => {
    expect(completions(tiny, "a")).toEqual([]);
    expect(completions(tiny, "al").length).toBeGreaterThan(0);
    expect(completions(tiny, "50")).toEqual([]);
  });

  it("completes only the last word of a longer query", () => {
    expect(completions(tiny, "queries alp").map((c) => c.word)).toEqual(["alpha", "alpine", "alphabet", "alpenglow"]);
  });

  it("offers C++ as typed, not as the term cpp", () => {
    expect(completions(tiny, "cp").map((c) => c.word)).toEqual(["C++"]);
  });

  it("never offers more than five, and never a stopword", () => {
    const many = buildIndex([doc("m", "m", "bat bath batik batch bateau batman batter batwing")]);
    expect(completions(many, "bat")).toHaveLength(MAX_COMPLETIONS);
    expect(completions(many, "bat", 2)).toHaveLength(2);
    // "the" and "then" are stopwords: they are not in the index, so "th" cannot complete to them.
    const stop = buildIndex([doc("s", "s", "the then thesis")]);
    expect(completions(stop, "th").map((c) => c.word)).toEqual(["thesis"]);
  });
});

describe("applyCompletion", () => {
  it("replaces the last word and ends it with a space", () => {
    expect(applyCompletion("fitm", "fitment")).toBe("fitment ");
    expect(applyCompletion("reverse eng", "engineering")).toBe("reverse engineering ");
    expect(applyCompletion("kind:note hdr", "hdr")).toBe("kind:note hdr ");
  });

  it("keeps punctuation before the word", () => {
    expect(applyCompletion("a/b tes", "testing")).toBe("a/b testing ");
    expect(applyCompletion("-plutus rep", "replay")).toBe("-plutus replay ");
  });
});

describe("completions over the real corpus", () => {
  const index = buildIndex(buildCorpus(notes.map((n) => noteText(n.slug))));

  it("\"fitm\" offers fitment, as the word, first", () => {
    expect(completions(index, "fitm")[0].word).toBe("fitment");
  });

  it("every completion extends what was typed and stands for a term that is in the index", () => {
    for (const q of ["te", "re", "pro", "con", "fi", "ba", "sea", "rev eng", "kot"]) {
      for (const c of completions(index, q)) {
        const typed = q.split(" ").pop()!;
        expect(c.word.toLowerCase().startsWith(typed) || c.term.startsWith(typed), `${q} -> ${c.word}`).toBe(true);
        expect(index.postings.has(c.term), c.term).toBe(true);
        expect(c.df).toBe(index.postings.get(c.term)!.size);
      }
    }
  });

  it("is ordered by document frequency for every prefix of every indexed word", () => {
    for (const term of index.terms.filter((t) => /^[a-z]{5,}$/.test(t)).slice(0, 300)) {
      for (let n = 2; n < term.length; n++) {
        const dfs = completions(index, term.slice(0, n)).map((c) => c.df);
        expect(dfs, term.slice(0, n)).toEqual([...dfs].sort((a, b) => b - a));
      }
    }
  });
});
