import { describe, expect, it } from "vitest";
import { COS30, DRAW_ORDER, HOST, boxFaces, convexOverlap, corners, hull, iso, layoutGuests, paintOrder, planeMatrix, screenOverlap, topCentre } from "./iso";
import { services } from "./data";

describe("iso projection", () => {
  it("maps the axes the way the drawing assumes", () => {
    expect(iso([0, 0, 0])).toEqual([0, 0]);
    const [xRight, xDown] = iso([1, 0, 0]);
    expect(xRight).toBeCloseTo(COS30);
    expect(xDown).toBeCloseTo(0.5);
    const [yLeft, yDown] = iso([0, 1, 0]);
    expect(yLeft).toBeCloseTo(-COS30);
    expect(yDown).toBeCloseTo(0.5);
    expect(iso([0, 0, 1])).toEqual([0, -1]); // z is straight up on screen
  });

  it("scales linearly", () => {
    const [a, b] = iso([2, 1, 3], 10);
    const [c, d] = iso([2, 1, 3]);
    expect(a).toBeCloseTo(c * 10);
    expect(b).toBeCloseTo(d * 10);
  });
});

describe("boxFaces", () => {
  it("emits three closed quads", () => {
    const f = boxFaces({ x: 0, y: 0, z: 0, w: 1, d: 1, h: 1 }, 10);
    for (const p of [f.top, f.left, f.right]) {
      expect(p.startsWith("M")).toBe(true);
      expect(p.endsWith("Z")).toBe(true);
      expect(p.split("L")).toHaveLength(4);
    }
  });
});

describe("homelab layout", () => {
  const guests = layoutGuests(DRAW_ORDER);

  it("draws exactly the real guests, each once", () => {
    expect([...DRAW_ORDER].sort()).toEqual(services.map((s) => s.ct).sort());
  });

  it("puts the gateway and this site side by side on the front row", () => {
    const gw = guests.find((g) => g.id === "VM110")!;
    const site = guests.find((g) => g.id === "CT114")!;
    expect(gw.row).toBe(2);
    expect(site.row).toBe(2);
    expect(Math.abs(gw.col - site.col)).toBe(1);
  });

  it("leaves air between guests on screen (no projected overlap) — a true exploded view", () => {
    for (let i = 0; i < guests.length; i++)
      for (let j = i + 1; j < guests.length; j++) {
        const a = guests[i];
        const b = guests[j];
        // only diagonal neighbours can collide in iso; they must not
        expect(screenOverlap(a, b, 24), `${a.id} vs ${b.id}`).toBe(false);
      }
  });

  it("places one box per real guest", () => {
    expect(guests).toHaveLength(services.length);
    expect(new Set(guests.map((g) => g.id)).size).toBe(services.length);
  });

  it("keeps every guest inside the host footprint (a true exploded view)", () => {
    for (const g of guests) {
      expect(g.x).toBeGreaterThanOrEqual(HOST.x);
      expect(g.y).toBeGreaterThanOrEqual(HOST.y);
      expect(g.x + g.w).toBeLessThanOrEqual(HOST.x + HOST.w);
      expect(g.y + g.d).toBeLessThanOrEqual(HOST.y + HOST.d);
      expect(g.z).toBeGreaterThan(HOST.z + HOST.h);
    }
  });

  it("never overlaps two guests", () => {
    for (let i = 0; i < guests.length; i++)
      for (let j = i + 1; j < guests.length; j++) {
        const a = guests[i];
        const b = guests[j];
        const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.d <= b.y || b.y + b.d <= a.y;
        expect(apart).toBe(true);
      }
  });

  it("paints back-to-front", () => {
    const order = paintOrder(guests);
    for (let i = 1; i < order.length; i++)
      expect(order[i].x + order[i].y).toBeGreaterThanOrEqual(order[i - 1].x + order[i - 1].y);
  });

  it("top centre sits on the top face", () => {
    const [, , z] = topCentre(guests[0]);
    expect(z).toBeCloseTo(guests[0].z + guests[0].h);
  });

  it("plane matrix is a valid SVG matrix()", () => {
    expect(planeMatrix([0, 0, 0], 20)).toMatch(/^matrix\((-?[\d.]+ ){5}-?[\d.]+\)$/);
  });
});

describe("silhouette overlap (SAT)", () => {
  it("detects overlap and separation of simple squares", () => {
    const sq = (x: number, y: number): [number, number][] => [[x, y], [x + 2, y], [x + 2, y + 2], [x, y + 2]];
    expect(convexOverlap(sq(0, 0), sq(1, 1))).toBe(true);
    expect(convexOverlap(sq(0, 0), sq(3, 0))).toBe(false);
    expect(convexOverlap(sq(0, 0), sq(2, 0))).toBe(false); // touching = apart
  });

  it("a box always overlaps itself and its hull is a hexagon", () => {
    const b = { x: 0, y: 0, z: 0, w: 1, d: 1, h: 1 };
    expect(screenOverlap(b, b, 10)).toBe(true);
    expect(hull(corners(b).map((p) => iso(p, 10)))).toHaveLength(6);
  });
});
