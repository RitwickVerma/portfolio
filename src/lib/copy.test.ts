import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { projects, skills } from "./data";
import { notes } from "./notes";

// Copy guards for everything that ships: components, notes, lib data. Test
// files are skipped (they have to name the terms they forbid).
const SRC = join(__dirname, "..");

function shippedFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return shippedFiles(path);
    return /\.(tsx?|mdx)$/.test(name) && !/\.test\.ts$/.test(name) ? [path] : [];
  });
}

const sources = shippedFiles(SRC).map((path) => ({ path, text: readFileSync(path, "utf8") }));

describe("site copy", () => {
  it("names no internal eBay codenames, ticket ids, topology or money figures", () => {
    const banned = /SBE-\d|cronus|voyager|yacr|DSBE|SIBE|NuKV|\bshards?\b|\breplicas?\b|\bGMV\b|\bGMB\b/i;
    for (const { path, text } of sources) expect(text, path).not.toMatch(banned);
  });

  it("never rounds 13th of 121 contributors up to 'top 10%'", () => {
    for (const { path, text } of sources) expect(text, path).not.toMatch(/top 10\s?%/i);
  });

  it("dates fitment ownership to 2022, not 2023", () => {
    for (const { path, text } of sources) {
      expect(text, path).not.toMatch(/(since|from) 2023[^.]*fitment|fitment[^.]*(since|from) 2023/i);
    }
  });

  it("does not describe the retired nginx/CT114 hosting as current", () => {
    for (const { path, text } of sources) {
      expect(text, path).not.toMatch(/served by nginx|static export \+ nginx|rebuilds on the host|container that serves this site/i);
    }
  });

  it("lists only languages he writes himself (agent-written Kotlin and C# stay on project cards)", () => {
    expect(skills.languages).toEqual(["C++", "Python", "Java", "C"]);
  });

  it("states the Plutus verdict and the homelab count the resume uses", () => {
    expect(projects.find((p) => p.slug === "plutus")!.description).toMatch(/no edge/);
    expect(notes.find((n) => n.slug === "plutus-what-the-backtest-cannot-tell-you")!.summary).toMatch(/no edge/);
    expect(notes.find((n) => n.slug === "homelab-git-is-the-truth")!.summary).toMatch(/fourteen declared/);
  });

  it("matches each public repo's license", () => {
    expect(projects.find((p) => p.slug === "sudostamp")!.role).toMatch(/\bMIT\b/);
    expect(projects.find((p) => p.slug === "tizen-ambilight")!.role).toMatch(/\bMIT\b/);
  });
});
