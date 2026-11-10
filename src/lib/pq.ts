// The colour chain of TizenAmbilight's HDR path, ported from VideoPlaneCapture.cs
// (PqNits, BuildPqToSdrTable, YuvToRgb, ApplyGamut709). The constants and the
// arithmetic follow the C# line for line, including its rounding, so the figure
// computes what the app computes. Pure and deterministic; no clock, no canvas.
//
// What it is not: the app's median-driven adaptive gamma, its smoothing, its zone
// averaging or the NV12 plane itself. `encodePlane` stands in for the TV by
// encoding a colour you choose; nothing here is read from a TV.

export type Rgb = [number, number, number];

// SMPTE ST 2084 constants, written as the standard writes them (and as the C# does).
export const M1 = 2610 / 16384; // 0.1593017578125
export const M2 = (2523 / 4096) * 128; // 78.84375
export const C1 = 3424 / 4096; // 0.8359375
export const C2 = (2413 / 4096) * 32; // 18.8515625
export const C3 = (2392 / 4096) * 32; // 18.6875
export const PQ_PEAK = 10000;
/** HdrPeakNits in the C#: the HDR convention for diffuse white, mapped to full scale. */
export const REF_WHITE = 203;

/** PQ signal, 0 to 1, to absolute luminance in nits (the ST 2084 EOTF). */
export function pqToNits(n: number): number {
  const nm = Math.pow(n, 1 / M2);
  const num = Math.max(nm - C1, 0);
  const den = C2 - C3 * nm;
  return den > 1e-9 ? PQ_PEAK * Math.pow(num / den, 1 / M1) : 0;
}

/** Absolute luminance in nits to PQ signal, 0 to 1 (the inverse EOTF). */
export function nitsToPq(nits: number): number {
  if (nits <= 0) return 0;
  const y = Math.pow(Math.min(nits, PQ_PEAK) / PQ_PEAK, M1);
  return Math.pow((C1 + C2 * y) / (1 + C3 * y), M2);
}

/** `PqNits` in the C#: nits of an 8-bit PQ code. */
export function pqCodeNits(code: number): number {
  const c = code < 0 ? 0 : code > 255 ? 255 : code;
  return pqToNits(c / 255);
}

/** The C# `Clamp255`: round half up, clamp to 0..255. */
export function clamp255(x: number): number {
  if (x <= 0) return 0;
  if (x >= 255) return 255;
  return Math.floor(x + 0.5);
}

/** `BuildPqToSdrTable`: PQ code to SDR value, BT.1886 gamma 2.4, `refNits` mapped to 255 and clipped above. */
export function pqToSdrTable(refNits: number = REF_WHITE): number[] {
  const ref = refNits <= 0 ? REF_WHITE : refNits;
  const t: number[] = [];
  for (let code = 0; code < 256; code++) {
    const x = pqCodeNits(code) / ref;
    let out = x <= 0 ? 0 : 255 * Math.pow(x, 1 / 2.4);
    if (out > 255) out = 255;
    t.push(Math.floor(out + 0.5));
  }
  return t;
}

/** `ApplyGamut709`: BT.2020 to BT.709 in linear light, soft-mapped back into gamut, re-encoded at gamma 2.4. */
export function applyGamut709([R, G, B]: Rgb): Rgb {
  const rl = Math.pow(R / 255, 2.4);
  const gl = Math.pow(G / 255, 2.4);
  const bl = Math.pow(B / 255, 2.4);
  let r7 = 1.6605 * rl - 0.5876 * gl - 0.0728 * bl;
  let g7 = -0.1246 * rl + 1.1329 * gl - 0.0083 * bl;
  let b7 = -0.0182 * rl - 0.1006 * gl + 1.1187 * bl;

  // Desaturate toward the colour's own luminance by the smallest amount that brings it in gamut.
  const lum = 0.2126 * r7 + 0.7152 * g7 + 0.0722 * b7;
  let t = 0;
  for (const dc of [r7, g7, b7]) {
    if (dc < 0) {
      const need = lum - dc > 1e-9 ? -dc / (lum - dc) : 1;
      if (need > t) t = need;
    }
  }
  for (const dc of [r7, g7, b7]) {
    if (dc > 1) {
      const need = lum - dc < -1e-9 ? (dc - 1) / (dc - lum) : 1;
      if (need > t) t = need;
    }
  }
  if (t > 1) t = 1;
  r7 += (lum - r7) * t;
  g7 += (lum - g7) * t;
  b7 += (lum - b7) * t;
  const c = (v: number) => clamp255(255 * Math.pow(Math.min(Math.max(v, 0), 1), 1 / 2.4));
  return [c(r7), c(g7), c(b7)];
}

/** How the plane is decoded. "luma" is the app; "channel" is the tempting alternative; "ignored" treats PQ as SDR. */
export type Decode = "luma" | "channel" | "ignored";

