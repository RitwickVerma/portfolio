import { describe, it, expect } from "vitest";
import { COOLDOWN_RUNS, ROWS, RUNS, SCENARIOS, failed, initialRuns, nextRun, pages, pagingVerdict, sent, totals, type Run } from "./paging";

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

  it("a flapping condition costs one message, not one per flap", () => {
    expect(at(pages([1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0], "gated"))).toEqual([1]);
  });

  it("a fault that returns after the cooldown pages again", () => {
    const runs: Run[] = [1, 1, 0, ...Array.from({ length: 80 }, () => 0 as Run), 1, 1];
    expect(at(pages(runs, "gated", { cooldown: COOLDOWN_RUNS.service }))).toEqual([1, 84]);
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
    // Failing, then unverifiable: a new finding on a check that is already two runs bad, so it pages at once.
    expect(at(pages([1, 1, 2, 2], "gated"))).toEqual([1, 2]);
    // One failure then one unverifiable run is two bad runs in a row: it pages, and the totals say so.
    expect(at(pages([0, 1, 2, 0], "gated"))).toEqual([2]);
  });

  it("the naive rule pages on every failure", () => {
    expect(at(pages([0, 1, 1, 0, 2, 1], "every"))).toEqual([1, 2, 4, 5]);
  });

  it("the gated rule never sends more pages than the naive rule, which sends one per failure", () => {
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

  it("each scenario has the strip length and the pages the note's rule gives", () => {
    const expected: Record<string, [number, number, number]> = {
      lasts: [6, 1, 6],
      blips: [6, 0, 6],
      flaps: [8, 1, 8],
      cannot: [4, 1, 4],
    };
    for (const s of SCENARIOS) {
      const strips = s.runs();
      for (const r of ROWS) expect(strips[r.id]).toHaveLength(RUNS);
      const gated = totals(strips, "gated");
      const naive = totals(strips, "every");
      expect([gated.failed, gated.sent, naive.sent]).toEqual(expected[s.id]);
    }
    expect(initialRuns().service).toEqual(SCENARIOS[0].runs().service);
  });

  it("the verdict is a plain sentence about the totals", () => {
    expect(pagingVerdict({ failed: 6, sent: 1 }, "gated")).toMatchObject({ tone: "ok", title: "6 checks failed, 1 page sent." });
    expect(pagingVerdict({ failed: 6, sent: 0 }, "gated").tone).toBe("ok");
    expect(pagingVerdict({ failed: 0, sent: 0 }, "gated").title).toBe("Nothing failed, so nothing paged.");
    expect(pagingVerdict({ failed: 6, sent: 6 }, "every").tone).toBe("warn");
  });

  it("a cell cycles healthy, failed and, for the watchdog only, could not check", () => {
    expect(nextRun(0, false)).toBe(1);
    expect(nextRun(1, false)).toBe(0);
    expect(nextRun(1, true)).toBe(2);
    expect(nextRun(2, true)).toBe(0);
  });
});
