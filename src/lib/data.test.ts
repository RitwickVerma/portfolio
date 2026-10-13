import { describe, it, expect } from "vitest";
import { projects, experiences, education, services, socialLinks } from "./data";

describe("data integrity", () => {
  it("has unique project slugs", () => {
    const slugs = projects.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every project states role, metric, why and a tech stack", () => {
    for (const p of projects) {
      expect(p.title.length, p.slug).toBeGreaterThan(0);
      expect(p.description.length, p.slug).toBeGreaterThan(0);
      expect(p.role.length, p.slug).toBeGreaterThan(0);
      expect(p.metric.value.length, p.slug).toBeGreaterThan(0);
      expect(p.metric.label.length, p.slug).toBeGreaterThan(0);
      expect(p.why.length, p.slug).toBeGreaterThan(0);
      expect(p.tech.length, p.slug).toBeGreaterThan(0);
    }
  });

  it("every service has a name and a unique CT/VM id", () => {
    const ids = services.map((s) => s.ct);
    for (const s of services) {
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.ct).toMatch(/^(CT|VM)\d+$/);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("lists the 15 Proxmox guests: 13 LXC + 2 VM", () => {
    expect(services).toHaveLength(15);
    expect(services.filter((s) => s.ct.startsWith("CT"))).toHaveLength(13);
    expect(services.filter((s) => s.ct.startsWith("VM"))).toHaveLength(2);
  });

  it("every experience has company, role, and period", () => {
    for (const e of experiences) {
      expect(e.company.length).toBeGreaterThan(0);
      expect(e.role.length).toBeGreaterThan(0);
      expect(e.period.length).toBeGreaterThan(0);
    }
  });

  it("covers both degrees", () => {
    expect(education.map((e) => e.school.split(",")[0])).toEqual([
      "University of California",
      "SRM Institute of Science and Technology",
    ]);
  });

  it("links the resume to the on-site page, not a PDF", () => {
    expect(socialLinks.resume).toBe("/resume/");
  });

  it("ships no private addresses, stale claims or debrid mentions", () => {
    const blob = JSON.stringify({ projects, experiences, education, services });
    expect(blob).not.toMatch(/\b(?:69\.69\.69|192\.168)\.\d+/);
    expect(blob).not.toMatch(/jellyfin|debrid|aiostreams|nixos|pi-hole|adguard|this session/i);
  });
});
