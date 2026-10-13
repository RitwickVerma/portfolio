import { describe, it, expect } from "vitest";
import {
  LABEL_SAFE,
  TEXT_BLOCK,
  clampToSafeArea,
  layoutLabels,
  placeLabel,
  pushOffTextBlock,
  type Point,
} from "./labels";

const size = { width: 1440, height: 900 };
const HW = 78;

const overlap = (a: Point, b: Point) =>
  Math.abs(a[0] - b[0]) < HW * 2 + LABEL_SAFE.gap &&
  Math.abs(a[1] - b[1]) < LABEL_SAFE.height + LABEL_SAFE.gap;

describe("pushOffTextBlock", () => {
  it("leaves a label alone when it is clear of the text block", () => {
    expect(pushOffTextBlock(100, 100, HW, size)).toBe(100);
    expect(pushOffTextBlock(720, 100, HW, size)).toBe(100);
  });

  it("pushes a label over the text block out through the nearest edge", () => {
    const cy = size.height / 2;
    expect(pushOffTextBlock(720, cy - 10, HW, size)).toBe(cy - TEXT_BLOCK.halfHeight);
    expect(pushOffTextBlock(720, cy + 10, HW, size)).toBe(cy + TEXT_BLOCK.halfHeight);
  });

  it("feathers the push to zero with horizontal distance", () => {
    const cy = size.height / 2;
    const full = pushOffTextBlock(720, cy - 10, HW, size);
    const half = pushOffTextBlock(720 + TEXT_BLOCK.halfWidth + HW + TEXT_BLOCK.feather / 2, cy - 10, HW, size);
    const none = pushOffTextBlock(720 + TEXT_BLOCK.halfWidth + HW + TEXT_BLOCK.feather, cy - 10, HW, size);
    expect(full).toBeLessThan(half);
    expect(half).toBeLessThan(none);
    expect(none).toBe(cy - 10);
  });
});

describe("clampToSafeArea", () => {
  it("keeps labels below the nav, above the bottom fade and inside the edges", () => {
    expect(clampToSafeArea(-500, -500, HW, size)).toEqual([LABEL_SAFE.edge + HW, LABEL_SAFE.nav]);
    expect(clampToSafeArea(5000, 5000, HW, size)).toEqual([
      size.width - LABEL_SAFE.edge - HW,
      size.height - LABEL_SAFE.bottom,
    ]);
  });

  it("never inverts on a viewport narrower than one label", () => {
    const [x] = clampToSafeArea(100, 100, HW, { width: 100, height: 400 });
    expect(x).toBe(LABEL_SAFE.edge + HW);
  });
});

describe("layoutLabels", () => {
  it("returns one point per anchor, in order", () => {
    const anchors = [
      { x: 200, y: 150, halfWidth: HW },
      { x: 900, y: 150, halfWidth: HW },
    ];
    const out = layoutLabels(anchors, size);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual(placeLabel(200, 150, HW, size));
    expect(out[1]).toEqual(placeLabel(900, 150, HW, size));
  });

  it("separates two labels that project onto the same spot", () => {
    const out = layoutLabels(
      [
        { x: 1120, y: 270, halfWidth: HW },
        { x: 1230, y: 261, halfWidth: HW },
      ],
      size,
    );
    expect(overlap(out[0], out[1])).toBe(false);
    // The first label is the anchor; the second moves, and only vertically.
    expect(out[0]).toEqual([1120, 270]);
    expect(out[1][0]).toBe(1230);
  });

  it("stacks many coincident labels without any pair overlapping", () => {
    const anchors = Array.from({ length: 6 }, () => ({ x: 400, y: 200, halfWidth: HW }));
    const out = layoutLabels(anchors, size);
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        expect(overlap(out[i], out[j]), `${i} vs ${j}`).toBe(false);
      }
    }
  });

  it("flips direction when pushing down would leave the safe area", () => {
    const bottom = size.height - LABEL_SAFE.bottom;
    const out = layoutLabels(
      [
        { x: 300, y: bottom + 50, halfWidth: HW }, // clamps to the bottom edge
        { x: 300, y: bottom + 60, halfWidth: HW }, // also clamps there: must go up
      ],
      size,
    );
    expect(out[0][1]).toBe(bottom);
    expect(out[1][1]).toBeLessThan(bottom);
    expect(overlap(out[0], out[1])).toBe(false);
  });

  it("keeps every placed label inside the safe area", () => {
    const anchors = Array.from({ length: 8 }, (_, i) => ({ x: 700 + i * 3, y: 440 + i, halfWidth: HW }));
    for (const [x, y] of layoutLabels(anchors, size)) {
      expect(x).toBeGreaterThanOrEqual(LABEL_SAFE.edge + HW);
      expect(x).toBeLessThanOrEqual(size.width - LABEL_SAFE.edge - HW);
      expect(y).toBeGreaterThanOrEqual(LABEL_SAFE.nav);
      expect(y).toBeLessThanOrEqual(size.height - LABEL_SAFE.bottom);
    }
  });
});