export interface Stages {
  /** Linear light the sample carries, BT.2020 primaries, nits per channel. */
  nits: Rgb;
  /** PQ code of each channel, 0 to 255, before the plane's rounding. */
  pq: Rgb;
  /** The plane's bytes: BT.2020 non-constant-luminance, full range. */
  yuv: Rgb;
  /** R, G, B recovered from Y, U, V, still in the PQ code domain (HDR decodes only). */
  r0: Rgb;
  /** Luma of `r0` with the BT.2020 coefficients (HDR decodes only). */
  luma: number;
  /** The tone-mapped luma, `T[luma]` (luma decode only). */
  toneLuma: number | null;
  /** The factor R, G, B were scaled by (luma decode only). */
  scale: number | null;
  /** After tone mapping, before the gamut step. */
  scaled: Rgb;
  /** What goes to the LED. */
  led: Rgb;
}

/** Stand-in for the TV: encode linear BT.2020 light into the Y, U, V bytes the plane would hold. */
export function encodePlane(nits: Rgb): { pq: Rgb; yuv: Rgb } {
  const pq = nits.map((n) => 255 * nitsToPq(n)) as Rgb;
  const [r, g, b] = pq;
  const y = 0.2627 * r + 0.678 * g + 0.0593 * b;
  const cb = (b - y) / 1.8814;
  const cr = (r - y) / 1.4746;
  return { pq, yuv: [clamp255(y), clamp255(128 + cb), clamp255(128 + cr)] };
}

export const SDR_TABLE = pqToSdrTable();
const TABLE = SDR_TABLE;

/** The non-HDR branch of `YuvToRgb`: BT.601 limited range, integer maths. This is "PQ ignored". */
export function yuvIgnoringPq(Y: number, U: number, V: number): Rgb {
  const yy = Math.max(Y - 16, 0);
  const uu = U - 128;
  const vv = V - 128;
  const R = (298 * yy + 409 * vv + 128) >> 8;
  const G = (298 * yy - 100 * uu - 208 * vv + 128) >> 8;
  const B = (298 * yy + 516 * uu + 128) >> 8;
  const c = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
  return [c(R), c(G), c(B)];
}

function convertYuv(nits: Rgb, pq: Rgb, yuv: Rgb, decode: Decode): Stages {
  const [Y, U, V] = yuv;
  if (decode === "ignored") {
    const led = yuvIgnoringPq(Y, U, V);
    return { nits, pq, yuv, r0: led, luma: Y, toneLuma: null, scale: null, scaled: led, led };
  }
  const cb = U - 128;
  const cr = V - 128;
  const r0 = clamp255(Y + 1.4746 * cr);
  const g0 = clamp255(Y - 0.164553 * cb - 0.571353 * cr);
  const b0 = clamp255(Y + 1.8814 * cb);
  const L0 = 0.2627 * r0 + 0.678 * g0 + 0.0593 * b0;
  let scaled: Rgb;
  let toneLuma: number | null = null;
  let scale: number | null = null;
  if (decode === "channel") {
    scaled = [TABLE[r0], TABLE[g0], TABLE[b0]];
  } else if (L0 <= 0.5) {
    toneLuma = TABLE[clamp255(L0)];
    scaled = [toneLuma, toneLuma, toneLuma];
  } else {
    toneLuma = TABLE[clamp255(L0)];
    scale = toneLuma / L0;
    scaled = [clamp255(r0 * scale), clamp255(g0 * scale), clamp255(b0 * scale)];
  }
  return { nits, pq, yuv, r0: [r0, g0, b0], luma: L0, toneLuma, scale, scaled, led: applyGamut709(scaled) };
}

/** Every stage for a colour given as linear BT.2020 light. */
export function toLed(nits: Rgb, decode: Decode): Stages {
  const { pq, yuv } = encodePlane(nits);
  return convertYuv(nits, pq, yuv, decode);
}

/** The ignoring-PQ line for a grey: what the plane's luma byte becomes under the BT.601 branch. */
export function ignoredGrey(code: number): number {
  return yuvIgnoringPq(code, 128, 128)[0];
}

/** HSV-style saturation, (max - min) / max, for comparing how colourful an output is. */
export function chroma([r, g, b]: Rgb): number {
  const mx = Math.max(r, g, b);
  return mx === 0 ? 0 : (mx - Math.min(r, g, b)) / mx;
}

/** Slider position 0..100 to nits on a log scale from `lo` to `hi`. */
export function indexToNits(i: number, lo = 0.05, hi = 4000): number {
  return lo * Math.pow(hi / lo, i / 100);
}
export function nitsToIndex(n: number, lo = 0.05, hi = 4000): number {
  return (100 * Math.log(n / lo)) / Math.log(hi / lo);
}
