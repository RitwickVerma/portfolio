import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { EASE, DURATION } from "./motion";

describe("motion tokens", () => {
  it("easing curves are valid cubic-béziers (x in [0,1])", () => {
    for (const [name, c] of Object.entries(EASE)) {
      expect(c, name).toHaveLength(4);
      expect(c[0]).toBeGreaterThanOrEqual(0);
      expect(c[0]).toBeLessThanOrEqual(1);
      expect(c[2]).toBeGreaterThanOrEqual(0);
      expect(c[2]).toBeLessThanOrEqual(1);
    }
  });

  it("durations are strictly increasing", () => {
    const d = [DURATION.instant, DURATION.fast, DURATION.base, DURATION.slow];
    expect([...d].sort((a, b) => a - b)).toEqual(d);
    expect(new Set(d).size).toBe(d.length);
  });

  it("globals.css mirrors the tokens used by the hero line reveal", () => {
    const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
    const bezier = (c: readonly number[]) => `cubic-bezier(${c.join(", ")})`;
    expect(css).toContain(`--ease-out-quint: ${bezier(EASE.outQuint)};`);
    expect(css).toContain(`--dur-slow: ${DURATION.slow * 1000}ms;`);
  });
});
