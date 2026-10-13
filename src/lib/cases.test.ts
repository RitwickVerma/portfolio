import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { CASES, PLUTUS_STAGES, ZONE_SAMPLE, ZONES } from "./cases";

// The case studies quote the same measured numbers in several places (index
// row, headline figure, figure captions). These tests keep them from drifting.

describe("case studies", () => {
  it("every case has a page on disk", () => {
    for (const c of CASES) expect(existsSync(`src/app/(site)/work/${c.slug}/page.tsx`), c.slug).toBe(true);
  });

  it("indexes are sequential", () => {
    expect(CASES.map((c) => c.idx)).toEqual(["01", "02", "03"]);
  });

  it("ambilight: 73 zones (23 + 24 + 13 + 13)", () => {
    expect(ZONES.top + ZONES.bottom + ZONES.left + ZONES.right).toBe(73);
  });

  it("ambilight: headline figure matches the measured shipped setting", () => {
    const shipped = ZONE_SAMPLE.find((z) => z.zs === 3)!;
    const amb = CASES.find((c) => c.slug === "ambilight")!;
    expect(amb.figure.value).toBe(`8 → ${Math.floor(shipped.fps)}`);
    // frame rate rises and error grows monotonically with the sampling step
    for (let i = 1; i < ZONE_SAMPLE.length; i++) {
      expect(ZONE_SAMPLE[i].fps).toBeGreaterThan(ZONE_SAMPLE[i - 1].fps);
      expect(ZONE_SAMPLE[i].meanErr).toBeGreaterThan(ZONE_SAMPLE[i - 1].meanErr);
    }
  });

  it("plutus: headline figure is the final walk-forward stage", () => {
    const last = PLUTUS_STAGES[PLUTUS_STAGES.length - 1];
    const pl = CASES.find((c) => c.slug === "plutus")!;
    expect(pl.figure.value).toBe(`+${last.value}%`);
    expect(pl.figure.label).toContain(`+${last.bench}%`);
  });

  it("the home page and case pages quote the same numbers", () => {
    const home = readFileSync("src/app/(site)/page.tsx", "utf8");
    const amb = readFileSync("src/app/(site)/work/ambilight/page.tsx", "utf8");
    expect(home).toContain("8 → 46");
    expect(amb).toContain("46.4 fps");
    expect(amb).toContain("116 ms a frame");
  });

  it("never claims a Play Store listing, private addresses or retired services", () => {
    const blob = ["src/app/(site)/page.tsx", ...CASES.map((c) => `src/app/(site)/work/${c.slug}/page.tsx`)]
      .map((f) => readFileSync(f, "utf8"))
      .join("\n");
    expect(blob).not.toMatch(/google play|play store/i);
    expect(blob).not.toMatch(/\b(?:69\.69\.69|192\.168)\.\d+/);
    expect(blob).not.toMatch(/jellyfin|debrid/i);
  });
});
