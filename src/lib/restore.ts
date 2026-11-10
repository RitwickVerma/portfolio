// "Backups, both kinds", as a lookup. Only what the note says:
//   Proxmox Backup Server takes every guest nightly (and lives on the host).
//   restic copies the datastore off the host, to a different machine, nightly.
//   The declarations in Git cover the hypervisor and the compose stacks; what is
//   inside each container's filesystem is the backup's problem, not git's.
//   "The point of the second copy is that the first lives on the thing that would fail."

export type Loss = "file" | "config" | "guest" | "host" | "other";
export type Place = "host" | "other" | "repo";

export interface Copy {
  id: "pbs" | "restic" | "git";
  label: string;
  /** Where the copy lives. */
  on: Place;
  where: string;
  holds: readonly Loss[];
}

export const COPIES: Copy[] = [
  { id: "pbs", label: "Backup Server, nightly", on: "host", where: "on the host", holds: ["file", "config", "guest", "host"] },
  { id: "restic", label: "restic copy, nightly", on: "other", where: "on a different machine", holds: ["file", "config", "guest", "host"] },
  { id: "git", label: "Git", on: "repo", where: "in the repository", holds: ["config", "host"] },
];

export const LOSSES: { id: Loss; label: string }[] = [
  { id: "file", label: "A file inside a guest" },
  { id: "config", label: "A compose file or config" },
  { id: "guest", label: "A whole guest" },
  { id: "host", label: "The host" },
  { id: "other", label: "The other machine" },
];

/** Which places a loss takes with it. */
export function lostPlaces(loss: Loss): Place[] {
  if (loss === "host") return ["host"];
  if (loss === "other") return ["other"];
  return [];
}

export type CopyState = "restores it" | "had it, lost with it" | "does not hold it" | "still there";

export interface Verdict {
  rows: { copy: Copy; state: CopyState }[];
  /** Ids of the copies that can restore the loss. */
  restoredBy: string[];
  /** The loss destroyed data and no copy holds it. */
  dataLost: boolean;
}

export function verdict(loss: Loss): Verdict {
  const gone = lostPlaces(loss);
  const rows = COPIES.map((copy) => {
    const survives = !gone.includes(copy.on);
    let state: CopyState;
    if (loss === "other") state = survives ? "still there" : "had it, lost with it";
    else if (!copy.holds.includes(loss)) state = "does not hold it";
    else state = survives ? "restores it" : "had it, lost with it";
    return { copy, state };
  });
  const restoredBy = rows.filter((r) => r.state === "restores it").map((r) => r.copy.id);
  return { rows, restoredBy, dataLost: loss !== "other" && restoredBy.length === 0 };
}
