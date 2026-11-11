import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  gitlabProjects,
  pipelineWord,
  parseProject,
  parseCommits,
  parsePipelines,
  parseTags,
  fetchEntry,
  run,
  RateLimited,
  isFresh,
} from "../../tools/liveness.mjs";
import { projects } from "./data";
import { agoText, daysBetween, livenessFor, livenessLine, lineText, dateLabel, type Generated } from "./liveness";

const fx = (name: string) => JSON.parse(readFileSync(join(__dirname, "../../tools/fixtures/liveness", name), "utf8"));
const NOW = new Date("2026-11-11T10:00:00Z");
const d = (s: string) => new Date(`${s}T12:00:00Z`);

/** A fake GitLab over the fixtures: path suffix to response. Records the URLs it was asked for. */
function gitlab(over: Record<string, { status: number; json: unknown }> = {}) {
  const asked: string[] = [];
  const table: Record<string, { status: number; json: unknown }> = {
    "": { status: 200, json: fx("project.json") },
    "/repository/commits": { status: 200, json: fx("commits.json") },
    "/pipelines": { status: 200, json: fx("pipelines.json") },
    "/repository/tags": { status: 200, json: fx("tags.json") },
    ...over,
  };
  const get = async (url: string) => {
    asked.push(url);
    const rest = url.replace("https://gitlab.com/api/v4/projects/", "").replace(/^[^/?]+/, "").replace(/\?.*$/, "");
    const r = table[rest];
    if (!r) throw new Error(`unexpected ${url}`);
    return r;
  };
  return { get, asked };
}

describe("which projects are fetched", () => {
  it("reads every gitlab link out of data.ts, none by hand", () => {
    const list = gitlabProjects(readFileSync(join(__dirname, "data.ts"), "utf8"));
    const expected = projects.filter((p) => p.links.gitlab).map((p) => ({ slug: p.slug, path: p.links.gitlab!.replace("https://gitlab.com/", "") }));
    expect(list).toEqual(expected);
    expect(list.length).toBeGreaterThanOrEqual(5);
  });
  it("ignores projects with only a GitHub link or none", () => {
    const src = `export const projects = [\n  {\n    slug: "a",\n    links: {},\n  },\n  {\n    slug: "b",\n    links: { github: "https://github.com/x/y" },\n  },\n  {\n    slug: "c",\n    links: { gitlab: "https://gitlab.com/g/sub/c.git/" },\n  },\n];\nconst other = { gitlab: "https://gitlab.com/no/way" };`;
    expect(gitlabProjects(src)).toEqual([{ slug: "c", path: "g/sub/c" }]);
  });
});

describe("parsing GitLab responses (real shapes, trimmed, in tools/fixtures/liveness)", () => {
  it("project: default branch and star count", () => {
    expect(parseProject(fx("project.json"))).toEqual({ defaultBranch: "master", stars: 0 });
    expect(parseProject({ ...fx("project.json"), star_count: 12 }).stars).toBe(12);
    expect(parseProject({ default_branch: "main", star_count: "many" }).stars).toBeNull();
    expect(() => parseProject({ star_count: 3 })).toThrow();
    expect(() => parseProject(null)).toThrow();
  });
  it("commits: the committed date as UTC, null for an empty repository", () => {
    expect(parseCommits(fx("commits.json"))).toBe("2026-10-23T08:57:46.000Z");
    expect(parseCommits([])).toBeNull();
    expect(parseCommits([{ committed_date: "not a date" }])).toBeNull();
    expect(() => parseCommits({ message: "403" })).toThrow();
  });
  it("pipelines: success, failed and the in-flight states map to three words, the rest to none", () => {
    expect(parsePipelines(fx("pipelines.json"))).toBe("failed");
    expect(parsePipelines([])).toBeNull();
    expect(pipelineWord("success")).toBe("passed");
    for (const s of ["running", "pending", "created", "preparing", "waiting_for_resource", "scheduled"]) expect(pipelineWord(s)).toBe("running");
    for (const s of ["canceled", "skipped", "manual", "", undefined, "wat"]) expect(pipelineWord(s)).toBeNull();
  });
  it("tags: the newest name, null when there is none", () => {
    expect(parseTags(fx("tags.json"))).toBe("v2.0.6");
    expect(parseTags([])).toBeNull();
    expect(() => parseTags("nope")).toThrow();
  });
});

