import { describe, expect, it } from "vitest";
import { buildIndex, tokenize, type SearchDoc } from "./search";
import { buildCorpus } from "./corpus";
import { notes } from "./notes";
import { noteText } from "./notes.server";
import {
  leaveOneOut, MAX_QUERY_CHARS, MAX_ROWS, MIN_ROWS, MIN_SCORE, noteDocIds, parentKey, relatedToNote, RELATED_KINDS, similar, TERMS_USED, topTerms,
} from "./similar";

const doc = (id: string, kind: SearchDoc["kind"], title: string, text: string, keywords?: string[]): SearchDoc => ({
  id, kind, title, context: "", text, keywords, href: `/${id}`,
});

// A small site: note a (two documents), note b (two), a project, a work row and a skills list.
const small = buildIndex([
  doc("note-a", "Note", "Shipping a ranker", "The ranker scores every document with a tokenizer and a posting list.", ["search", "ranking"]),
  doc("note-a--scoring", "Note", "Scoring", "Each posting list gives a score; the ranker adds the scores of the query terms."),
  doc("note-a--tokenizer", "Note", "The tokenizer", "The tokenizer splits text, folds accents and stems each word before the posting list sees it."),
  doc("note-b", "Note", "A tokenizer for chords", "A tokenizer that splits a chord chart into rows before the aligner sees it."),
  doc("note-b--rows", "Note", "Rows", "Each row of a chord chart is split by the tokenizer and aligned."),
  doc("project-x", "Project", "Search engine", "A ranker with a tokenizer, a posting list and scores for every document.", ["search"]),
  doc("work-0-0", "eBay", "Query ranking", "Changed how the ranker scores a document in the posting list.", ["search"]),
  doc("skills-tools", "Skills", "Tools", "Ranker, tokenizer, posting list, score, document."),
  doc("lab-ct1", "Homelab", "Backups", "Nightly backups of every guest, kept for a week."),
]);

const site = buildIndex(buildCorpus(notes.map((n) => noteText(n.slug))));
const slugs = notes.map((n) => n.slug);

describe("similar: the query", () => {
  it("is the source's heaviest terms by tf x idf, heaviest first, ties alphabetically", () => {
    const terms = topTerms(small, { docIds: ["note-a--scoring"] }, 5, 1000);
    expect(terms.length).toBeGreaterThan(0);
    for (let i = 1; i < terms.length; i++) {
      expect(terms[i - 1].weight).toBeGreaterThanOrEqual(terms[i].weight);
      if (terms[i - 1].weight === terms[i].weight) expect(terms[i - 1].term < terms[i].term).toBe(true);
    }
  });

  it("skips a term no other document holds, and a number", () => {
    const index = buildIndex([
      doc("note-a", "Note", "Alpha", "zyzzyva zyzzyva zyzzyva 2026 2026 ranker ranker"),
      doc("note-b", "Note", "Beta", "ranker everywhere"),
    ]);
    const words = topTerms(index, { docIds: ["note-a"] }, 12, 1000).map((t) => t.word);
    expect(words).toContain("ranker");
    expect(words).not.toContain("zyzzyva"); // only the source has it
    expect(words).not.toContain("2026");
  });

  it("is made of words a reader recognises, and the engine reads them back as the same stems", () => {
    for (const slug of slugs) {
      const r = similar(site, { docIds: noteDocIds(site, slug) });
      expect(r.terms.length).toBeGreaterThan(0);
      expect(tokenize(r.query)).toEqual(r.terms.map((t) => t.term));
      for (const t of r.terms) expect(site.forms.get(t.term)).toContain(t.word);
    }
  });

  it("never runs past the hero box's 120 characters, dropping the lightest terms first", () => {
    for (const slug of slugs) {
      const r = similar(site, { docIds: noteDocIds(site, slug) }, { terms: 40 });
      expect(r.query.length).toBeLessThanOrEqual(MAX_QUERY_CHARS);
    }
    const short = similar(site, { docIds: noteDocIds(site, slugs[0]) }, { terms: 40, maxChars: 30 });
    const all = similar(site, { docIds: noteDocIds(site, slugs[0]) }, { terms: 40 });
    expect(short.query.length).toBeLessThanOrEqual(30);
    expect(all.query.startsWith(short.query)).toBe(true);
  });

  it("can start from free text", () => {
    const r = similar(small, { text: "a tokenizer and a posting list" });
    expect(r.hits.length).toBeGreaterThan(0);
    expect(r.terms.map((t) => t.term)).toContain(tokenize("tokenizer")[0]);
  });
});

