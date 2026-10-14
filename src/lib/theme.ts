// The palette, once. globals.css mirrors these as custom properties and
// theme.test.ts fails if the two drift. Everything that cannot read CSS
// (three.js materials, the GLSL backdrop, xterm, the OG renderer, the
// manifest) imports from here.
//
// Warm black, bone text, one amber accent. Amber is a machine-room colour:
// status LEDs, phosphor terminals. Red is reserved for faults.

export const BG = "#0c0b09";
export const FG = "#ebe7df";
export const MUTED = "#8f8a80";
export const ACCENT = "#f0b35a";
/** The gateway rack is the one machine everything passes through; it gets the one cool colour. */
export const GATEWAY = "#9fd6ff";
export const WARN = "#ff5a4e";

/** Rack bodies in the hero and the poster. */
export const RACK_BODY = "#1a1814";
export const RACK_BODY_GATEWAY = "#24201a";
export const RACK_FLOOR = "#12100d";
/** Scene light: warm white, so painted steel reads as steel and only the LEDs are amber. */
export const ROOM_LIGHT = "#fff0dc";
/** Dark ink used on the accent button and on screen headers. */
export const INK = "#0c0b09";

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** "240 179 90" — for `rgb(var(--accent-rgb) / 0.2)` in CSS. */
export function rgbTriplet(hex: string): string {
  return hexToRgb(hex).join(" ");
}

/** [0.94, 0.70, 0.35] — for GLSL. */
export function rgbUnit(hex: string): [number, number, number] {
  return hexToRgb(hex).map((c) => c / 255) as [number, number, number];
}
