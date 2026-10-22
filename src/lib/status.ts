// Live homelab status: the shape of /status.json, its validation, and the
// pure helpers the Homelab section, the hero LEDs and the terminal share.
// tools/status-from-api.sh produces the file on a host that can run a cron
// and serve a path; Cloudflare Pages cannot, so on the current deploy
// NEXT_PUBLIC_STATUS_URL is unset, nothing is fetched and every reader shows
// the static inventory. Nothing in the file identifies a machine beyond the
// CT/VM id already printed on the page.

/** Where to fetch the feed from; empty means "no feed on this build". */
export const STATUS_URL = process.env.NEXT_PUBLIC_STATUS_URL ?? "";
export const STATUS_SCHEMA = 1;
/** Producer runs every 5 min; after this long without a new file the page says "stale". */
export const STALE_AFTER_MS = 15 * 60 * 1000;
/** Clocks drift; a timestamp further in the future than this is a broken producer, not news. */
export const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;

export type GuestState = "running" | "stopped";

export interface GuestStatus {
  /** "CT104" or "VM110": matches services[].ct in lib/data. */
  id: string;
  state: GuestState;
  uptimeSeconds?: number;
}

export interface HostStatus {
  uptimeSeconds?: number;
  load1?: number;
}

export interface Status {
  schema: number;
  /** ISO-8601, UTC. */
  generatedAt: string;
  host: HostStatus;
  guests: GuestStatus[];
}

const ID = /^(CT|VM)\d{1,5}$/;

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : undefined;
}

/**
 * Strict parse of whatever came over the wire. Anything malformed returns
 * null and the page falls back to the static inventory; a bad file must
 * never render as a half-true status.
 */
export function parseStatus(input: unknown): Status | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Record<string, unknown>;
  if (o.schema !== STATUS_SCHEMA) return null;
  if (typeof o.generatedAt !== "string" || Number.isNaN(Date.parse(o.generatedAt))) return null;
  if (!Array.isArray(o.guests)) return null;

  const guests: GuestStatus[] = [];
  const seen = new Set<string>();
  for (const g of o.guests) {
    if (!g || typeof g !== "object") return null;
    const r = g as Record<string, unknown>;
    if (typeof r.id !== "string" || !ID.test(r.id) || seen.has(r.id)) return null;
    if (r.state !== "running" && r.state !== "stopped") return null;
    seen.add(r.id);
    const guest: GuestStatus = { id: r.id, state: r.state };
    const up = num(r.uptimeSeconds);
    if (up !== undefined) guest.uptimeSeconds = up;
    guests.push(guest);
  }

  const h = (o.host && typeof o.host === "object" ? o.host : {}) as Record<string, unknown>;
  const host: HostStatus = {};
  const hup = num(h.uptimeSeconds);
  const load = num(h.load1);
  if (hup !== undefined) host.uptimeSeconds = hup;
  if (load !== undefined) host.load1 = load;

  return { schema: STATUS_SCHEMA, generatedAt: o.generatedAt, host, guests };
}

export type Freshness = "live" | "stale";

export function freshness(status: Status, now: number = Date.now()): Freshness {
  const t = Date.parse(status.generatedAt);
  if (t - now > MAX_FUTURE_SKEW_MS) return "stale";
  return now - t <= STALE_AFTER_MS ? "live" : "stale";
}

export type GuestView = "up" | "down" | "unknown";

/** A guest the status file does not mention is "unknown", never "down". */
export function guestView(status: Status | null, id: string): GuestView {
  const g = status?.guests.find((x) => x.id === id);
  if (!g) return "unknown";
  return g.state === "running" ? "up" : "down";
}

export function runningCount(status: Status): number {
  return status.guests.filter((g) => g.state === "running").length;
}

/** "12d 4h", "4h 12m", "12m". Never seconds: the page updates every five minutes. */
export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** "just now", "3 min ago", "2 h ago", "4 d ago". */
export function formatAge(ms: number): string {
  if (ms < 60_000) return "just now";
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

export function ageMs(status: Status, now: number = Date.now()): number {
  return Math.max(0, now - Date.parse(status.generatedAt));
}
