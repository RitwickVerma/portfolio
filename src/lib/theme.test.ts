import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { LIGHT, DARK, INK, hexToRgb, rgbTriplet, contrast, type Palette } from "./theme";

/** The declarations inside the first block that follows `marker` in the stylesheet. */
function block(css: string, marker: string): string {
  const at = css.indexOf(marker);
  expect(at, marker).toBeGreaterThan(-1);
  return css.slice(at, css.indexOf("}", at));
}

function expectMirrored(decls: string, p: Palette) {
  expect(decls).toContain(`--bg: ${p.BG};`);
  expect(decls).toContain(`--fg: ${p.FG};`);
  expect(decls).toContain(`--fg-rgb: ${rgbTriplet(p.FG)};`);
  expect(decls).toContain(`--muted: ${p.MUTED};`);
  expect(decls).toContain(`--accent: ${p.ACCENT};`);
  expect(decls).toContain(`--accent-rgb: ${rgbTriplet(p.ACCENT)};`);
  expect(decls).toContain(`--hit: ${p.HIT};`);
  expect(decls).toContain(`--warn: ${p.WARN};`);
  expect(decls).toContain(`--ok: ${p.OK};`);
}

describe("theme", () => {
  const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  it("globals.css carries the light palette", () => {
    expectMirrored(block(css, ":root {"), LIGHT);
  });

  it("globals.css carries the dark palette for an OS that asks for it and for the switch", () => {
    expectMirrored(block(css, "@media (prefers-color-scheme: dark)"), DARK);
    expectMirrored(block(css, ':root[data-theme="dark"] {'), DARK);
    // The switch can also force light on a dark OS.
    expect(css).toContain(':root:not([data-theme="light"])');
  });

  it.each([
    ["light", LIGHT],
    ["dark", DARK],
  ])("%s: text and links clear WCAG AAA, muted and fault text clear AA", (_name, p) => {
    expect(contrast(p.FG, p.BG)).toBeGreaterThan(12);
    expect(contrast(p.ACCENT, p.BG)).toBeGreaterThan(7);
    expect(contrast(p.MUTED, p.BG)).toBeGreaterThan(4.5);
    expect(contrast(p.WARN, p.BG)).toBeGreaterThan(4.5);
    expect(contrast(p.OK, p.BG)).toBeGreaterThan(4.5);
    // A highlighted match is ink on the highlighter in both schemes.
    expect(contrast(INK, p.HIT)).toBeGreaterThan(12);
  });

  it("converts", () => {
    expect(hexToRgb("#ff8000")).toEqual([255, 128, 0]);
    expect(rgbTriplet("#ff8000")).toBe("255 128 0");
  });
});
