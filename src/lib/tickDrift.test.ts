import { describe, it, expect } from "vitest";
import { CLOCK_HZ, MEASURED, driftVerdict, grouped, tick, tickMarks } from "./tickDrift";

describe("the kernel tick", () => {
  it("10000 ticks/s: 3.2 cycles becomes 3, and the kernel runs 6.7% fast", () => {
    const t = tick(10000)!;
    expect(t.exactCycles).toBeCloseTo(3.2, 12);
    expect(t.cycles).toBe(3);
    expect(t.ratio).toBeCloseTo(3.2 / 3, 12);
    expect(t.ratio).toBeCloseTo(1.0667, 4);
    expect(t.driftAfter(60)).toBeCloseTo(3.9999, 3);
    expect(t.realMsPerKernelSecond).toBeCloseTo(937.5, 6);
  });

  it("8000 ticks/s: exactly 4 cycles, no drift", () => {
    const t = tick(8000)!;
    expect(t.exactCycles).toBe(4);
    expect(t.cycles).toBe(4);
    expect(t.ratio).toBe(1);
    expect(t.driftAfter(60)).toBe(0);
  });

  it("the repo's measured ratios agree with the arithmetic to within 0.0003", () => {
    expect(Math.abs(tick(MEASURED.before.ticksPerSecond)!.ratio - MEASURED.before.ratio)).toBeLessThan(0.0003);
    expect(Math.abs(tick(MEASURED.after.ticksPerSecond)!.ratio - MEASURED.after.ratio)).toBeLessThan(0.0003);
  });

  it("rounding down always runs fast, never slow", () => {
    for (let tps = 1; tps <= CLOCK_HZ; tps += 37) {
      const t = tick(tps)!;
      expect(t.ratio, `${tps}`).toBeGreaterThanOrEqual(1);
      expect(t.cycles * tps, `${tps}`).toBeLessThanOrEqual(CLOCK_HZ);
    }
  });

  it("every divisor of the clock is exact", () => {
    for (const tps of [1, 100, 1000, 2000, 4000, 8000, 16000, 32000]) expect(tick(tps)!.ratio, `${tps}`).toBe(1);
  });

  it("a tick rate the clock cannot make is refused", () => {
    expect(tick(32001)).toBeNull();
    expect(tick(0)).toBeNull();
    expect(tick(10.5)).toBeNull();
    expect(tick(20000)!.ratio).toBeCloseTo(1.6, 12);
  });

  it("marks: the hardware's ticks land earlier than the kernel expects", () => {
    const m = tickMarks(tick(10000)!, 10);
    expect(m.expected[9]).toBeCloseTo(32, 9);
    expect(m.actual[9]).toBe(30);
    expect(tickMarks(tick(8000)!, 3)).toEqual({ expected: [4, 8, 12], actual: [4, 8, 12] });
  });
});

describe("the verdict", () => {
  it("is a warning with the numbers when the division rounds", () => {
    expect(driftVerdict(tick(10000))).toEqual({
      tone: "warn",
      title: "After 60 seconds the keyboard's clock says 64.0: 4.0 seconds fast.",
      body: "Every timer runs 6.7% fast: a timeout set for 1000 ms lasts 937.5 ms.",
    });
  });
  it("is ok only when nothing is rounded", () => {
    expect(driftVerdict(tick(8000)).tone).toBe("ok");
    expect(driftVerdict(tick(8000)).title).toBe("The clock keeps time: 60 seconds is 60 seconds.");
  });
  it("refuses a tick rate the clock cannot make", () => {
    expect(driftVerdict(null).tone).toBe("warn");
    expect(driftVerdict(null).body).toContain("1 to 32,000");
  });
  it("groups thousands without a locale", () => {
    expect(grouped(32000)).toBe("32,000");
    expect(grouped(100)).toBe("100");
    expect(grouped(1234567)).toBe("1,234,567");
  });
});
