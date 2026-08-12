import { describe, it, expect } from "vitest";
import { projects, experiences, services } from "./data";

describe("data integrity", () => {
  it("has unique project slugs", () => {
    const slugs = projects.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every featured project has a non-empty description and tech stack", () => {
    for (const p of projects.filter((p) => p.featured)) {
      expect(p.title.length).toBeGreaterThan(0);
      expect(p.description.length).toBeGreaterThan(0);
      expect(p.longDescription.length).toBeGreaterThan(0);
      expect(p.tech.length).toBeGreaterThan(0);
    }
  });

  it("every service has a name, ct, and ip", () => {
    for (const s of services) {
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.ct).toMatch(/^(CT|VM)\d+$/);
      expect(s.ip).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
    }
  });

  it("every experience has company, role, and period", () => {
    for (const e of experiences) {
      expect(e.company.length).toBeGreaterThan(0);
      expect(e.role.length).toBeGreaterThan(0);
      expect(e.period.length).toBeGreaterThan(0);
    }
  });
});