describe("similar: the result", () => {
  it("is deterministic: the same input, the same output, from a fresh index too", () => {
    const again = buildIndex(buildCorpus(notes.map((n) => noteText(n.slug))));
    for (const slug of slugs) {
      const a = similar(site, { docIds: noteDocIds(site, slug) });
      expect(similar(site, { docIds: noteDocIds(site, slug) })).toEqual(a);
      const b = similar(again, { docIds: noteDocIds(again, slug) });
      expect(b.query).toBe(a.query);
      expect(b.hits.map((h) => [h.doc.id, h.score])).toEqual(a.hits.map((h) => [h.doc.id, h.score]));
    }
  });

  it("leaves out the source note's own sections, and every other document of it", () => {
    const r = similar(small, { docIds: ["note-a", "note-a--scoring", "note-a--tokenizer"] }, { limit: 10 });
    expect(r.hits.length).toBeGreaterThan(0);
    for (const h of r.hits) expect(h.doc.id.startsWith("note-a")).toBe(false);
    for (const slug of slugs) {
      const own = noteDocIds(site, slug);
      expect(own.length).toBeGreaterThan(1);
      const real = similar(site, { docIds: own }, { limit: 50, onePerNote: false });
      for (const h of real.hits) expect(own).not.toContain(h.doc.id);
    }
  });

  it("when the source is one document, only that document is dropped (its sisters may rank: the leave-one-out check)", () => {
    const r = similar(small, { docIds: ["note-a--scoring"] }, { limit: 10, onePerNote: false });
    expect(r.hits.map((h) => h.doc.id)).not.toContain("note-a--scoring");
    expect(r.hits.map((h) => h.doc.id)).toContain("note-a");
  });

  it("returns only notes, projects and work, at most `limit`, best first, one per note", () => {
    const r = similar(small, { docIds: ["note-b", "note-b--rows"] }, { limit: 10 });
    for (const h of r.hits) expect(RELATED_KINDS).toContain(h.doc.kind);
    expect(r.hits.map((h) => h.doc.id)).not.toContain("skills-tools");
    expect(r.hits.map((h) => h.doc.id)).not.toContain("lab-ct1");
    for (let i = 1; i < r.hits.length; i++) expect(r.hits[i - 1].score).toBeGreaterThanOrEqual(r.hits[i].score);
    const keys = r.hits.map((h) => parentKey(h.doc));
    expect(new Set(keys).size).toBe(keys.length);

    expect(similar(small, { docIds: ["note-b"] }, { limit: 2 }).hits).toHaveLength(2);
    expect(similar(small, { docIds: ["note-b"] }, { limit: 1 }).hits).toHaveLength(1);
    for (const slug of slugs) {
      expect(similar(site, { docIds: noteDocIds(site, slug) }).hits.length).toBeLessThanOrEqual(MAX_ROWS);
    }
  });

  it("honours `exclude`", () => {
    const base = similar(small, { docIds: ["note-b"] }, { limit: 10 });
    expect(base.hits.map((h) => h.doc.id)).toContain("project-x");
    const r = similar(small, { docIds: ["note-b"] }, { limit: 10, exclude: (d) => d.kind === "Project" });
    expect(r.hits.map((h) => h.doc.id)).not.toContain("project-x");
  });

  it("carries the score the search box gives the same query, and the terms that matched", () => {
    const r = similar(site, { docIds: noteDocIds(site, slugs[0]) });
    expect(r.hits.length).toBeGreaterThan(0);
    for (const h of r.hits) {
      expect(h.score).toBeGreaterThan(0);
      expect(h.matched.length).toBeGreaterThan(0);
      expect(h.hit.score).toBe(h.score);
    }
  });
});

