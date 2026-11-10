import { describe, expect, it } from "vitest";
import {
  C1, C2, C3, M1, M2, REF_WHITE, applyGamut709, chroma, clamp255, encodePlane, ignoredGrey,
  indexToNits, nitsToIndex, nitsToPq, pqCodeNits, pqToNits, pqToSdrTable, toLed, yuvIgnoringPq,
} from "./pq";

describe("PQ constants (SMPTE ST 2084, and the C# in VideoPlaneCapture.cs)", () => {
  it("are the standard's decimals", () => {
    expect(M1).toBe(0.1593017578125);
    expect(M2).toBe(78.84375);
    expect(C1).toBe(0.8359375);
    expect(C2).toBe(18.8515625);
    expect(C3).toBe(18.6875);
    // The standard defines c1 = c3 - c2 + 1.
    expect(C3 - C2 + 1).toBeCloseTo(C1, 12);
  });
});

describe("PQ transfer, against published reference points", () => {
  it("anchors the ends: 0 is 0 nits, 1 is 10000", () => {
    expect(pqToNits(0)).toBe(0);
    expect(pqToNits(1)).toBeCloseTo(10000, 6);
    expect(nitsToPq(0)).toBe(0);
    expect(nitsToPq(10000)).toBeCloseTo(1, 12);
  });
  it("matches ITU-R BT.2408: 203 nits is about 58% signal, 1000 nits about 75%", () => {
    expect(nitsToPq(203)).toBeCloseTo(0.58, 2);
    expect(nitsToPq(1000)).toBeCloseTo(0.75, 2);
    expect(nitsToPq(100)).toBeCloseTo(0.508, 3);
  });
  it("puts 203 nits at code 148.1 of 255, as the C# comment says", () => {
    expect(nitsToPq(203) * 255).toBeCloseTo(148.08, 2);
    expect(pqCodeNits(148)).toBeCloseTo(203, -0.5);
    expect(Math.abs(pqCodeNits(148) - 203)).toBeLessThan(0.6);
  });
  it("round-trips across the range", () => {
    for (const n of [0.05, 0.2, 1, 10, 100, 203, 1000, 4000, 9999]) {
      expect(pqToNits(nitsToPq(n))).toBeCloseTo(n, 6);
    }
  });
  it("clamps like PqNits: codes outside 0..255 read as the ends", () => {
    expect(pqCodeNits(-5)).toBe(0);
    expect(pqCodeNits(999)).toBeCloseTo(10000, 6);
  });
});

describe("the PQ to SDR table (BuildPqToSdrTable)", () => {
  const t = pqToSdrTable();
  it("is 256 entries, monotonic, 0 to 255", () => {
    expect(t).toHaveLength(256);
    expect(t[0]).toBe(0);
    expect(t[255]).toBe(255);
    for (let i = 1; i < 256; i++) expect(t[i]).toBeGreaterThanOrEqual(t[i - 1]);
  });
  it("reaches full scale at the 203 nit reference and clips above it", () => {
    expect(REF_WHITE).toBe(203);
    expect(t[148]).toBe(255);
    expect(t[147]).toBeLessThan(255);
    for (let i = 148; i < 256; i++) expect(t[i]).toBe(255);
  });
  it("follows gamma 2.4 below the reference: 100 nits is 255 * (100/203)^(1/2.4)", () => {
    expect(t[130]).toBe(Math.floor(255 * Math.pow(pqCodeNits(130) / 203, 1 / 2.4) + 0.5));
    expect(t[130]).toBeGreaterThan(185);
    expect(t[130]).toBeLessThan(195);
  });
  it("a different reference moves the clip point", () => {
    const t1000 = pqToSdrTable(1000);
    expect(t1000[148]).toBeLessThan(255);
    expect(t1000[192]).toBe(255);
  });
});

describe("ignoring PQ (the non-HDR branch)", () => {
  it("code 148 comes out as 154 instead of 255, the C# comment's own example", () => {
    expect(ignoredGrey(148)).toBe(154);
    expect(pqToSdrTable()[148]).toBe(255);
  });
  it("is BT.601 limited range: black at 16, a straight line above", () => {
    expect(ignoredGrey(16)).toBe(0);
    expect(ignoredGrey(0)).toBe(0);
    expect(ignoredGrey(235)).toBe(255);
    expect(yuvIgnoringPq(128, 128, 128)).toEqual([130, 130, 130]);
  });
});

