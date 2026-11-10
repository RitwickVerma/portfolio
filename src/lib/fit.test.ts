import { describe, it, expect } from "vitest";
import { buildCorpus } from "./corpus";
import { notes } from "./notes";
import { noteText } from "./notes.server";
import { buildIndex } from "./search";
import { extractSkills, checkSkill, fitReport, yearsAsked, SAMPLE_JD } from "./fit";
import { LEXICON, NEAREST_ON_SITE } from "./lexicon";
import { YEARS_AT_EBAY, hero } from "./data";
import { resume } from "./resume";

const index = buildIndex(buildCorpus(notes.map((n) => noteText(n.slug))));
const status = (label: string) => checkSkill(index, label).status;

describe("extractSkills", () => {
  it("finds skills in the order the text names them, once each", () => {
    expect(extractSkills("We use Python and Kafka. Python again, then C++.")).toEqual(["Python", "Kafka", "C++"]);
  });

  it("prefers the longest phrase: 'search engine' is not also 'search'", () => {
    expect(extractSkills("Build our search engine.")).toEqual(["search engine"]);
  });

  it("resolves aliases to one label", () => {
    expect(extractSkills("k8s, Postgres, unit testing and CI/CD")).toEqual(["Kubernetes", "PostgreSQL", "unit tests", "CI/CD"]);
  });

  it("a phrase does not span a sentence break", () => {
    expect(extractSkills("We do search. Engine work is separate.")).toEqual(["search"]);
  });

  it("reads Go as a language only when it is written as one", () => {
    expect(extractSkills("Services in Go, Rust or Java.")).toContain("Go");
    expect(extractSkills("You go above and beyond. Go to market fast.")).not.toContain("Go");
  });

  it("ignores ordinary words", () => {
    expect(extractSkills("We value a strong team with great communication and passion.")).toEqual([]);
  });

  it("does not read verbs as skills: own and lead are not ownership and leadership", () => {
    expect(extractSkills("You will own our own tools, and lead time is short.")).toEqual([]);
    expect(extractSkills("We expect ownership and leadership.")).toEqual(["ownership", "leadership"]);
  });

  it("reads C as a language only beside another language or spelt out", () => {
    for (const text of ["We raised a Series C, and are hiring.", "A grade of C or better.", "Vitamin C and D."]) {
      expect(extractSkills(text), text).not.toContain("C");
    }
    for (const text of ["Firmware in C and C++.", "Python, C, or Rust.", "Strong C programming.", "Embedded C on ARM."]) {
      expect(extractSkills(text), text).toContain("C");
    }
    expect(extractSkills("C++ only.")).toEqual(["C++"]);
  });
});

describe("checkSkill", () => {
  it("is direct for what the record states in those words", () => {
    for (const s of ["C++", "caching", "A/B testing", "distributed systems", "Android", "query understanding", "reverse engineering", "unit tests"]) {
      expect(status(s), s).toBe("direct");
    }
  });

  it("is adjacent, and names the stand-in, when only a neighbour is on the site", () => {
    const tf = checkSkill(index, "Terraform");
    expect(tf.status).toBe("adjacent");
    expect(tf.via).toContain("opentofu");
    // The stand-in is named as a word, not as a stem.
    expect(checkSkill(index, "debugging").via).toContain("cause");
    expect(checkSkill(index, "CI/CD")).toMatchObject({ status: "adjacent", via: ["CI"] });
  });

  it("is missing for what I have not done, however common the skill", () => {
    for (const s of ["Kubernetes", "Kafka", "Rust", "React", "machine learning", "Elasticsearch", "gRPC"]) {
      expect(status(s), s).toBe("missing");
    }
  });

  it("a multi-word skill needs the phrase: a library management system is not distributed systems", () => {
    const hit = checkSkill(index, "distributed systems");
    for (const e of hit.evidence) expect(e.doc.id).not.toBe("earlier-2");
  });

  it("cites only the record: never a note, a lab guest's own stack or a page", () => {
    for (const label of LEXICON) {
      for (const e of checkSkill(index, label).evidence) expect(e.doc.id, label).not.toMatch(/^(note-|lab-|page-)/);
    }
  });

  it("the lexicon is wider than the record: most of it is missing", () => {
    const missing = LEXICON.filter((l) => status(l) === "missing").length;
    expect(missing / LEXICON.length).toBeGreaterThan(0.5);
    for (const label of Object.keys(NEAREST_ON_SITE)) expect(LEXICON, label).toContain(label);
  });
});

describe("fitReport", () => {
  const report = fitReport(index, SAMPLE_JD, YEARS_AT_EBAY);

  it("covers the sample posting honestly: hits, near hits and gaps", () => {
    expect(report.counts.direct).toBeGreaterThan(10);
    expect(report.counts.missing).toBeGreaterThan(3);
    expect(report.counts.direct + report.counts.adjacent + report.counts.missing).toBe(report.terms.length);
    const by = Object.fromEntries(report.terms.map((t) => [t.label, t.status]));
    expect(by["C++"]).toBe("direct");
    expect(by["Kubernetes"]).toBe("missing");
    expect(by["Elasticsearch"]).toBe("missing");
  });

  it("reads the years asked for and states the years I have", () => {
    expect(report.years).toEqual({ asked: 5, have: 5.5 });
    expect(fitReport(index, "No number here.", 5.5).years).toBeUndefined();
  });

  it("only reads years that are tied to experience", () => {
    expect(yearsAsked("Must be 18 years or older. 5+ years of C++ experience.")).toBe(5);
    expect(yearsAsked("Founded 12 years ago. We want at least 3 years in backend roles.")).toBe(3);
    expect(yearsAsked("7 years' professional software engineering experience")).toBe(7);
    expect(yearsAsked("Experience: 4+ years")).toBe(4);
    expect(yearsAsked("Must be 18 years or older.")).toBeNull();
    expect(yearsAsked("Our company is 20 years old and growing.")).toBeNull();
    expect(yearsAsked("A minimum of 21 years of age.")).toBeNull();
  });

  it("the years figure is the one the hero line and the resume state", () => {
    expect(hero.line).toContain(`${YEARS_AT_EBAY} years`);
    expect(resume.summary).toContain(`${YEARS_AT_EBAY} years`);
  });

  it("an empty text is an empty report", () => {
    expect(fitReport(index, "", 5.5)).toEqual({ terms: [], counts: { direct: 0, adjacent: 0, missing: 0 } });
  });
});
