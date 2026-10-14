import { describe, it, expect } from "vitest";
import { LABEL_SAFE, TEXT_BLOCK, clampToSafeArea, placeLabel, pushOffTextBlock } from "./labels";

const size = { width: 1440, height: 900 };
const HW = 78;


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

describe("placeLabel", () => {
  it("pushes then clamps", () => {
    const [x, y] = placeLabel(720, 450, HW, size);
    expect(x).toBe(720);
    expect(y).toBe(450 + TEXT_BLOCK.halfHeight);
    expect(placeLabel(-100, -100, HW, size)).toEqual([LABEL_SAFE.edge + HW, LABEL_SAFE.nav]);
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
