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
  /** How a sentence names it. */
  short: string;
  /** Where the copy lives. */
  on: Place;
  where: string;
  holds: readonly Loss[];
}

export const COPIES: Copy[] = [
  { id: "pbs", label: "Backup Server, nightly", short: "nightly backup on the host", on: "host", where: "on the host", holds: ["file", "config", "guest", "host"] },
  { id: "restic", label: "Off-host copy (restic), nightly", short: "copy on the other machine", on: "other", where: "on a different machine", holds: ["file", "config", "guest", "host"] },
  { id: "git", label: "Git", short: "Git", on: "repo", where: "in the repository", holds: ["config", "host"] },
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

const join = (names: string[]) => (names.length <= 2 ? names.join(" and ") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`);

/** The verdict as one plain sentence. */
export function headline(loss: Loss): string {
  const v = verdict(loss);
  if (loss === "other") return "No data is lost, but only the copy on the host is left.";
  if (v.dataLost) return "No copy holds this.";
  const name = (id: string) => {
    const short = COPIES.find((c) => c.id === id)!.short;
    return short === "Git" ? short : `the ${short}`;
  };
  const lost = v.rows.filter((r) => r.state === "had it, lost with it").map((r) => r.copy.short);
  const back = v.restoredBy.map(name);
  const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  return `${lost.length ? `The ${join(lost)} went with it. ` : ""}${cap(join(back))} ${back.length === 1 ? "brings" : "bring"} it back.`;
}
