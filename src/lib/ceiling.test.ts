import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTLE_MS, MEASURED, MEASURED_DEFAULT, MEASURED_SETTLE_MS, SLOTS, lapMs, lapSteps, readingsPerSecond, ringPoints, spotHz,
} from "./ceiling";

describe("the ceiling, against the repo's own numbers", () => {
  it("2 slots at a 20 ms settle is the 'about 100 readings per second'", () => {
    expect(SLOTS).toBe(2);
    expect(DEFAULT_SETTLE_MS).toBe(20);
    expect(readingsPerSecond(20)).toBe(100);
  });
  it("at 17 ms the ceiling is 118 readings a second, above the 100 to 116 the repo measured", () => {
    expect(Math.round(readingsPerSecond(17))).toBe(118);
    expect(readingsPerSecond(17)).toBeGreaterThan(116);
  });
  it("the model is a ceiling over the measured table, to the rounding the repo reports", () => {
    for (const m of MEASURED) {
      const model = spotHz(m.spots, MEASURED_SETTLE_MS);
      // The repo's ranges are whole numbers of Hz (one decimal for the 73-spot row). Rounded the
      // same way, the model is not under the top of any measured range.
      const digits = Number.isInteger(m.hi) ? 0 : 1;
      expect(Number(model.toFixed(digits)), `${m.spots} spots: model ${model.toFixed(2)} Hz`).toBeGreaterThanOrEqual(m.hi);
      // And not wildly above it: the top of each range is within 20% of the model.
      expect(model).toBeLessThan(m.hi * 1.2);
    }
  });
  it("at the default settle, 24 spots stay under the model and the 80 to 99 readings a second measured", () => {
    const model = spotHz(MEASURED_DEFAULT.spots, DEFAULT_SETTLE_MS);
    expect(model).toBeGreaterThanOrEqual(MEASURED_DEFAULT.hz[1]);
    expect(readingsPerSecond(DEFAULT_SETTLE_MS)).toBeGreaterThanOrEqual(MEASURED_DEFAULT.readings[1]);
  });
  it("one lap takes the spots two at a time", () => {
    expect(lapSteps(24)).toBe(12);
    expect(lapSteps(73)).toBe(37);
    expect(lapMs(24, 20)).toBe(240);
  });
  it("more spots is slower and a longer settle is slower", () => {
    expect(spotHz(48, 20)).toBeLessThan(spotHz(24, 20));
    expect(spotHz(24, 40)).toBeLessThan(spotHz(24, 20));
  });
});

describe("ringPoints", () => {
  it("returns n distinct points on the rectangle's edge", () => {
    const pts = ringPoints(24, 160, 90);
    expect(pts).toHaveLength(24);
    expect(new Set(pts.map((p) => p.join(","))).size).toBe(24);
    for (const [x, y] of pts) {
      expect(x === 0 || x === 160 || y === 0 || y === 90).toBe(true);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(160);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(90);
    }
    expect(pts[0]).toEqual([0, 0]);
  });
});
