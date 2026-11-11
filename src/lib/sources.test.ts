import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { NO_SOURCE, SOURCES, bareSymbol, siteUrl, sourceFor, upstreamUrl, type SourceEntry } from "./sources";
import { notes } from "./notes";

const ROOT = join(__dirname, "..", "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The names of the figure components a note's MDX renders: every capitalised JSX tag but Sources. */
function figuresIn(slug: string): string[] {
  const mdx = read(`src/content/notes/${slug}.mdx`);
  return [...mdx.matchAll(/^<([A-Z][A-Za-z0-9]*)\b/gm)].map((m) => m[1]).filter((n) => n !== "Sources");
}

describe("the source table", () => {
  it("has the shape: a figure id, a note, a component, a site module, a relation and an upstream or the reason for none", () => {
    for (const s of SOURCES) {
      expect(s.figure, s.figure).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(s.component, s.figure).toMatch(/^[A-Z][A-Za-z0-9]*$/);
      expect(s.site.file, s.figure).toMatch(/^src\/[\w./-]+\.(ts|tsx)$/);
      expect(s.site.symbol.length, s.figure).toBeGreaterThan(0);
      expect(["ports", "reimplements", "reads data from"], s.figure).toContain(s.relation);
      const u = s.upstream;
      if (u.repo === null) {
        expect(u.note.length, s.figure).toBeGreaterThan(20);
      } else {
        expect(u.repo, s.figure).toMatch(/^ritwick7\/[A-Za-z0-9._-]+$/);
        expect(u.path, s.figure).toMatch(/^[\w./-]+$/);
        expect(u.path.startsWith("/"), s.figure).toBe(false);
        expect(u.symbol.length, s.figure).toBeGreaterThan(0);
        expect(Number.isInteger(u.line) && u.line > 0, s.figure).toBe(true);
      }
    }
  });

  it("has no duplicate figure id, and every pinned commit is a full 40-hex sha", () => {
    const ids = SOURCES.map((s) => s.figure);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of SOURCES) if (s.upstream.repo !== null) expect(s.upstream.commit, s.figure).toMatch(/^[0-9a-f]{40}$/);
  });

  it("names a site symbol that exists in the site file", () => {
    for (const s of SOURCES) {
      const file = join(ROOT, s.site.file);
      expect(existsSync(file), `${s.figure}: ${s.site.file}`).toBe(true);
      const sym = escape(bareSymbol(s.site.symbol));
      const declared = new RegExp(`(^|\\n)\\s*(export\\s+)?(default\\s+)?(async\\s+)?(function\\*?|class|const|let|interface|type)\\s+${sym}\\b`);
      expect(declared.test(readFileSync(file, "utf8")), `${s.figure}: ${s.site.symbol} in ${s.site.file}`).toBe(true);
    }
  });

  it("marks a function with () and nothing else", () => {
    for (const s of SOURCES) {
      const sym = bareSymbol(s.site.symbol);
      const text = read(s.site.file);
      const isFn = new RegExp(`function\\*?\\s+${escape(sym)}\\b`).test(text);
      expect(s.site.symbol.endsWith("()"), `${s.figure}: ${s.site.symbol}`).toBe(isFn);
    }
  });

  it("covers every figure the notes render, or says why it does not", () => {
    const covered = new Set(SOURCES.map((s) => s.component));
    const used = new Set<string>();
    for (const n of notes) for (const c of figuresIn(n.slug)) used.add(c);
    for (const c of used) {
      expect(covered.has(c) || c in NO_SOURCE, `figure component ${c} has no entry in SOURCES or NO_SOURCE`).toBe(true);
    }
    for (const [c, why] of Object.entries(NO_SOURCE)) {
      expect(used.has(c), `${c} is in NO_SOURCE but no note renders it`).toBe(true);
      expect(why.length).toBeGreaterThan(10);
    }
    // And no entry for a figure nobody renders.
    for (const s of SOURCES) expect(used.has(s.component), `${s.figure}: ${s.component} is in no note`).toBe(true);
  });

  it("puts a Sources line under every figure, in order, in the note the table says", () => {
    for (const n of notes) {
      const mdx = read(`src/content/notes/${n.slug}.mdx`);
      const lines = mdx.split("\n");
      const expected: SourceEntry[] = [];
      for (const l of lines) {
        const m = /^<([A-Z][A-Za-z0-9]*)\b/.exec(l);
        if (!m || m[1] === "Sources") continue;
        if (m[1] in NO_SOURCE) continue;
        const e = SOURCES.find((s) => s.component === m[1] && s.slug === n.slug);
        expect(e, `${n.slug}: <${m[1]}> has no entry for this note`).toBeDefined();
        expected.push(e!);
      }
      const got = [...mdx.matchAll(/^<Sources figure="([^"]+)" \/>$/gm)].map((m) => m[1]);
      expect(got, n.slug).toEqual(expected.map((e) => e.figure));
      for (const id of got) expect(sourceFor(id)?.slug, id).toBe(n.slug);
      // The line is directly under its figure: figure, blank line, Sources.
      for (const e of expected) {
        const at = lines.findIndex((l) => new RegExp(`^<${e.component}\\b`).test(l));
        expect(lines[at + 2], `${n.slug}: ${e.component}`).toBe(`<Sources figure="${e.figure}" />`);
      }
      if (got.length > 0) expect(mdx, n.slug).toContain('import { Sources } from "@/components/figures/Sources";');
    }
  });

  it("covers every note that has a figure, and no note outside the eight", () => {
    const slugs = new Set(SOURCES.map((s) => s.slug));
    expect([...slugs].sort()).toEqual(
      readdirSync(join(ROOT, "src/content/notes"))
        .map((f) => f.replace(/\.mdx$/, ""))
        .filter((slug) => figuresIn(slug).length > 0)
        .sort(),
    );
    expect(slugs.size).toBe(8);
  });
});

describe("the links", () => {
  it("point at the site's file on master, and at the upstream file at the pinned commit and line", () => {
    expect(siteUrl("src/lib/sudostamp.ts")).toBe("https://gitlab.com/ritwick7/portfolio/-/blob/master/src/lib/sudostamp.ts");
    const s = sourceFor("limiter-timeline")!;
    if (s.upstream.repo === null) throw new Error("limiter-timeline has an upstream");
    expect(upstreamUrl(s.upstream)).toBe(
      "https://gitlab.com/ritwick7/sudostamp/-/blob/c55e2b6944a320d7fdf7076d28f1fc7513a17c34/app/src/main/java/com/ritwick/sudostamp/Limiter.kt#L21",
    );
  });

  it("match the blob pattern for every upstream entry", () => {
    for (const s of SOURCES) {
      if (s.upstream.repo === null) continue;
      expect(upstreamUrl(s.upstream), s.figure).toMatch(/^https:\/\/gitlab\.com\/ritwick7\/[\w.-]+\/-\/blob\/[0-9a-f]{40}\/[\w./-]+#L\d+$/);
    }
  });

  it("leave Plutus without an upstream link, and say the repository is private", () => {
    const plutus = SOURCES.filter((s) => s.slug.startsWith("plutus-"));
    expect(plutus.map((s) => s.figure).sort()).toEqual(["bootstrap-path", "survivor-toy", "universe-switch"]);
    for (const s of plutus) {
      expect(s.upstream.repo).toBeNull();
      expect(s.upstream.repo === null && s.upstream.note).toContain("private repository");
    }
  });
});
