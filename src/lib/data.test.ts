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

  it("lists the 16 Proxmox guests: 14 LXC + 2 VM", () => {
    expect(services).toHaveLength(16);
    expect(services.filter((s) => s.ct.startsWith("CT"))).toHaveLength(14);
    expect(services.filter((s) => s.ct.startsWith("VM"))).toHaveLength(2);
  });

  it("lists the current eBay role first, then the earlier eBay level, newest first", () => {
    expect(experiences[0]).toMatchObject({ company: "eBay", role: "Software Engineer 3" });
    expect(experiences[0].period).toMatch(/Present$/);
    expect(experiences[1]).toMatchObject({ company: "eBay", role: "Software Engineer 2" });
    expect(experiences.filter((e) => e.company === "eBay")).toHaveLength(2);
    expect(experiences.find((e) => e.company === "Shoelace Wireless")?.period).toBe("Jun – Sep 2020");
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

  it("points LinkedIn at the ritwick-verma profile, the one search engines index for eBay", () => {
    expect(socialLinks.linkedin).toBe("https://www.linkedin.com/in/ritwick-verma/");
  });

  it("links the resume to the on-site page, not a PDF", () => {
    expect(socialLinks.resume).toBe("/resume/");
  });

  it("ships no private addresses, stale claims or debrid mentions", () => {
    const blob = JSON.stringify({ projects, experiences, education, services });
    expect(blob).not.toMatch(/\b(?:69\.69\.69|192\.168)\.\d+/);
    expect(blob).not.toMatch(/jellyfin|debrid|aiostreams|nixos|pi-hole|adguard|this session/i);
  });

  it("never claims ShutUp is on Google Play / the Play Store (listing is gone)", () => {
    const blob = JSON.stringify({ projects, experiences, education, services });
    expect(blob).not.toMatch(/google play|play store|play\.google/i);
  });

  it("every project category is a distinct, specific kind", () => {
    const cats = projects.map((p) => p.category);
    expect(new Set(cats).size).toBe(cats.length);
    expect(cats).not.toContain("systems");
  });

  it("featured projects fill the 2×2 grid and the rest fill a 3-column grid", () => {
    expect(projects.filter((p) => p.featured)).toHaveLength(4);
    expect(projects.filter((p) => !p.featured).length % 3).toBe(0);
  });

  it("the resume lists every featured project and at most seven in all", () => {
    const listed = projects.filter((p) => p.onResume !== false);
    for (const p of projects.filter((p) => p.featured)) expect(listed).toContain(p);
    expect(listed.length).toBeLessThanOrEqual(6);
  });

  it("Plutus describes the current trader, not the retired multi-signal pipeline", () => {
    const plutus = projects.find((p) => p.slug === "plutus")!;
    const blob = JSON.stringify(plutus).toLowerCase();
    expect(blob).not.toMatch(/russell|200\+ tests|conviction|hard stops/);
    expect(blob).toMatch(/momentum/);
    expect(plutus.links).toEqual({});
    // no headline backtest Sharpe on the card: the ledger found no demonstrated edge
    expect(plutus.metric.value).not.toMatch(/sharpe/i);
    expect(projects.find((p) => p.slug === "crush80-firmware")?.links.page).toBe("/#keyboard");
  });
});
