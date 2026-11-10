import { describe, it, expect } from "vitest";
import { mulberry32, normal, mix } from "./rng";
import { returnsOf, percentile, pathStats, stationaryBootstrap, summarize, histogram } from "./bootstrap";
import { EQUITY_WEEKLY } from "./plutusEquity";
import { makeWorld, runToy, averageOver, TOY, WARMUP } from "./survivorship";
import { UNIVERSES, SPY, gap } from "./plutusResults";

const YEARS = (Date.parse(EQUITY_WEEKLY[EQUITY_WEEKLY.length - 1][0]) - Date.parse(EQUITY_WEEKLY[0][0])) / (365.25 * 86400000);
const WEEKLY = returnsOf(EQUITY_WEEKLY.map((r) => r[1]));

describe("rng", () => {
  it("is deterministic and uniform enough", () => {
    const a = mulberry32(1);
    const b = mulberry32(1);
    const xs = Array.from({ length: 2000 }, () => a());
    expect(xs).toEqual(Array.from({ length: 2000 }, () => b()));
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThan(1);
    expect(xs.reduce((s, x) => s + x, 0) / xs.length).toBeCloseTo(0.5, 1);
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
  it("normal has mean 0 and sd 1", () => {
    const r = mulberry32(3);
    const xs = Array.from({ length: 20000 }, () => normal(r));
    const m = xs.reduce((s, x) => s + x, 0) / xs.length;
    const v = xs.reduce((s, x) => s + (x - m) * (x - m), 0) / xs.length;
    expect(Math.abs(m)).toBeLessThan(0.03);
    expect(v).toBeGreaterThan(0.95);
    expect(v).toBeLessThan(1.05);
  });
  it("mix separates neighbours", () => {
    expect(mix(7, 0)).not.toBe(mix(7, 1));
    expect(mix(7, 0)).not.toBe(mix(8, 0));
  });
});

describe("the committed equity curve", () => {
  it("is the weekly thinning of the README's backtest", () => {
    expect(EQUITY_WEEKLY[0]).toEqual(["2007-01-03", 100000]);
    expect(EQUITY_WEEKLY[EQUITY_WEEKLY.length - 1][0]).toBe("2026-10-13");
    expect(EQUITY_WEEKLY.length).toBeGreaterThan(900);
    expect(EQUITY_WEEKLY.length).toBeLessThan(1100);
    const s = pathStats(WEEKLY, YEARS);
    // README: CAGR +26.1%, max drawdown -36.9% on daily data; weekly points hide a little of the drawdown.
    expect(s.cagr).toBeGreaterThan(0.2605);
    expect(s.cagr).toBeLessThan(0.2615);
    expect(s.maxDrawdown).toBeLessThan(-0.33);
    expect(s.maxDrawdown).toBeGreaterThan(-0.37);
  });
});

describe("percentile and summaries", () => {
  it("matches numpy's linear interpolation", () => {
    expect(percentile([1, 2, 3, 4], 50)).toBe(2.5);
    expect(percentile([1, 2, 3, 4], 0)).toBe(1);
    expect(percentile([1, 2, 3, 4], 100)).toBe(4);
    expect(percentile([10, 20], 25)).toBe(12.5);
  });
  it("summarize ranks the actual value", () => {
    const s = summarize([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5);
    expect(s.rank).toBe(0.5);
    expect(s.median).toBe(5.5);
  });
  it("histogram counts every value once", () => {
    const h = histogram([0, 0.1, 0.5, 0.99, 1], 4, 0, 1);
    expect(h.reduce((a, b) => a + b, 0)).toBe(5);
    expect(h).toEqual([2, 0, 1, 2]);
  });
});

describe("pathStats", () => {
  it("a constant return compounds exactly and never draws down", () => {
    const s = pathStats(new Array(52).fill(0.01), 1);
    expect(s.cagr).toBeCloseTo(Math.pow(1.01, 52) - 1, 12);
    expect(s.maxDrawdown).toBe(0);
  });
  it("a loss then a recovery draws down by the loss", () => {
    expect(pathStats([0.1, -0.5, 0.2], 1).maxDrawdown).toBeCloseTo(-0.5, 12);
  });
});

describe("stationaryBootstrap", () => {
  it("resampling a constant series returns that constant whatever the block", () => {
    const b = stationaryBootstrap(new Array(100).fill(0.002), 2, { samples: 20, meanBlock: 7, seed: 1 });
    for (const c of b.cagr) expect(c).toBeCloseTo(Math.pow(1.002, 100) ** (1 / 2) - 1, 10);
    for (const d of b.maxDrawdown) expect(d).toBe(0);
  });
  it("is deterministic for a seed and different for another", () => {
    const o = { samples: 50, meanBlock: 4, seed: 42 };
    expect(stationaryBootstrap(WEEKLY, YEARS, o).cagr).toEqual(stationaryBootstrap(WEEKLY, YEARS, o).cagr);
    expect(stationaryBootstrap(WEEKLY, YEARS, { ...o, seed: 43 }).cagr).not.toEqual(stationaryBootstrap(WEEKLY, YEARS, o).cagr);
  });
  it("keeps the asked number of paths, starting at 1", () => {
    const b = stationaryBootstrap(WEEKLY, YEARS, { samples: 30, meanBlock: 4, seed: 1, paths: 5, pathStep: 5 });
    expect(b.paths).toHaveLength(5);
    expect(b.paths[0][0]).toBe(1);
  });
  it("on the real path, the 95% interval around the median holds the actual CAGR (the repo reports [13.5%, 39.8%] daily)", () => {
    const actual = pathStats(WEEKLY, YEARS);
    const b = stationaryBootstrap(WEEKLY, YEARS, { samples: 1000, meanBlock: 4, seed: 42 });
    const s = summarize(b.cagr, actual.cagr);
    expect(s.lo).toBeGreaterThan(0.08);
    expect(s.lo).toBeLessThan(actual.cagr);
    expect(s.hi).toBeGreaterThan(actual.cagr);
    expect(s.hi).toBeLessThan(0.5);
  });
  it("the block length is a real control: it moves the drawdown distribution", () => {
    const med = (m: number) => summarize(stationaryBootstrap(WEEKLY, YEARS, { samples: 400, meanBlock: m, seed: 9 }).maxDrawdown, 0).median;
    expect(Math.abs(med(26) - med(1))).toBeGreaterThan(0.01);
  });
});

describe("the toy market", () => {
  it("is reproducible and its stocks start at 1", () => {
    const a = makeWorld(TOY);
    const b = makeWorld(TOY);
    expect(Array.from(a.prices[3])).toEqual(Array.from(b.prices[3]));
    expect(a.prices[0][0]).toBe(1);
  });
  it("with no delistings both universes are the same list of stocks", () => {
    const w = makeWorld({ ...TOY, delistRate: 0 });
    expect(Array.from(w.last).every((l) => l === TOY.months + 1)).toBe(true);
    const a = runToy(w, "then");
    const b = runToy(w, "survivors");
    expect(a.strategyCagr).toBe(b.strategyCagr);
    expect(a.eligibleShare).toBe(1);
  });
  it("the same seed keeps the same price paths whatever the delisting rate", () => {
    const a = makeWorld({ ...TOY, delistRate: 0 });
    const b = makeWorld({ ...TOY, delistRate: 0.1 });
    // A stock that survives in both has identical prices; one delisted in b matches a up to the month before.
    let checked = 0;
    for (let i = 0; i < TOY.stocks; i++) {
      const stop = Math.min(b.prices[i].length - 1, a.prices[i].length - 1) - (b.last[i] <= TOY.months ? 1 : 0);
      for (let t = 0; t <= stop; t++) {
        expect(b.prices[i][t]).toBe(a.prices[i][t]);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(10000);
  });
  it("picking from survivors never holds a stock that is delisted", () => {
    for (const seed of [1, 2, 3]) {
      const w = makeWorld({ ...TOY, seed, delistRate: 0.1 });
      expect(runToy(w, "survivors").delistedPicks).toBe(0);
    }
    const w = makeWorld({ ...TOY, delistRate: 0.1 });
    expect(runToy(w, "then").eligibleShare).toBe(1);
    expect(runToy(w, "survivors").eligibleShare).toBeLessThan(1);
  });
  it("the bias: survivors beat who-existed-then, and the honest picks are within noise of the market", () => {
    const a = averageOver({ ...TOY, delistRate: 0.05 }, 20);
    expect(a.survivors - a.then).toBeGreaterThan(0.03);
    expect(Math.abs(a.then - a.market)).toBeLessThan(0.02);
  });
  it("the bias grows with the delisting rate", () => {
    const lo = averageOver({ ...TOY, delistRate: 0.02 }, 12);
    const hi = averageOver({ ...TOY, delistRate: 0.1 }, 12);
    expect(hi.survivors - hi.then).toBeGreaterThan(lo.survivors - lo.then);
  });
  it("starts trading after the signal's history exists", () => {
    const r = runToy(makeWorld(TOY), "then");
    expect(r.strategy).toHaveLength(TOY.months - WARMUP + 1);
  });
});

describe("the real rows", () => {
  it("say what survivorship.md says: 21.3 against 3.1, an 18.2 point gap", () => {
    const today = UNIVERSES.find((u) => u.id === "today")!;
    const then = UNIVERSES.find((u) => u.id === "then")!;
    expect(today.cagr).toBe(21.3);
    expect(then.cagr).toBe(3.1);
    expect(gap(today, then)).toBe(18.2);
    expect(SPY.cagr).toBe(15.2);
    const cagr = UNIVERSES.map((u) => u.cagr);
    expect([...cagr].sort((a, b) => a - b)).toEqual(cagr);
  });
});
