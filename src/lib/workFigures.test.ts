import { describe, it, expect } from "vitest";
import { parseReplay, parseSuite, parseScope, logShare, decadesFor, decadeTicks, shares, group, toNumber, figureFor, tickLabel } from "./workFigures";
import { workRoles } from "./corpus";

const bullet = (id: string) => workRoles.flatMap((r) => r.items).find((i) => i.id === id)!.text;

describe("work figures read their numbers from the bullets", () => {
  it("replay: queries, errors before, errors after, from the real bullet", () => {
    expect(parseReplay(bullet("work-0-2"))).toEqual({ queries: 50000, before: 167, after: 6 });
  });

  it("suite: unit and regression counts, thousands separators and all", () => {
    expect(parseSuite(bullet("work-0-1"))).toEqual({ unit: 2549, regression: 511 });
  });

  it("scope: sites and catalogs", () => {
    expect(parseScope(bullet("work-0-0"))).toEqual({ sites: 16, catalogs: 19 });
  });

  it("each figure belongs to exactly one bullet, and no other bullet gets one", () => {
    const kinds = workRoles.flatMap((r) => r.items).map((i) => [i.id, figureFor(i.text)]);
    expect(kinds.filter(([, k]) => k)).toEqual([
      ["work-0-0", "scope"],
      ["work-0-1", "suite"],
      ["work-0-2", "replay"],
    ]);
  });

  it("returns null when the sentence does not say it", () => {
    expect(parseReplay("Replayed some queries.")).toBeNull();
    expect(parseReplay("replayed 10 production queries")).toBeNull();
    expect(parseSuite("2,549 tests")).toBeNull();
    expect(parseScope("on 16 sites")).toBeNull();
  });
});

describe("log axis", () => {
  it("puts a value at its share of the decades", () => {
    expect(logShare(1, 5)).toBe(0);
    expect(logShare(10, 5)).toBeCloseTo(0.2);
    expect(logShare(100000, 5)).toBe(1);
    expect(logShare(50000, 5)).toBeCloseTo(Math.log10(50000) / 5);
  });

  it("keeps the order and the ratios of the three replay numbers: equal ratios are equal distances", () => {
    const r = parseReplay(bullet("work-0-2"))!;
    const d = decadesFor(r.queries);
    expect(d).toBe(5);
    const [q, b, a] = [r.queries, r.before, r.after].map((v) => logShare(v, d));
    expect(q).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(a);
    expect(q - b).toBeCloseTo(Math.log10(r.queries / r.before) / d);
    expect(b - a).toBeCloseTo(Math.log10(r.before / r.after) / d);
  });

  it("a value at or below 1 has no place on the axis and sits at its start", () => {
    expect(logShare(0, 3)).toBe(0);
    expect(logShare(-4, 3)).toBe(0);
  });

  it("labels the ticks short, so that 10k and 100k never run together", () => {
    expect(decadeTicks(5).map(tickLabel)).toEqual(["1", "10", "100", "1k", "10k", "100k"]);
  });

  it("ticks are one per decade", () => {
    expect(decadeTicks(3)).toEqual([1, 10, 100, 1000]);
    expect(decadesFor(1000)).toBe(3);
    expect(decadesFor(1001)).toBe(4);
    expect(decadesFor(1)).toBe(1);
  });
});

describe("linear parts", () => {
  it("shares sum to one and keep the ratio of the counts", () => {
    const [u, r] = shares([2549, 511]);
    expect(u + r).toBeCloseTo(1);
    expect(u / r).toBeCloseTo(2549 / 511);
    expect(shares([0, 0])).toEqual([0, 0]);
  });
});

describe("numbers as the bullet prints them", () => {
  it("groups thousands and reads them back", () => {
    expect(group(50000)).toBe("50,000");
    expect(group(2549)).toBe("2,549");
    expect(group(511)).toBe("511");
    expect(group(1234567)).toBe("1,234,567");
    expect(toNumber(group(50000))).toBe(50000);
  });
});
