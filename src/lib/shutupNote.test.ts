import { describe, it, expect } from "vitest";
import { getNote } from "./notes";
import { noteSource, noteWordCount } from "./notes.server";
import { ALL_ON, REACH, layout, replay, sec } from "./shutupStreams";

// The brief for the ShutUp note, as checks: figure first, short, plain title, no serial comma.
const SLUG = "shutup-wave-or-reach";

describe("the ShutUp note", () => {
  const note = getNote(SLUG)!;
  const source = noteSource(SLUG);
  const prose = source.replace(/^(import|export)\s.*$/gm, " ");

  it("is registered, with a title under 43 characters and no em dash, and a summary under 160", () => {
    expect(note).toBeDefined();
    expect(note.title.length).toBeLessThan(43);
    expect(note.title).not.toMatch(/[\u2014\u2013]/);
    expect(note.summary.length).toBeLessThanOrEqual(160);
  });

  it("opens with the figure, before any prose", () => {
    const first = prose.split("\n").find((l) => l.trim() !== "");
    expect(first?.trim()).toBe("<WaveOrReach />");
  });

  it("is at most 450 words of prose", () => {
    expect(noteWordCount(SLUG)).toBeLessThanOrEqual(450);
  });

  it("has claim headings: sentences, none in capitals", () => {
    const headings = [...source.matchAll(/^## +(.+)$/gm)].map((m) => m[1]);
    expect(headings.length).toBeGreaterThanOrEqual(4);
    for (const h of headings) {
      expect(h.split(/\s+/).length, h).toBeGreaterThanOrEqual(4);
      expect(h, h).not.toBe(h.toUpperCase());
    }
  });

  it("uses no Oxford comma and no em dash", () => {
    // a list of three or more written "a, b, and c"; a comma before a joining "and" in a compound sentence is not one
    expect(prose).not.toMatch(/,[^,.;]+,\s+(and|or)\s/);
    expect(prose).not.toMatch(/\u2014/);
  });

  it("states the numbers the figure computes", () => {
    // Switch the single-wave rule off and the reach answers at 1.20 s, before the grab at 1.35 s.
    // Both numbers are computed here from the port, so a change to the detectors fails this test.
    const off = replay(REACH, { ...ALL_ON, singleWaveRule: false });
    expect(off.outcome.kind).toBe("answered");
    const answeredAt = off.outcome.kind === "answered" ? off.outcome.atMs : -1;
    const grabAt = layout(REACH).jolts[0];
    expect(answeredAt).toBeLessThan(grabAt);
    expect(prose).toContain(`answers at ${sec(answeredAt)}, before the grab at ${sec(grabAt)}`);
    expect(replay(REACH, ALL_ON).outcome.kind).not.toBe("answered");
    expect(prose).toContain("0.8 s");
    expect(prose).toContain("1.8 m/s²");
    expect(prose).toContain("3 m/s²");
    expect(prose).toContain("1,600");
  });
});
