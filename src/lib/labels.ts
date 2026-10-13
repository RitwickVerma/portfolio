// Screen-space layout for the hero rack labels. Pure functions, no three.js:
// unit-tested in labels.test.ts.
//
// Each label is anchored at its rack's projected position. Three rules, in
// order:
//   1. A label over the centred hero text block (name, value line, CTAs)
//      slides out through the nearest top/bottom edge. The push feathers to
//      zero across TEXT_BLOCK.feather px of horizontal distance so nothing
//      teleports as the scene turns.
//   2. Labels stay in the safe area: below the fixed nav, above the bottom
//      fade, off the canvas edges (holds down to 360px viewports).
//   3. Labels never stack. A later label that overlaps an earlier one is
//      pushed off it vertically and re-clamped.

export type Size = { width: number; height: number };
export type Point = [number, number];
export type LabelAnchor = { x: number; y: number; halfWidth: number };

export const LABEL_SAFE = {
  /** px below the top: clear of the fixed nav */
  nav: 80,
  /** px above the bottom: clear of the fade and the scroll cue */
  bottom: 120,
  /** px from the left/right canvas edges */
  edge: 12,
  /** rendered pill height, px */
  height: 26,
  /** minimum vertical gap between stacked pills, px */
  gap: 4,
} as const;

/** The centred hero text block as a half-size box around the canvas centre. */
export const TEXT_BLOCK = { halfWidth: 330, halfHeight: 180, feather: 140 } as const;

export function pushOffTextBlock(x: number, y: number, halfWidth: number, size: Size): number {
  const cx = size.width / 2;
  const cy = size.height / 2;
  const hw = TEXT_BLOCK.halfWidth + halfWidth;
  const dy = y - cy;
  const reach = (hw + TEXT_BLOCK.feather - Math.abs(x - cx)) / TEXT_BLOCK.feather;
  const fx = Math.min(Math.max(reach, 0), 1);
  if (fx > 0 && Math.abs(dy) < TEXT_BLOCK.halfHeight) {
    const dir = dy < 0 ? -1 : 1;
    return y + dir * (TEXT_BLOCK.halfHeight - Math.abs(dy)) * fx;
  }
  return y;
}

export function clampToSafeArea(x: number, y: number, halfWidth: number, size: Size): Point {
  const minX = LABEL_SAFE.edge + halfWidth;
  const maxX = Math.max(minX, size.width - LABEL_SAFE.edge - halfWidth);
  const maxY = Math.max(LABEL_SAFE.nav, size.height - LABEL_SAFE.bottom);
  return [
    Math.min(Math.max(x, minX), maxX),
    Math.min(Math.max(y, LABEL_SAFE.nav), maxY),
  ];
}

/** One label on its own: text-block push, then clamp. Used for the hover tooltip. */
export function placeLabel(x: number, y: number, halfWidth: number, size: Size): Point {
  return clampToSafeArea(x, pushOffTextBlock(x, y, halfWidth, size), halfWidth, size);
}

function overlaps(a: Point, aHw: number, b: Point, bHw: number): boolean {
  return (
    Math.abs(a[0] - b[0]) < aHw + bHw + LABEL_SAFE.gap &&
    Math.abs(a[1] - b[1]) < LABEL_SAFE.height + LABEL_SAFE.gap
  );
}

/**
 * Lay out every label at once. Greedy in input order: each label takes its own
 * spot if it is free, else the nearest free slot directly above or below a
 * label already placed in its column. Output order matches input.
 */
export function layoutLabels(anchors: readonly LabelAnchor[], size: Size): Point[] {
  const out: Point[] = [];
  const step = LABEL_SAFE.height + LABEL_SAFE.gap;

  for (const a of anchors) {
    const [x, y0] = placeLabel(a.x, a.y, a.halfWidth, size);
    const free = (y: number) =>
      out.every((o, j) => !overlaps([x, y], a.halfWidth, o, anchors[j].halfWidth));

    let best: Point = [x, y0];
    if (!free(y0)) {
      // Candidate slots sit just above and below every placed label that
      // shares this column; the one nearest the true anchor wins. Ties break
      // away from the canvas centre, which is where the hero text is.
      const away = y0 >= size.height / 2 ? 1 : -1;
      let bestDist = Infinity;
      for (let j = 0; j < out.length; j++) {
        if (Math.abs(out[j][0] - x) >= a.halfWidth + anchors[j].halfWidth + LABEL_SAFE.gap) continue;
        for (const dir of [away, -away]) {
          const [cx, cy] = clampToSafeArea(x, out[j][1] + dir * step, a.halfWidth, size);
          const d = Math.abs(cy - y0);
          if (d < bestDist && free(cy)) {
            best = [cx, cy];
            bestDist = d;
          }
        }
      }
    }
    out.push(best);
  }
  return out;
}
