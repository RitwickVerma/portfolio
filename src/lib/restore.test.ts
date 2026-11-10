import { describe, it, expect } from "vitest";
import { COPIES, LOSSES, lostPlaces, verdict, type Loss } from "./restore";

describe("restore lookup", () => {
  it("a file or a guest comes back from either backup copy", () => {
    for (const l of ["file", "guest"] as Loss[]) expect(verdict(l).restoredBy).toEqual(["pbs", "restic"]);
  });

  it("a config comes back from Git as well as from the backups", () => {
    expect(verdict("config").restoredBy).toEqual(["pbs", "restic", "git"]);
  });

  it("losing the host takes the first copy with it: only the off-host copy and Git restore", () => {
    const v = verdict("host");
    expect(v.restoredBy).toEqual(["restic", "git"]);
    expect(v.rows.find((r) => r.copy.id === "pbs")!.state).toBe("had it, lost with it");
    expect(v.dataLost).toBe(false);
  });

  it("losing the other machine loses no data, and leaves one copy on the host", () => {
    const v = verdict("other");
    expect(v.dataLost).toBe(false);
    expect(v.rows.map((r) => r.state)).toEqual(["still there", "had it, lost with it", "still there"]);
  });

  it("no loss in the list destroys data that nothing holds", () => {
    for (const l of LOSSES) expect(verdict(l.id).dataLost).toBe(false);
  });

  it("the two backup copies live in different places, which is the whole point", () => {
    expect(new Set(COPIES.filter((c) => c.id !== "git").map((c) => c.on)).size).toBe(2);
    expect(lostPlaces("host")).toEqual(["host"]);
    expect(lostPlaces("file")).toEqual([]);
  });

  it("is deterministic", () => {
    expect(verdict("host")).toEqual(verdict("host"));
  });
});
