// The palette, once. globals.css mirrors these as custom properties and
// theme.test.ts fails if the two drift. Everything that cannot read CSS (the
// OG renderer, the manifest, the viewport meta) imports from here.
//
// The "Index" design language (see /design). Ink on paper, in the vernacular
// of a results page: blue is somewhere you can go, yellow is something the
// engine found, and green and red appear only beside a measured change.

export interface Palette {
  BG: string;
  FG: string;
  MUTED: string;
  /** Links and anything you can act on. */
  ACCENT: string;
  /** The highlighter behind a search match. Always carries INK text. */
  HIT: string;
  WARN: string;
  /** A measured improvement: a rank that went up, a requirement that is met. Never decoration. */
  OK: string;
}

export const LIGHT: Palette = {
  BG: "#f1f2ee",
  FG: "#12161b",
  MUTED: "#566068",
  ACCENT: "#1a3fd0",
  HIT: "#ffe45c",
  WARN: "#b3261a",
  OK: "#17643a",
};

/** For visitors whose OS asks for dark. Same roles, same highlighter. */
export const DARK: Palette = {
  BG: "#0f1317",
  FG: "#e8ebe6",
  MUTED: "#97a1a6",
  ACCENT: "#9db4ff",
  HIT: "#ffe45c",
  WARN: "#ff8a7a",
  OK: "#7fd69b",
};

export const { BG, FG, MUTED, ACCENT, HIT, WARN, OK } = LIGHT;
/** Text on the highlighter, in either scheme. */
export const INK = LIGHT.FG;

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** "26 63 208" — for `rgb(var(--accent-rgb) / 0.2)` in CSS. */
export function rgbTriplet(hex: string): string {
  return hexToRgb(hex).join(" ");
}

/** WCAG relative luminance of a hex colour. */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colours, 1 to 21. */
export function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
