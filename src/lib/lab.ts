import { projects, services } from "./data";
import type { Service } from "./types";

// The two numbers about the lab that the page states more than once, read
// from the data file instead of typed again: how many guests there are, and
// how many of them OpenTofu declares ("14 of 16" is the Homelab project's
// headline metric).

export interface LabCounts {
  /** Guests on the host: every entry of `services`. */
  guests: number;
  /** Containers (CT...) and virtual machines (VM...). */
  containers: number;
  vms: number;
  /** Guests the repository declares. */
  declared: number;
}

/** "14 of 16" -> { declared: 14, total: 16 }, or null when the metric no longer says that. */
export function parseDeclared(value: string): { declared: number; total: number } | null {
  const m = value.match(/^(\d+) of (\d+)$/);
  return m ? { declared: Number(m[1]), total: Number(m[2]) } : null;
}

export function labCounts(): LabCounts {
  const vms = services.filter((s) => s.ct.startsWith("VM")).length;
  const metric = projects.find((p) => p.slug === "homelab")?.metric.value ?? "";
  const declared = parseDeclared(metric);
  return { guests: services.length, containers: services.length - vms, vms, declared: declared?.declared ?? 0 };
}

/** The guest a visitor pressed, by its id (CT101, VM110), or undefined. */
export function guestById(ct: string | null): Service | undefined {
  return ct ? services.find((s) => s.ct === ct) : undefined;
}

/** What the line under the diagram says about a guest: its description, then its stack. */
export function guestDetail(s: Service): { title: string; description: string; tech: string } {
  return { title: `${s.name}, ${s.ct}`, description: s.description, tech: s.tech.join(", ") };
}

/** One at a time: pressing the open guest closes it, pressing another replaces it. */
export function toggleGuest(current: string | null, pressed: string): string | null {
  return current === pressed ? null : pressed;
}