describe("gamut step (ApplyGamut709)", () => {
  it("leaves neutrals neutral", () => {
    for (const v of [0, 40, 128, 255]) {
      const [r, g, b] = applyGamut709([v, v, v]);
      expect(Math.abs(r - g)).toBeLessThanOrEqual(1);
      expect(Math.abs(g - b)).toBeLessThanOrEqual(1);
      expect(Math.abs(r - v)).toBeLessThanOrEqual(1);
    }
  });
  it("soft-maps BT.2020 green onto the 709 gamut edge, desaturating by the least amount: the channel that was out of gamut ends on the edge, the others keep light", () => {
    const [r, g, b] = applyGamut709([0, 255, 0]);
    expect(r).toBe(0); // the most negative channel lands exactly on the edge
    expect(b).toBeGreaterThan(0); // the other one is pulled along, not crushed
    expect(g).toBeGreaterThan(200);
    expect(g).toBeLessThan(255);
  });
  it("a colour already inside the 709 gamut is not touched by the soft map: only the matrix applies", () => {
    const [r, g, b] = applyGamut709([120, 100, 90]);
    expect(r).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(0);
  });
  it("stays in range for anything", () => {
    for (const rgb of [[255, 0, 0], [0, 0, 255], [255, 255, 0], [10, 200, 30]] as const) {
      for (const v of applyGamut709([...rgb])) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(255);
      }
    }
  });
  it("clamp255 rounds half up", () => {
    expect(clamp255(0.5)).toBe(1);
    expect(clamp255(254.4)).toBe(254);
    expect(clamp255(-3)).toBe(0);
    expect(clamp255(300)).toBe(255);
  });
});

describe("the whole chain", () => {
  it("a neutral stays neutral through the luma path", () => {
    const s = toLed([100, 100, 100], "luma");
    expect(s.led[0]).toBe(s.led[1]);
    expect(s.led[1]).toBe(s.led[2]);
    expect(s.yuv[1]).toBe(128);
    expect(s.yuv[2]).toBe(128);
  });
  it("encodes the plane the way the app reads it: 203 nit grey is code 148", () => {
    const { pq, yuv } = encodePlane([203, 203, 203]);
    expect(Math.round(pq[0])).toBe(148);
    expect(yuv[0]).toBe(148);
  });
  it("grey at 203 nits reaches full scale; at 100 nits it sits near 190", () => {
    expect(toLed([203, 203, 203], "luma").led).toEqual([255, 255, 255]);
    const v = toLed([100, 100, 100], "luma").led[0];
    expect(v).toBeGreaterThan(185);
    expect(v).toBeLessThan(195);
  });
  it("above the reference a coloured zone pins its luma at 255; the table is the reason it can go white", () => {
    const s = toLed([2000, 700, 100], "luma");
    expect(s.toneLuma).toBe(255);
  });
  it("ignoring PQ darkens mid-bright greys: the upper half of the signal is thrown away", () => {
    expect(toLed([100, 100, 100], "ignored").led[0]).toBeLessThan(toLed([100, 100, 100], "luma").led[0] - 40);
  });
  it("per-channel tone mapping widens the gaps between channels (the +18% the note reports)", () => {
    const orange: [number, number, number] = [100, 33, 5];
    const luma = toLed(orange, "luma");
    const chan = toLed(orange, "channel");
    expect(chroma(chan.scaled)).toBeGreaterThan(chroma(luma.scaled));
  });
  it("is deterministic", () => {
    expect(toLed([50, 20, 3], "luma")).toEqual(toLed([50, 20, 3], "luma"));
  });
});

describe("slider mapping", () => {
  it("is log and invertible", () => {
    expect(indexToNits(0)).toBeCloseTo(0.05, 10);
    expect(indexToNits(100)).toBeCloseTo(4000, 6);
    expect(nitsToIndex(indexToNits(37))).toBeCloseTo(37, 10);
  });
});