describe("one project, four calls", () => {
  it("builds the entry and asks for the default branch, not a guessed one", async () => {
    const g = gitlab({ "": { status: 200, json: { ...fx("project.json"), star_count: 12 } } });
    const e = await fetchEntry("ritwick7/shutup", g.get, NOW);
    expect(e).toEqual({ lastCommit: "2026-10-23T08:57:46.000Z", pipeline: "failed", tag: "v2.0.6", stars: 12, source: "api", asOf: "2026-11-11" });
    expect(g.asked).toHaveLength(4);
    expect(g.asked[0]).toBe("https://gitlab.com/api/v4/projects/ritwick7%2Fshutup");
    expect(g.asked[1]).toContain("ref_name=master");
    expect(g.asked[2]).toContain("ref=master");
  });
  it("a hidden pipelines endpoint (403) or a missing tags endpoint is simply none", async () => {
    const g = gitlab({ "/pipelines": { status: 403, json: { message: "403 Forbidden" } }, "/repository/tags": { status: 404, json: null } });
    const e = await fetchEntry("ritwick7/tizenambilight", g.get, NOW);
    expect(e.pipeline).toBeNull();
    expect(e.tag).toBeNull();
    expect(e.lastCommit).toBe("2026-10-23T08:57:46.000Z");
  });
  it("a server error on the project or the commits fails the project", async () => {
    await expect(fetchEntry("x/y", gitlab({ "": { status: 500, json: null } }).get, NOW)).rejects.toThrow(/500/);
    await expect(fetchEntry("x/y", gitlab({ "/repository/commits": { status: 502, json: null } }).get, NOW)).rejects.toThrow(/502/);
    await expect(fetchEntry("x/y", gitlab({ "/pipelines": { status: 500, json: null } }).get, NOW)).rejects.toThrow(/500/);
  });
  it("429 anywhere is its own error", async () => {
    await expect(fetchEntry("x/y", gitlab({ "/pipelines": { status: 429, json: null } }).get, NOW)).rejects.toBeInstanceOf(RateLimited);
  });
});

describe("the run: fallback to the previous file", () => {
  const list = [
    { slug: "a", path: "o/a" },
    { slug: "b", path: "o/b" },
  ];
  const previous = {
    fetchedAt: "2026-10-01T00:00:00.000Z",
    projects: {
      a: { lastCommit: "2026-09-01T00:00:00.000Z", pipeline: "passed", tag: "v1", stars: 4, source: "api", asOf: "2026-10-01" },
      b: { lastCommit: "2026-09-02T00:00:00.000Z", pipeline: null, tag: null, stars: 1, source: "api", asOf: "2026-10-01" },
    },
  };

  it("all good: both entries fresh, dated now", async () => {
    const r = await run(list, previous, gitlab().get, NOW);
    expect(r.changed).toBe(true);
    expect(r.file.fetchedAt).toBe(NOW.toISOString());
    expect(r.file.projects.a.source).toBe("api");
    expect(r.file.projects.b.asOf).toBe("2026-11-11");
    expect(r.lines).toHaveLength(2);
  });

  it("one project fails: it keeps its previous entry, marked previous, with its own old date", async () => {
    const get = async (url: string) => (url.includes("%2Fb") ? { status: 500, json: null } : gitlab().get(url));
    const r = await run(list, previous, get, NOW);
    expect(r.changed).toBe(true);
    expect(r.file.projects.a.source).toBe("api");
    expect(r.file.projects.b).toEqual({ ...previous.projects.b, source: "previous" });
    expect(r.lines[1]).toMatch(/b: failed.*keeping previous/);
  });

  it("a project that fails and was never fetched is left out (the page falls back to the snapshot)", async () => {
    const get = async (url: string) => (url.includes("%2Fb") ? { status: 500, json: null } : gitlab().get(url));
    const r = await run(list, { fetchedAt: null, projects: {} }, get, NOW);
    expect(Object.keys(r.file.projects)).toEqual(["a"]);
  });

  it("429 stops the run and keeps the file exactly as it was", async () => {
    let calls = 0;
    const get = async () => {
      calls++;
      return { status: 429, json: null };
    };
    const r = await run(list, previous, get, NOW);
    expect(r.changed).toBe(false);
    expect(r.file).toBe(previous);
    expect(calls).toBe(1); // b is never asked
    expect(r.lines.join("\n")).toMatch(/429/);
  });

  it("everything failing keeps the file as it was, and no previous file is fine", async () => {
    const down = async () => {
      throw new Error("ENOTFOUND");
    };
    expect((await run(list, previous, down, NOW)).file).toBe(previous);
    const none = await run(list, null, down, NOW);
    expect(none.changed).toBe(false);
    expect(none.file).toBeNull();
  });
});

