import { describe, it, expect } from "vitest";
import { notes, getNote, noteUrl, formatNoteDate, readingMinutes } from "./notes";
import { noteSlugsOnDisk, noteWordCount, noteSource } from "./notes.server";

describe("notes registry", () => {
  it("has unique, url-safe slugs", () => {
    const slugs = notes.map((n) => n.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/);
  });

  it("matches the MDX files on disk, both ways", () => {
    expect([...notes.map((n) => n.slug)].sort()).toEqual(noteSlugsOnDisk());
  });

  it("is ordered newest first with ISO dates", () => {
    for (const n of notes) expect(n.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const n of notes) if (n.updated) expect(n.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const n of notes) if (n.updated) expect(n.updated > n.date, n.slug).toBe(true);
    const dates = notes.map((n) => n.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it("every note has a title, a summary that fits a social card, and tags", () => {
    for (const n of notes) {
      expect(n.title.length, n.slug).toBeGreaterThan(10);
      expect(n.title.length, n.slug).toBeLessThanOrEqual(70);
      expect(n.summary.length, n.slug).toBeGreaterThan(40);
      // The summary is the meta description too: keep it under 160.
      expect(n.summary.length, n.slug).toBeLessThanOrEqual(160);
      expect(n.tags.length, n.slug).toBeGreaterThan(0);
    }
  });

  it("every note body is a real piece, not a stub, and has no leftover placeholders", () => {
    for (const n of notes) {
      expect(noteWordCount(n.slug), n.slug).toBeGreaterThan(300);
      expect(noteSource(n.slug), n.slug).not.toMatch(/TODO|TKTK|lorem ipsum/i);
    }
  });

  it("ships no private addresses in note bodies", () => {
    for (const n of notes) {
      expect(noteSource(n.slug), n.slug).not.toMatch(/\b(?:69\.69\.69|192\.168|10\.\d+)\.\d+/);
    }
  });

  it("helpers", () => {
    expect(getNote("colophon")?.title).toContain("site");
    expect(getNote("nope")).toBeUndefined();
    expect(noteUrl({ slug: "x" })).toBe("/notes/x/");
    expect(formatNoteDate("2026-10-13")).toBe("13 Oct 2026");
    expect(readingMinutes(0)).toBe(1);
    expect(readingMinutes(1000)).toBe(5);
  });
});
