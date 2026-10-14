// Screen-space placement for the hero's hover tooltip. Pure, no three.js:
// unit-tested in labels.test.ts.
//
// The tooltip is anchored at its rack's projected position. Two rules:
//   1. Over the centred hero text block (name, value line, CTAs) it slides
//      out through the nearest top/bottom edge. The push feathers to zero
//      across TEXT_BLOCK.feather px of horizontal distance so nothing
//      teleports as the scene turns.
//   2. It stays in the safe area: below the fixed nav, above the bottom
//      fade, off the canvas edges (holds down to 360px viewports).

export type Size = { width: number; height: number };
export type Point = [number, number];

export const LABEL_SAFE = {
  /** px below the top: clear of the fixed nav */
  nav: 80,
  /** px above the bottom: clear of the fade and the scroll cue */
  bottom: 120,
  /** px from the left/right canvas edges */
  edge: 12,
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

/** Text-block push, then clamp. */
export function placeLabel(x: number, y: number, halfWidth: number, size: Size): Point {
  return clampToSafeArea(x, pushOffTextBlock(x, y, halfWidth, size), halfWidth, size);
}
