// Isometric projection + the exploded-view layout of the homelab drawing (Fig. 1).
// Pure functions only, so the geometry is unit-tested and the component stays a
// thin renderer. World axes: x runs right-down, y runs left-down, z is up.

export type Vec3 = readonly [number, number, number];
export type Pt = readonly [number, number];

export const COS30 = Math.cos(Math.PI / 6);

/** World → screen (unscaled). Equal unit vectors along x and y; z is straight up. */
export function iso([x, y, z]: Vec3, s = 1): Pt {
  return [(x - y) * COS30 * s, ((x + y) * 0.5 - z) * s];
}

export type Box = { x: number; y: number; z: number; w: number; d: number; h: number };

/** The three visible faces of a box, as closed SVG path strings (screen space). */
export function boxFaces(b: Box, s: number) {
  const { x, y, z, w, d, h } = b;
  const P = (p: Vec3) => iso(p, s);
  const path = (pts: Pt[]) => "M" + pts.map(([a, c]) => `${r(a)} ${r(c)}`).join("L") + "Z";
  return {
    top: path([P([x, y, z + h]), P([x + w, y, z + h]), P([x + w, y + d, z + h]), P([x, y + d, z + h])]),
    left: path([P([x, y + d, z]), P([x + w, y + d, z]), P([x + w, y + d, z + h]), P([x, y + d, z + h])]),
    right: path([P([x + w, y, z]), P([x + w, y + d, z]), P([x + w, y + d, z + h]), P([x + w, y, z + h])]),
  };
}

/** Round to 0.1 px — keeps the SVG small and the output deterministic. */
export function r(n: number) {
  return Math.round(n * 10) / 10;
}

/** Painter's order: further boxes (smaller x+y, lower z) are drawn first. */
export function paintOrder<T extends Box>(boxes: T[]): T[] {
  return [...boxes].sort((a, b) => a.x + a.y - (b.x + b.y) || a.z - b.z);
}

/** SVG `matrix()` that lays flat text onto a horizontal plane at height z. */
export function planeMatrix(origin: Vec3, s: number): string {
  const [tx, ty] = iso(origin, s);
  return `matrix(${r(COS30 * s)} ${0.5 * s} ${r(-COS30 * s)} ${0.5 * s} ${r(tx)} ${r(ty)})`;
}

// ---------------------------------------------------------------------------
// Fig. 1 layout: one physical host, its 15 guests exploded above it.

export const HOST: Box = { x: 0, y: 0, z: 0, w: 14.2, d: 8.5, h: 1.5 };
export const GUEST_Z = 5.4;
export const GUEST = { w: 1.55, d: 1.55, h: 0.95 };
const COLS = 5;
const STEP_X = 2.85;
const STEP_Y = 2.85;
const ORIGIN = { x: 0.62, y: 0.7 };

export type GuestBox = Box & { id: string; col: number; row: number };

/** Lay guests out row-major in ID order on the exploded plane, centred over the host. */
export function layoutGuests(ids: string[]): GuestBox[] {
  return ids.map((id, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    return {
      id,
      col,
      row,
      x: ORIGIN.x + col * STEP_X,
      y: ORIGIN.y + row * STEP_Y,
      z: GUEST_Z,
      ...GUEST,
    };
  });
}

/**
 * Guest placement order (row-major, back row first). The two guests the request
 * touches — the gateway and this site — sit together on the FRONT row, so the
 * request path reaches them without crossing any other box.
 */
export const DRAW_ORDER = [
  "VM100", "CT101", "CT102", "CT104", "CT108",
  "CT105", "CT106", "CT107", "CT111", "CT113",
  "VM110", "CT114", "CT115", "CT116", "CT117",
];

/** Convex hull (Andrew's monotone chain) — a box's on-screen silhouette is the hull of its 8 projected corners. */
export function hull(points: Pt[]): Pt[] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Pt[] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: Pt[] = [];
  for (const q of [...p].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/** Separating-axis test: do two convex polygons overlap (touching edges count as apart)? */
export function convexOverlap(A: Pt[], B: Pt[]): boolean {
  for (const poly of [A, B]) {
    for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i];
      const [x2, y2] = poly[(i + 1) % poly.length];
      const nx = y2 - y1;
      const ny = x1 - x2;
      const proj = (P: Pt[]) => P.map(([x, y]) => x * nx + y * ny);
      const a = proj(A);
      const b = proj(B);
      if (Math.max(...a) <= Math.min(...b) + 1e-6 || Math.max(...b) <= Math.min(...a) + 1e-6) return false;
    }
  }
  return true;
}

/** Do two boxes' projected silhouettes overlap on screen? */
export function screenOverlap(a: Box, b: Box, s: number) {
  return convexOverlap(hull(corners(a).map((p) => iso(p, s))), hull(corners(b).map((p) => iso(p, s))));
}

/** Top-face footprint of a guest, projected onto the host's top face (exploded-view ghost). */
export function footprint(g: Box, hostTop: number): Box {
  return { ...g, z: hostTop, h: 0 };
}

/** Centre of a box's top face. */
export function topCentre(b: Box): Vec3 {
  return [b.x + b.w / 2, b.y + b.d / 2, b.z + b.h];
}

/** Screen-space bounding box of a set of points. */
export function bounds(pts: Pt[]) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

/** Corners of a box, for bounds. */
export function corners(b: Box): Vec3[] {
  const out: Vec3[] = [];
  for (const dx of [0, b.w]) for (const dy of [0, b.d]) for (const dz of [0, b.h]) out.push([b.x + dx, b.y + dy, b.z + dz]);
  return out;
}