describe("skipping a refetch within the hour", () => {
  const list = [{ slug: "a", path: "o/a" }];
  const file = (over = {}) => ({ fetchedAt: "2026-11-11T09:30:00.000Z", projects: { a: { source: "api", ...over } } });
  it("fresh and complete: no requests", () => {
    expect(isFresh(file(), list, NOW)).toBe(true);
  });
  it("older than an hour, in the future, unparsable or missing: fetch", () => {
    expect(isFresh({ ...file(), fetchedAt: "2026-11-11T08:59:00.000Z" }, list, NOW)).toBe(false);
    expect(isFresh({ ...file(), fetchedAt: "2026-11-11T12:00:00.000Z" }, list, NOW)).toBe(false);
    expect(isFresh({ ...file(), fetchedAt: "soon" }, list, NOW)).toBe(false);
    expect(isFresh(null, list, NOW)).toBe(false);
  });
  it("a kept (previous) entry or a project not in the file forces a fetch", () => {
    expect(isFresh(file({ source: "previous" }), list, NOW)).toBe(false);
    expect(isFresh(file(), [...list, { slug: "b", path: "o/b" }], NOW)).toBe(false);
  });
});

describe("agoText boundaries", () => {
  const to = d("2026-11-11");
  const back = (n: number) => d(new Date(to.getTime() - n * 86_400_000).toISOString().slice(0, 10));
  it.each([
    [0, "today"],
    [1, "yesterday"],
    [2, "2 days ago"],
    [29, "29 days ago"],
    [30, "1 month ago"],
    [59, "1 month ago"],
    [60, "2 months ago"],
    [364, "12 months ago"],
    [365, "1 year ago"],
    [729, "1 year ago"],
    [730, "2 years ago"],
  ])("%i days is %s", (n, text) => {
    expect(agoText(back(n), to)).toBe(text);
  });
  it("counts UTC calendar days, not 24-hour spans", () => {
    expect(agoText(new Date("2026-11-10T23:59:00Z"), new Date("2026-11-11T00:01:00Z"))).toBe("yesterday");
    expect(agoText(new Date("2026-11-10T00:01:00Z"), new Date("2026-11-10T23:59:00Z"))).toBe("today");
  });
  it("a commit dated after the fetch (clock skew) is today, never negative", () => {
    expect(daysBetween(d("2026-11-12"), to)).toBe(0);
    expect(agoText(d("2026-11-12"), to)).toBe("today");
  });
});

