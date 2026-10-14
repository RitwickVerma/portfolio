import { describe, it, expect } from "vitest";
import {
  parseStatus,
  freshness,
  guestView,
  runningCount,
  formatUptime,
  formatAge,
  ageMs,
  STALE_AFTER_MS,
  MAX_FUTURE_SKEW_MS,
} from "./status";
import { services } from "./data";
import example from "../../tools/status.example.json";

const NOW = Date.parse("2026-10-13T20:00:00Z");

const good = {
  schema: 1,
  generatedAt: "2026-10-13T19:57:00Z",
  host: { uptimeSeconds: 1_000_000, load1: 0.42 },
  guests: [
    { id: "CT104", state: "running", uptimeSeconds: 86_400 * 3 + 3600 * 4 },
    { id: "VM110", state: "running" },
    { id: "CT107", state: "stopped" },
  ],
};

describe("parseStatus", () => {
  it("accepts a well-formed file and drops nothing it should keep", () => {
    const s = parseStatus(good);
    expect(s).not.toBeNull();
    expect(s!.guests).toHaveLength(3);
    expect(s!.host.load1).toBe(0.42);
    expect(s!.guests[0].uptimeSeconds).toBe(86_400 * 3 + 3600 * 4);
    expect(s!.guests[1].uptimeSeconds).toBeUndefined();
  });

  it("rejects the wrong schema, a bad timestamp, or a malformed guest", () => {
    expect(parseStatus({ ...good, schema: 2 })).toBeNull();
    expect(parseStatus({ ...good, generatedAt: "yesterday" })).toBeNull();
    expect(parseStatus({ ...good, guests: [{ id: "ct104", state: "running" }] })).toBeNull();
    expect(parseStatus({ ...good, guests: [{ id: "CT104", state: "up" }] })).toBeNull();
    expect(parseStatus({ ...good, guests: [{ id: "CT104", state: "running" }, { id: "CT104", state: "running" }] })).toBeNull();
    expect(parseStatus(null)).toBeNull();
    expect(parseStatus("{}")).toBeNull();
  });

  it("ignores junk numbers instead of rendering them", () => {
    const s = parseStatus({ ...good, host: { uptimeSeconds: -1, load1: "high" }, guests: [{ id: "CT104", state: "running", uptimeSeconds: NaN }] });
    expect(s!.host).toEqual({});
    expect(s!.guests[0].uptimeSeconds).toBeUndefined();
  });

  it("the example file the producer documents parses and only names guests the page lists", () => {
    const s = parseStatus(example);
    expect(s).not.toBeNull();
    const known = new Set(services.map((x) => x.ct));
    for (const g of s!.guests) expect(known.has(g.id), g.id).toBe(true);
    expect(JSON.stringify(example)).not.toMatch(/\b(?:69\.69\.69|192\.168|10\.\d+)\.\d+/);
  });
});

describe("freshness", () => {
  const s = parseStatus(good)!;
  it("is live inside the window and stale after it", () => {
    expect(freshness(s, NOW)).toBe("live");
    expect(freshness(s, Date.parse(s.generatedAt) + STALE_AFTER_MS)).toBe("live");
    expect(freshness(s, Date.parse(s.generatedAt) + STALE_AFTER_MS + 1)).toBe("stale");
  });
  it("treats a timestamp from the future as stale (broken producer clock)", () => {
    expect(freshness(s, Date.parse(s.generatedAt) - MAX_FUTURE_SKEW_MS - 1)).toBe("stale");
  });
});

describe("views and formatting", () => {
  const s = parseStatus(good)!;
  it("maps guest state to a view; unlisted guests are unknown, not down", () => {
    expect(guestView(s, "CT104")).toBe("up");
    expect(guestView(s, "CT107")).toBe("down");
    expect(guestView(s, "CT999")).toBe("unknown");
    expect(guestView(null, "CT104")).toBe("unknown");
    expect(runningCount(s)).toBe(2);
  });
  it("formats uptime and age at page resolution", () => {
    expect(formatUptime(86_400 * 3 + 3600 * 4 + 59)).toBe("3d 4h");
    expect(formatUptime(3600 * 4 + 60 * 12)).toBe("4h 12m");
    expect(formatUptime(59)).toBe("0m");
    expect(formatAge(5_000)).toBe("just now");
    expect(formatAge(3 * 60_000)).toBe("3 min ago");
    expect(formatAge(2 * 3_600_000)).toBe("2 h ago");
    expect(formatAge(72 * 3_600_000)).toBe("3 d ago");
    expect(ageMs(s, NOW)).toBe(3 * 60_000);
  });
});
