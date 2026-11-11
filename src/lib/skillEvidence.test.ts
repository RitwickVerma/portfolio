import { describe, it, expect } from "vitest";
import { buildCorpus } from "./corpus";
import { skills } from "./data";
import { notes } from "./notes";
import { noteText } from "./notes.server";
import { buildIndex, search, type SearchDoc } from "./search";
import { countSkill, skillEvidence, skillHref } from "./skillEvidence";

const doc = (over: Partial<SearchDoc>): SearchDoc => ({ id: "d", kind: "Project", title: "", context: "", text: "", href: "/", ...over });

describe("skill counts over synthetic documents", () => {
  const index = buildIndex([
    doc({ id: "a", text: "A request cache keeps lookups." }),
    doc({ id: "b", text: "A request." }),
    doc({ id: "c", text: "Wrote C++ allocators." }),
  ]);

  it("is the number of hits the search gives, and the ids are those hits in rank order", () => {
    const r = countSkill("request cache", index);
    expect(r.count).toBe(search(index, "request cache").hits.length);
    expect(r.ids).toEqual(search(index, "request cache").hits.map((h) => h.doc.id));
    expect(r.ids[0]).toBe("a");
    expect(r.count).toBe(r.ids.length);
  });

  it("a skill nothing matches counts zero", () => {
    expect(countSkill("kubernetes", index)).toEqual({ skill: "kubernetes", count: 0, ids: [] });
  });

  it("reads C++ whole, the way the search box does", () => {
    expect(countSkill("C++", index).ids).toEqual(["c"]);
  });

  it("links to the real search", () => {
    expect(skillHref("C++")).toBe("/?q=C%2B%2B");
    expect(skillHref("Search & retrieval")).toBe("/?q=Search%20%26%20retrieval");
  });
});

describe("skill counts over the real index", () => {
  // The index the site builds once the notes' full text is in: what /search-index.json carries.
  const index = buildIndex(buildCorpus(notes.map((n) => noteText(n.slug))));
  const groups = [
    { label: "Languages I write myself", items: skills.languages },
    { label: "Domains", items: skills.domains },
    { label: "Tools and platforms", items: skills.tools },
  ];
  const result = skillEvidence(groups, index);
  const all = result.groups.flatMap((g) => g.skills);

  it("covers every skill in the data file, most results first, ties in the data file's order", () => {
    expect(result.groups.map((g) => [...g.skills.map((s) => s.skill)].sort())).toEqual(groups.map((g) => [...g.items].sort()));
    for (const [gi, g] of result.groups.entries()) {
      for (let i = 1; i < g.skills.length; i++) {
        const a = g.skills[i - 1], b = g.skills[i];
        expect(a.count).toBeGreaterThanOrEqual(b.count);
        if (a.count === b.count) expect(groups[gi].items.indexOf(a.skill)).toBeLessThan(groups[gi].items.indexOf(b.skill));
      }
    }
  });

  it("reports the documents of the whole index", () => {
    expect(result.documents).toBe(index.docs.length);
    expect(result.documents).toBeGreaterThan(buildCorpus().length);
  });

  it("every chip's number is exactly the length of the result list its link opens", () => {
    for (const s of all) {
      const hits = search(index, decodeURIComponent(skillHref(s.skill).slice("/?q=".length))).hits;
      expect(s.count, s.skill).toBe(hits.length);
      expect(s.ids, s.skill).toEqual(hits.map((h) => h.doc.id));
      expect(s.count).toBeLessThanOrEqual(result.documents);
    }
  });

  it("the skills the old literal count left at zero are now measured by the engine", () => {
    for (const name of ["Search & retrieval", "Query rewriting", "Distributed systems", "Traffic replay & A/B testing"]) {
      expect(all.find((s) => s.skill === name)!.count, name).toBeGreaterThan(0);
    }
  });

  it("a count is not the same as a literal mention: it is what the search returns", () => {
    expect(all.find((s) => s.skill === "Request caching")!.ids).toContain("work-0-3");
  });
});
