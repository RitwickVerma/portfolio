import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ACCENT, BG, FG, MUTED, WARN, hexToRgb, rgbTriplet, rgbUnit } from "./theme";

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

describe("theme", () => {
  it("globals.css carries the same values", () => {
    const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toContain(`--bg: ${BG};`);
    expect(css).toContain(`--fg: ${FG};`);
    expect(css).toContain(`--muted: ${MUTED};`);
    expect(css).toContain(`--accent: ${ACCENT};`);
    expect(css).toContain(`--accent-rgb: ${rgbTriplet(ACCENT)};`);
    expect(css).toContain(`--warn: ${WARN};`);
  });

  it("text and accent clear WCAG AA on the background; muted clears it for small text", () => {
    expect(contrast(FG, BG)).toBeGreaterThan(12);
    expect(contrast(ACCENT, BG)).toBeGreaterThan(7);
    expect(contrast(MUTED, BG)).toBeGreaterThan(4.5);
    expect(contrast(WARN, BG)).toBeGreaterThan(4.5);
  });

  it("converts", () => {
    expect(hexToRgb("#ff8000")).toEqual([255, 128, 0]);
    expect(rgbTriplet("#ff8000")).toBe("255 128 0");
    expect(rgbUnit("#ff8000").map((v) => +v.toFixed(2))).toEqual([1, 0.5, 0]);
  });
});
