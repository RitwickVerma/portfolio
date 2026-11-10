import { describe, it, expect } from "vitest";
import { COOLDOWN_RUNS, ROWS, RUNS, failed, initialRuns, nextRun, pages, sent, type Run } from "./paging";

const at = (flags: boolean[]) => flags.flatMap((f, i) => (f ? [i] : []));

describe("paging rule", () => {
  it("is silent while everything is healthy", () => {
    expect(sent(pages([0, 0, 0, 0], "gated"))).toBe(0);
  });

  it("one failed probe never pages: it has to fail two runs in a row", () => {
    expect(at(pages([0, 1, 0, 1, 0, 1], "gated"))).toEqual([]);
  });

  it("pages once, on the second consecutive failure, however long it lasts", () => {
    expect(at(pages([0, 1, 1, 1, 1, 1], "gated"))).toEqual([2]);
  });

  it("clears silently and a fault that comes back is new", () => {
    expect(at(pages([1, 1, 0, 1, 1], "gated"))).toEqual([1, 4]);
  });

  it("re-notifies only after the cooldown: six hours for a service check", () => {
    const runs = Array.from({ length: 80 }, () => 1 as Run);
    expect(at(pages(runs, "gated", { cooldown: COOLDOWN_RUNS.service }))).toEqual([1, 1 + 72]);
    expect(COOLDOWN_RUNS.service).toBe((6 * 60) / 5);
  });

  it("the watchdog waits twelve hours", () => {
    const runs = Array.from({ length: 150 }, () => 1 as Run);
    expect(at(pages(runs, "gated", { cooldown: COOLDOWN_RUNS.watchdog }))).toEqual([1, 1 + 144]);
    expect(COOLDOWN_RUNS.watchdog).toBe((12 * 60) / 5);
  });

  it("a check that could not run is an alert of its own", () => {
    expect(at(pages([0, 2, 2, 2], "gated"))).toEqual([2]);
    // Failing, then unverifiable: a different condition, confirmed on its own.
    expect(at(pages([1, 1, 2, 2], "gated"))).toEqual([1, 3]);
  });

  it("the naive rule pages on every failure", () => {
    expect(at(pages([0, 1, 1, 0, 2, 1], "every"))).toEqual([1, 2, 4, 5]);
  });

  it("the gated rule never sends more pages than there are failures, nor more than the naive rule", () => {
    let seed = 7;
    const next = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed;
    };
    for (let t = 0; t < 200; t++) {
      const runs = Array.from({ length: RUNS }, () => (next() % 3) as Run);
      expect(sent(pages(runs, "gated"))).toBeLessThanOrEqual(sent(pages(runs, "every")));
      expect(sent(pages(runs, "every"))).toBe(failed(runs));
    }
  });

  it("the opening strip: many failures, two pages", () => {
    const rows = initialRuns();
    const f = ROWS.reduce((n, r) => n + failed(rows[r.id]), 0);
    const g = ROWS.reduce((n, r) => n + sent(pages(rows[r.id], "gated")), 0);
    expect(rows.service).toHaveLength(RUNS);
    expect(f).toBe(11);
    expect(g).toBe(2);
  });

  it("a cell cycles healthy, failed and, for the watchdog only, could not check", () => {
    expect(nextRun(0, false)).toBe(1);
    expect(nextRun(1, false)).toBe(0);
    expect(nextRun(1, true)).toBe(2);
    expect(nextRun(2, true)).toBe(0);
  });
});
