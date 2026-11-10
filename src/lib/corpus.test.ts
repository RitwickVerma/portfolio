import { describe, it, expect } from "vitest";
import { buildCorpus, workRoles, WORK_HEADLINES, STARTING_POINTS, EXAMPLE_QUERIES, projectAnchor } from "./corpus";
import { buildIndex, search } from "./search";
import { resume } from "./resume";
import { projects, services, experiences } from "./data";
import { notes } from "./notes";
import { noteText, noteHeadings, plainText } from "./notes.server";
import { slugify } from "./slug";

const noteTexts = notes.map((n) => noteText(n.slug));
const corpus = buildCorpus(noteTexts);
const record = buildCorpus();
const index = buildIndex(corpus);
const top = (q: string, n = 3) => search(index, `${q} `).hits.slice(0, n).map((h) => h.doc.id);

describe("search corpus", () => {
  it("has a headline for every resume bullet, and no spare ones", () => {
    // lib/resume.ts is generated. If its bullets change, rewrite WORK_HEADLINES to match.
    expect(WORK_HEADLINES.map((h) => h.length)).toEqual(resume.roles.map((r) => r.bullets.length));
    for (const r of workRoles) for (const i of r.items) expect(i.headline.length, i.id).toBeGreaterThan(10);
  });

  it("takes the current role's period from lib/data, so Present ends when the role does", () => {
    expect(workRoles[0].period).toBe(experiences[0].period);
  });

  it("indexes every bullet, project, note and guest exactly once", () => {
    const ids = corpus.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((i) => i.startsWith("work-"))).toHaveLength(resume.roles.reduce((n, r) => n + r.bullets.length, 0));
    expect(ids.filter((i) => i.startsWith("project-"))).toHaveLength(projects.length);
    expect(record.map((d) => d.id).filter((i) => i.startsWith("note-"))).toHaveLength(notes.length);
    expect(ids.filter((i) => i.startsWith("lab-"))).toHaveLength(services.length);
  });

  it("every result links somewhere on this site", () => {
    for (const d of corpus) expect(d.href, d.id).toMatch(/^\/(#[a-z0-9-]+|notes\/[a-z0-9-]+\/(#[a-z0-9-]+)?|resume\/)$/);
    for (const p of projects) expect(corpus.find((d) => d.id === `project-${p.slug}`)!.href).toBe(`/#${projectAnchor(p.slug)}`);
  });

  it("with the note bodies, every section is a document that links to its own heading", () => {
    const sections = noteTexts.flatMap((n) => n.sections.map((sec) => ({ n, sec })));
    expect(sections.length).toBeGreaterThan(20);
    expect(corpus.length).toBe(record.length + sections.length);
    for (const { n, sec } of sections) {
      const d = corpus.find((x) => x.id === `note-${n.slug}--${sec.id}`)!;
      expect(d.href).toBe(`/notes/${n.slug}/#${sec.id}`);
      expect(d.text.length, d.id).toBeGreaterThan(100);
      // The anchor the index links to is one the page renders.
      expect(noteHeadings(n.slug).map((h) => h.id)).toContain(sec.id);
    }
  });

  it("section ids are unique within a note", () => {
    for (const n of noteTexts) {
      const ids = noteHeadings(n.slug).map((h) => h.id);
      expect(new Set(ids).size, n.slug).toBe(ids.length);
    }
  });

  it("indexes prose, not markup", () => {
    expect(plainText("## A `code` [link](https://x.y) and **bold**\n\n```sh\nrm -rf\n```\n| a | b |\n|---|---|\n")).toBe("A code link and bold a b");
    for (const d of corpus) expect(d.text, d.id).not.toMatch(/```|\]\(|<span|^#/);
    expect(slugify("Colour: the plane is PQ, the LEDs are not")).toBe("colour-the-plane-is-pq-the-leds-are-not");
  });

  it("the colophon ranks under the work it describes", () => {
    const hits = search(index, "ranking ").hits.map((h) => h.doc.id);
    expect(hits[0]).not.toMatch(/^note-colophon/);
  });

  it("the starting points exist and every example query returns results", () => {
    for (const id of STARTING_POINTS) expect(corpus.some((d) => d.id === id), id).toBe(true);
    for (const q of EXAMPLE_QUERIES) expect(search(index, q).hits.length, q).toBeGreaterThan(0);
  });
});

// Relevance: the queries a hiring manager is likely to type, and what must come back first.
describe("relevance", () => {
  it("fitment leads with the eBay record", () => {
    for (const id of top("fitment", 3)) expect(id).toMatch(/^work-/);
    expect(top("fitment", 1)).toEqual(["work-0-0"]);
  });

  it("the replay bullet answers 'replay' and '50,000'", () => {
    expect(top("replay", 1)).toEqual(["work-0-2"]);
    expect(top("50,000", 1)).toEqual(["work-0-2"]);
  });

  it("testing leads with work, not with the skills list", () => {
    for (const id of top("testing", 3)) expect(id).toMatch(/^(work|project)-/);
  });

  it("caching finds the per-request cache first", () => {
    expect(top("caching", 1)).toEqual(["work-0-3"]);
  });

  it("C++ leads with the eBay engine, then the hand-written C++ project", () => {
    expect(top("c++", 1)[0]).toMatch(/^work-/);
    expect(top("c++", 12)).toContain("project-rpg-engine");
  });

  it("'reverse engineering' is not answered by the job title 'Software Engineer'", () => {
    for (const id of top("reverse engineering", 4)) expect(id).not.toMatch(/^work-/);
  });

  it("C++ returns the eBay work and the RPG engine, never the C# project alone", () => {
    const hits = search(index, "c++ ").hits.map((h) => h.doc.id);
    expect(hits).toContain("project-rpg-engine");
    expect(hits).toContain("skills-languages");
    expect(hits.filter((i) => i.startsWith("work-")).length).toBeGreaterThan(5);
    expect(hits).not.toContain("project-tizen-ambilight");
  });

  it("reverse engineering finds the keyboard and the TV", () => {
    const hits = top("reverse engineering", 5);
    expect(hits).toContain("note-crush80-open-firmware");
    expect(hits).toContain("note-tizen-video-plane-ambilight");
  });

  it("android finds ShutUp and the Android internship", () => {
    const hits = top("android", 6);
    expect(hits).toContain("project-shutup");
    expect(hits).toContain("earlier-0");
  });

  it("a rewrite reaches the lab: 'infra' finds the homelab", () => {
    expect(top("infra", 4)).toContain("project-homelab");
  });

  it("a section of a note answers a question the summaries cannot", () => {
    expect(top("paging", 1)).toEqual(["note-homelab-git-is-the-truth--paging-without-noise"]);
    expect(top('"tone-mapped"', 3).some((id) => id.includes("tizen"))).toBe(true);
  });

  it("resume and contact are findable", () => {
    expect(top("resume", 1)).toEqual(["page-resume"]);
    expect(top("email", 1)).toEqual(["page-contact"]);
  });
});
