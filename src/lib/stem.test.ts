import { describe, it, expect } from "vitest";
import { buildCorpus } from "./corpus";
import { notes } from "./notes";
import { noteText } from "./notes.server";
import { fold, highlight, stem, tokenize } from "./search";

const corpus = buildCorpus(notes.map((n) => noteText(n.slug)));

describe("stem: Porter2 (Snowball English)", () => {
  // From Snowball's published sample vocabulary.
  it.each([
    ["consign", "consign"], ["consigned", "consign"], ["consigning", "consign"], ["consignment", "consign"],
    ["consistency", "consist"], ["consistently", "consist"], ["consolation", "consol"], ["consolatory", "consolatori"],
    ["consolidate", "consolid"], ["conspicuously", "conspicu"], ["conspiracy", "conspiraci"], ["conspirators", "conspir"],
    ["constable", "constabl"], ["constancy", "constanc"], ["knightly", "knight"], ["knives", "knive"], ["kneeled", "kneel"],
    ["generate", "generat"], ["generates", "generat"], ["general", "general"], ["generously", "generous"], ["communism", "communism"],
    ["arsenal", "arsenal"], ["hopping", "hop"], ["hoping", "hope"], ["hopped", "hop"], ["cries", "cri"], ["ties", "tie"],
    ["skies", "sky"], ["dying", "die"], ["proceed", "proceed"], ["exceeding", "exceed"], ["agreed", "agre"], ["feed", "feed"],
    ["sky", "sky"], ["news", "news"], ["bias", "bias"], ["gas", "gas"], ["this", "this"], ["by", "by"], ["say", "say"], ["cry", "cri"],
    ["happy", "happi"], ["relational", "relat"], ["conditional", "condit"], ["rational", "ration"], ["valenci", "valenc"],
    ["digitizer", "digit"], ["operator", "oper"], ["feudalism", "feudal"], ["decisiveness", "decis"], ["hopefulness", "hope"],
    ["callousness", "callous"], ["formaliti", "formal"], ["sensitiviti", "sensit"], ["sensibiliti", "sensibl"],
    ["triplicate", "triplic"], ["formative", "format"], ["formalize", "formal"], ["electricity", "electr"], ["electrical", "electr"],
    ["adoption", "adopt"], ["activate", "activ"], ["effective", "effect"], ["probate", "probat"], ["rate", "rate"], ["cease", "ceas"],
    ["controll", "control"], ["roll", "roll"],
  ])("%s -> %s", (word, expected) => expect(stem(word)).toBe(expected));

  it("leaves numbers, tokens with digits and the punctuation literals alone", () => {
    for (const w of ["2022", "50000", "2d", "k8s", "ct101", "sha256", "cpp", "csharp", "dotnet", "zmk", "ai", "tv"]) expect(stem(w)).toBe(w);
  });

  it("is idempotent enough that a stem searched for finds itself", () => {
    // A visitor who types what the plan chips show (\"cach\", \"queri\") must land on the same term.
    for (const w of ["cach", "queri", "test", "replay", "rewrit", "allocat"]) expect(stem(stem(w))).toBe(stem(w));
  });
});

describe("stem: the pairs this site's earlier stemmers got wrong", () => {
  it("note is not not, and page is not paging", () => {
    expect(stem("note")).not.toBe(stem("not"));
    expect(stem("notes")).toBe(stem("note"));
    expect(stem("page")).not.toBe(stem("paging"));
    expect(stem("pages")).toBe(stem("page"));
  });

  it("settings meets setting, findings meets finding, released meets release", () => {
    for (const [a, b] of [["settings", "setting"], ["findings", "finding"], ["released", "release"], ["closed", "close"], ["cached", "cache"], ["queries", "query"], ["tuning", "tune"], ["biased", "bias"], ["timings", "timing"], ["readings", "reading"]]) {
      expect(stem(a), `${a} / ${b}`).toBe(stem(b));
    }
  });

  it("words that Porter2 would merge but that are different words stay apart", () => {
    for (const [a, b] of [["engine", "engineer"], ["engine", "engineering"], ["intern", "internal"], ["universe", "university"], ["position", "positive"], ["product", "production"], ["access", "accessibility"], ["spy", "spi"], ["mode", "model"], ["plan", "plane"], ["new", "news"], ["system", "systemd"]]) {
      expect(stem(a), `${a} / ${b}`).not.toBe(stem(b));
    }
  });

  it("the pinned words keep their regular inflections together", () => {
    expect(stem("engineers")).toBe(stem("engineering"));
    expect(stem("engineered")).toBe(stem("engineer"));
    expect(stem("universities")).toBe(stem("university"));
    expect(stem("internals")).toBe(stem("internal"));
    expect(stem("added")).toBe(stem("add"));
    expect(stem("adding")).toBe(stem("add"));
    expect(stem("tvs")).toBe(stem("tv"));
    expect(stem("built")).toBe(stem("build"));
    expect(stem("does")).toBe(stem("do"));
  });
});

describe("highlight and the stemmer agree over the whole corpus", () => {
  it("every term the index holds highlights a word on the page it came from", () => {
    // highlight() stems each page word with stem(), so a stem the algorithm produces must be found again
    // in the words it came from. Checked per term, against the first field that holds it.
    const missing: string[] = [];
    const proven = new Set<string>();
    const seen = new Set<string>();
    for (const doc of corpus) {
      for (const field of [doc.title, ...(doc.keywords ?? []), doc.text]) {
        for (const term of new Set(tokenize(field))) {
          if (proven.has(term)) continue;
          if (highlight(field, [term]).some((s) => s.hit)) proven.add(term);
          else seen.add(term);
        }
      }
    }
    for (const t of seen) if (!proven.has(t)) missing.push(t);
    expect(missing).toEqual([]);
    expect(proven.size).toBeGreaterThan(1000);
  }, 60_000); // every term against every page word: 5.9 s on the shared CI runner, over vitest's 5 s default

  it("highlight marks every inflection of a Porter2 stem and nothing that merely shares letters", () => {
    const segs = highlight("Tuning the tune; a tuner. Notes, not a note: paging pages.", [stem("tune")]);
    expect(segs.filter((s) => s.hit).map((s) => s.text)).toEqual(["Tuning", "tune"]);
    const notes2 = highlight("Notes, not a note.", [stem("note")]);
    expect(notes2.filter((s) => s.hit).map((s) => s.text)).toEqual(["Notes", "note"]);
  });

  it("folds accents before stemming, as the tokenizer does", () => {
    expect(fold("résumés")).toBe("resumes");
    expect(tokenize("résumés")).toEqual(tokenize("resume"));
  });
});
