import { describe, it, expect } from "vitest";
import { parsePeriod, decimalYear } from "./timeline";
import { experiences, education } from "./data";

describe("parsePeriod", () => {
  it("reads month-and-year ranges to the end of the last month", () => {
    const s = parsePeriod("Mar 2021 – Jun 2023", 2027);
    expect(s.start).toBeCloseTo(2021 + 2 / 12);
    expect(s.end).toBeCloseTo(2023 + 6 / 12);
  });

  it("reads a range that writes its year once", () => {
    const s = parsePeriod("Jun – Sep 2020", 2027);
    expect(s.start).toBeCloseTo(2020 + 5 / 12);
    expect(s.end).toBeCloseTo(2020 + 9 / 12);
  });

  it("reads bare years as mid-year and Present as now", () => {
    expect(parsePeriod("2015 – 2019", 2027)).toEqual({ start: 2015.5, end: 2019.5 });
    expect(parsePeriod("Jun 2023 – Present", 2026.86).end).toBe(2026.86);
    expect(parsePeriod("Jun 2023 - Present", 2026.86).end).toBe(2026.86);
  });

  it("every period in lib/data parses to a forward span inside 2015 to now", () => {
    const now = decimalYear("2026-11-10");
    for (const p of [...experiences, ...education].map((e) => e.period)) {
      const s = parsePeriod(p, now);
      expect(s.start, p).toBeGreaterThanOrEqual(2015);
      expect(s.end, p).toBeGreaterThan(s.start);
      expect(s.end, p).toBeLessThanOrEqual(2027);
    }
  });

  it("converts an ISO date", () => {
    expect(decimalYear("2026-01-01")).toBe(2026);
    expect(decimalYear("2026-07-01")).toBeCloseTo(2026.5);
  });
});
