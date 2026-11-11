import { describe, it, expect } from "vitest";
import { categories, matches, hashSlug, filterForHash } from "./projectFilter";
import { projects } from "./data";

describe("project filter", () => {
  it("offers every category the data uses, once, and the counts add up to the projects", () => {
    const cats = categories();
    expect(new Set(cats.map((c) => c.id)).size).toBe(cats.length);
    expect(cats.reduce((n, c) => n + c.count, 0)).toBe(projects.length);
    expect(cats.map((c) => c.id)).toEqual([...new Set(projects.map((p) => p.category))]);
  });

  it("All shows everything, a category shows only its own", () => {
    for (const p of projects) expect(matches("all", p.category)).toBe(true);
    const shown = projects.filter((p) => matches("android", p.category));
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.every((p) => p.category === "android")).toBe(true);
    expect(shown.length).toBeLessThan(projects.length);
  });

  it("no filter hides a project from every other filter: each project is reachable by its own category", () => {
    for (const p of projects) expect(matches(p.category, p.category), p.slug).toBe(true);
  });

  it("reads the project a hash points at", () => {
    expect(hashSlug("#p-kaeru")).toBe("kaeru");
    expect(hashSlug("#p-crush80-firmware")).toBe("crush80-firmware");
    expect(hashSlug("#projects")).toBeNull();
    expect(hashSlug("")).toBeNull();
  });

  it("goes back to All when a link lands on a row the filter hides, and stays put otherwise", () => {
    expect(projects.find((p) => p.slug === "kaeru")!.category).toBe("foldable");
    expect(filterForHash("android", "#p-kaeru")).toBe("all");
    expect(filterForHash("android", "#p-shutup")).toBe("android");
    expect(filterForHash("all", "#p-kaeru")).toBe("all");
    expect(filterForHash("android", "#work")).toBe("android");
    expect(filterForHash("android", "#p-nothing")).toBe("android");
  });
});