describe("livenessFor", () => {
  const gen: Generated = {
    fetchedAt: "2020-03-10T04:00:00.000Z",
    projects: {
      a: { lastCommit: "2020-03-07T20:00:00.000Z", pipeline: "passed", tag: "v1.4.0", stars: 12, source: "api", asOf: "2020-03-10" },
      old: { lastCommit: "2020-01-01T00:00:00.000Z", pipeline: "failed", tag: null, stars: 3, source: "previous", asOf: "2020-02-01" },
      bare: { lastCommit: null, pipeline: null, tag: null, stars: null, source: "api" },
    },
  };

  it("measures against the fetch day, not the clock: a 2020 file says 3 days ago today", () => {
    const l = livenessFor("a", gen, null, "2020-03-10");
    expect(l.ago).toBe("3 days ago");
    expect(l.asOf).toBe("2020-03-10");
    expect(l.lastCommit?.toISOString()).toBe("2020-03-07T20:00:00.000Z");
    expect(l.source).toBe("api");
    expect(l.pipeline).toBe("passed");
    expect(l.tag).toBe("v1.4.0");
    expect(l.stars).toBe(12);
  });

  it("an entry the tool kept is previous, and is dated by its own fetch day", () => {
    const l = livenessFor("old", gen, null, "2020-03-10");
    expect(l.source).toBe("previous");
    expect(l.asOf).toBe("2020-02-01");
    expect(l.ago).toBe("1 month ago");
  });

  it("an api entry older than the build is previous: the fetch failed this time", () => {
    expect(livenessFor("a", gen, null, "2020-03-11").source).toBe("previous");
    expect(livenessFor("a", gen).source).toBe("api"); // no build date given: nothing to compare
  });

  it("no entry: snapshot, carrying only the hand-typed stars from data.ts", () => {
    const l = livenessFor("nope", gen, 7, "2020-03-10");
    expect(l).toEqual({ lastCommit: null, ago: null, pipeline: null, tag: null, stars: 7, asOf: null, source: "snapshot" });
    expect(livenessFor("a", null, null).source).toBe("snapshot");
    expect(livenessFor("a", undefined, null).stars).toBeNull();
  });

  it("a missing star count falls back to the snapshot figure; the fetch date falls back to fetchedAt", () => {
    const l = livenessFor("bare", gen, 5);
    expect(l.stars).toBe(5);
    expect(l.asOf).toBe("2020-03-10");
    expect(l.ago).toBeNull();
  });

  it("garbage pipeline words become no verdict", () => {
    const g = { fetchedAt: gen.fetchedAt, projects: { x: { ...gen.projects.a, pipeline: "banana" as never } } };
    expect(livenessFor("x", g).pipeline).toBeNull();
  });

  it("the committed file parses to something the page can use", () => {
    const real = JSON.parse(readFileSync(join(__dirname, "liveness.generated.json"), "utf8")) as Generated;
    const withGitlab = projects.filter((p) => p.links.gitlab);
    for (const p of withGitlab) {
      const l = livenessFor(p.slug, real, null);
      expect(l.lastCommit, p.slug).not.toBeNull();
      expect(l.asOf, p.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe("the line", () => {
  const gen: Generated = {
    fetchedAt: "2026-11-11T10:00:00.000Z",
    projects: { a: { lastCommit: "2026-11-08T10:00:00.000Z", pipeline: "passed", tag: "v1.4.0", stars: 12, source: "api", asOf: "2026-11-11" } },
  };
  it("reads as the brief words it", () => {
    expect(lineText(livenessLine(livenessFor("a", gen, null, "2026-11-11")))).toBe("Last commit 3 days ago · CI passed · v1.4.0 · 12 stars · as of 11 Nov 2026");
  });
  it("tone follows the measured state; a missing verdict is quiet and omitted", () => {
    const line = (p: "passed" | "failed" | "running" | null) => livenessLine(livenessFor("a", { ...gen, projects: { a: { ...gen.projects.a, pipeline: p } } }));
    expect(line("passed").tone).toBe("ok");
    expect(line("failed").tone).toBe("bad");
    expect(line("running").tone).toBe("quiet");
    expect(line(null).tone).toBe("quiet");
    expect(lineText(line(null))).not.toContain("CI");
  });
  it("one star is singular, zero is left out, more is plural", () => {
    const stars = (n: number) => livenessLine(livenessFor("a", { ...gen, projects: { a: { ...gen.projects.a, stars: n } } })).stars;
    expect(stars(1)).toBe("1 star");
    expect(stars(0)).toBe("");
    expect(stars(7)).toBe("7 stars");
  });
  it("kept or snapshot data ends with (snapshot)", () => {
    const prev: Generated = { ...gen, projects: { a: { ...gen.projects.a, source: "previous", asOf: "2026-10-01" } } };
    const text = lineText(livenessLine(livenessFor("a", prev, null, "2026-11-11")));
    expect(text.endsWith(" (snapshot)")).toBe(true);
    expect(text).toContain("as of 1 Oct 2026");
  });
  it("with nothing at all, it says so rather than printing an empty line", () => {
    expect(lineText(livenessLine(livenessFor("zzz", gen, null)))).toBe("No live figures in this build (snapshot)");
    expect(lineText(livenessLine(livenessFor("zzz", gen, 7)))).toBe("7 stars (snapshot)");
  });
  it("dateLabel: no Intl, same string everywhere", () => {
    expect(dateLabel("2026-11-01")).toBe("1 Nov 2026");
    expect(dateLabel("2026-12-31")).toBe("31 Dec 2026");
    expect(dateLabel("garbage")).toBe("garbage");
  });
});
