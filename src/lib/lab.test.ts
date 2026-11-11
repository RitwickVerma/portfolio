import { describe, it, expect } from "vitest";
import { labCounts, parseDeclared, guestById, guestDetail, toggleGuest } from "./lab";
import { projects, services } from "./data";

describe("lab counts come from the data file", () => {
  it("reads 'N of M' from the Homelab project's metric, and M is the number of guests", () => {
    const metric = projects.find((p) => p.slug === "homelab")!.metric.value;
    const parsed = parseDeclared(metric)!;
    expect(parsed).not.toBeNull();
    expect(parsed.total).toBe(services.length);
    expect(labCounts().declared).toBe(parsed.declared);
    expect(labCounts().guests).toBe(services.length);
  });

  it("splits containers and VMs by their id", () => {
    const c = labCounts();
    expect(c.containers + c.vms).toBe(c.guests);
    expect(c.vms).toBe(services.filter((s) => s.ct.startsWith("VM")).length);
  });

  it("rejects a metric that stops saying 'N of M'", () => {
    expect(parseDeclared("14")).toBeNull();
    expect(parseDeclared("14 of 16 guests")).toBeNull();
    expect(parseDeclared("14 of 16")).toEqual({ declared: 14, total: 16 });
  });
});

describe("guest detail", () => {
  it("is the data file's description and stack for the guest pressed", () => {
    const d = guestDetail(guestById("CT104")!);
    expect(d).toEqual({ title: "Vaultwarden, CT104", description: "Password manager", tech: "Rust, Docker" });
  });

  it("every guest has a description and at least one tech", () => {
    for (const s of services) {
      const d = guestDetail(s);
      expect(d.description.length, s.ct).toBeGreaterThan(0);
      expect(d.tech.length, s.ct).toBeGreaterThan(0);
    }
  });

  it("an unknown or empty id is no guest", () => {
    expect(guestById("CT999")).toBeUndefined();
    expect(guestById(null)).toBeUndefined();
  });

  it("shows one at a time", () => {
    expect(toggleGuest(null, "CT101")).toBe("CT101");
    expect(toggleGuest("CT101", "CT102")).toBe("CT102");
    expect(toggleGuest("CT102", "CT102")).toBeNull();
  });
});