describe("relatedToNote: the threshold", () => {
  it("lists only rows that clear MIN_SCORE, 2 to 4 of them, or nothing", () => {
    for (const slug of slugs) {
      const clearing = similar(site, { docIds: noteDocIds(site, slug) }, { limit: 50 }).hits.filter((h) => h.score >= MIN_SCORE);
      const r = relatedToNote(site, slug);
      if (clearing.length < MIN_ROWS) {
        expect(r).toBeNull();
      } else {
        expect(r).not.toBeNull();
        expect(r!.hits.length).toBe(Math.min(MAX_ROWS, clearing.length));
        for (const h of r!.hits) expect(h.score).toBeGreaterThanOrEqual(MIN_SCORE);
      }
    }
  });

  it("is null when only one row clears the line, and appears when two do", () => {
    const scores = similar(small, { docIds: noteDocIds(small, "a") }, { limit: 10 }).hits.map((h) => h.score);
    expect(scores.length).toBeGreaterThanOrEqual(3);
    // A line just above the second row: one row clears it.
    expect(relatedToNote(small, "a", { minScore: scores[1] + 1e-9 })).toBeNull();
    // A line at the second row: two do.
    expect(relatedToNote(small, "a", { minScore: scores[1] })?.hits).toHaveLength(2);
    // A line above everything: none.
    expect(relatedToNote(small, "a", { minScore: scores[0] + 1 })).toBeNull();
  });

  it("is null for a slug the index does not have", () => {
    expect(relatedToNote(small, "no-such-note")).toBeNull();
  });

  it("keeps MIN_SCORE where the measured scores say it belongs", () => {
    // The nearest rows are a project at 15+; the line sits well under those and over the vocabulary-only tail.
    expect(MIN_SCORE).toBeGreaterThan(4);
    expect(MIN_SCORE).toBeLessThan(10);
    expect(MIN_ROWS).toBe(2);
    expect(MAX_ROWS).toBe(4);
  });
});

describe("TERMS_USED: leave-one-out over the notes' own documents", () => {
  const candidates = [8, 12, 16];
  const table = candidates.map((n) => leaveOneOut(site, slugs, n));

  it("prints the table, and the chosen N is the best of 8, 12 and 16", () => {
    const row = (r: (typeof table)[number]) =>
      `N=${String(r.terms).padStart(2)}  sources=${r.sources}  P@1=${r.p1.toFixed(3)}  MRR=${r.mrr.toFixed(3)}  terms used=${r.used.toFixed(1)}`;
    console.log(`leave-one-out (each document of each note as the query, itself removed; hit = a document of the same note):\n${table.map(row).join("\n")}`);
    const best = [...table].sort((a, b) => b.p1 - a.p1 || b.mrr - a.mrr || a.terms - b.terms)[0];
    // If this fails after a note is added or rewritten: read the table above and move TERMS_USED to the winner.
    expect(TERMS_USED).toBe(best.terms);
  });

  it("counts every document of every note that has a sister", () => {
    for (const r of table) expect(r.sources).toBeGreaterThan(slugs.length);
  });

  it("a miss can fire: a query that finds none of its sisters scores zero", () => {
    const lone = buildIndex([doc("note-a", "Note", "Alpha", "ranker ranker"), doc("note-a--s", "Note", "S", "kettle kettle"), doc("note-b", "Note", "Beta", "ranker")]);
    const r = leaveOneOut(lone, ["a"], 8);
    expect(r.sources).toBe(2);
    // "ranker" finds note-b, not note-a--s; "kettle" has no other holder so it is skipped and the query is empty.
    expect(r.p1).toBe(0);
  });
});
