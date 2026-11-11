import { services } from "./data";

// The nightly job of "Git is the truth", as a policy and nothing more. Given a
// made-up live state it says what each stage would do: `tofu-plan` reports a
// difference on a declared guest, `sync-live` commits a changed file, and
// anything outside both is not seen. No host is read; the inputs are whatever
// the visitor set.
//
// What is declared comes from the note: fourteen of the sixteen guests are
// OpenTofu resources, "the dev box and the observability box are not yet".

/** The two guests the note says are not declared yet (Devbox, Observability in lib/data). */
export const UNDECLARED: readonly string[] = ["CT118", "CT119"];

/** The few guests the figure draws, by id from lib/data. */
export const DRIFT_IDS: readonly string[] = ["VM100", "VM110", "CT118", "CT119"];

export interface DriftGuest {
  id: string;
  name: string;
  declared: boolean;
}

export const DRIFT_GUESTS: DriftGuest[] = DRIFT_IDS.map((id) => {
  const s = services.find((x) => x.ct === id);
  if (!s) throw new Error(`no guest ${id} in lib/data`);
  return { id, name: s.name, declared: !UNDECLARED.includes(id) };
});

/** What the visitor broke on the live side. */
export interface Live {
  /** Guest ids whose settings were edited by hand. */
  edited: string[];
  /** Guest ids that are gone from the host. */
  gone: string[];
  /** A guest nobody declared was added. */
  added: boolean;
  /** A compose file or config changed on the host or the gateway. */
  compose: boolean;
  /** A live secret sits in a synced file. */
  secret: boolean;
  /** A file changed inside a container's own filesystem. */
  inside: boolean;
}

export const CALM: Live = { edited: [], gone: [], added: false, compose: false, secret: false, inside: false };

/** The figure opens on a calm night; the first scenario is one press away. */
export const INITIAL: Live = CALM;

export type Step = "sync-live" | "tofu-plan" | "unseen";
export type Outcome = "reported" | "committed" | "not seen";

export interface Finding {
  step: Step;
  outcome: Outcome;
  subject: string;
  detail: string;
}

export interface Report {
  findings: Finding[];
  /** sync-live found nothing, so its commit is empty. */
  commitEmpty: boolean;
  /** tofu-plan found no difference. */
  planClean: boolean;
}

const NOT_DECLARED = "not declared yet, so plan has nothing to compare it with";

/** What tonight's job does with `live`. Pure and ordered: guests as drawn, then files. */
export function plan(live: Live, guests: readonly DriftGuest[] = DRIFT_GUESTS): Report {
  const findings: Finding[] = [];
  for (const g of guests) {
    const gone = live.gone.includes(g.id);
    const edited = !gone && live.edited.includes(g.id);
    if (!gone && !edited) continue;
    if (g.declared) {
      findings.push({
        step: "tofu-plan",
        outcome: "reported",
        subject: g.name,
        detail: gone ? "declared, but not on the host" : "settings differ from the declaration",
      });
    } else {
      findings.push({ step: "unseen", outcome: "not seen", subject: g.name, detail: NOT_DECLARED });
    }
  }
  if (live.added) findings.push({ step: "unseen", outcome: "not seen", subject: "A new guest", detail: NOT_DECLARED });
  if (live.compose) {
    findings.push({ step: "sync-live", outcome: "committed", subject: "A compose file or config", detail: "changed on the box and not written down" });
  }
  if (live.secret) {
    findings.push({ step: "sync-live", outcome: "committed", subject: "A synced file with a live secret", detail: "the redaction pass runs on it before the commit" });
  }
  if (live.inside) {
    findings.push({ step: "unseen", outcome: "not seen", subject: "A file inside a container", detail: "the backup's problem, not git's" });
  }
  return {
    findings,
    commitEmpty: !findings.some((f) => f.step === "sync-live"),
    planClean: !findings.some((f) => f.step === "tofu-plan"),
  };
}

/** Add `id` to `list` if absent, remove it if present. Never mutates. */
export function toggleId(list: readonly string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

/** Same breakage, whatever order it was applied in. */
export function sameLive(a: Live, b: Live): boolean {
  const sorted = (l: readonly string[]) => [...l].sort().join(",");
  return (
    sorted(a.edited) === sorted(b.edited) &&
    sorted(a.gone) === sorted(b.gone) &&
    a.added === b.added &&
    a.compose === b.compose &&
    a.secret === b.secret &&
    a.inside === b.inside
  );
}

export type GuestState = "as it was" | "edited" | "gone";

export function guestState(live: Live, id: string): GuestState {
  return live.gone.includes(id) ? "gone" : live.edited.includes(id) ? "edited" : "as it was";
}

export function setGuest(live: Live, id: string, state: GuestState): Live {
  const rest = (l: string[]) => l.filter((x) => x !== id);
  return {
    ...live,
    edited: state === "edited" ? [...rest(live.edited), id] : rest(live.edited),
    gone: state === "gone" ? [...rest(live.gone), id] : rest(live.gone),
  };
}

export type ScenarioId = "gateway" | "devbox" | "config" | "secret" | "inside";

/** One-tap nights. The first is the one to try. */
export const SCENARIOS: { id: ScenarioId; label: string; live: Live }[] = [
  { id: "gateway", label: "Edit the gateway", live: { ...CALM, edited: ["VM110"] } },
  { id: "devbox", label: "Edit the dev box", live: { ...CALM, edited: ["CT118"] } },
  { id: "config", label: "Edit a config", live: { ...CALM, compose: true } },
  { id: "secret", label: "Leave a password in a config", live: { ...CALM, secret: true } },
  { id: "inside", label: "Edit inside a container", live: { ...CALM, inside: true } },
];

export interface Headline {
  tone: "ok" | "warn" | "plain";
  title: string;
  details: string[];
}

/** The report as plain sentences. */
export function headline(report: Report): Headline {
  const count = (o: Outcome) => report.findings.filter((f) => f.outcome === o).length;
  const reported = count("reported");
  const committed = count("committed");
  const unseen = count("not seen");
  if (report.findings.length === 0) {
    return { tone: "ok", title: "Nothing changed by hand tonight, so the job has nothing new to report and saves nothing.", details: [] };
  }
  const parts: string[] = [];
  if (reported) parts.push(`reports ${reported} ${reported === 1 ? "difference" : "differences"}`);
  if (committed) parts.push(`saves ${committed} changed ${committed === 1 ? "file" : "files"} to the repository`);
  const title = [parts.length ? `The job ${parts.join(" and ")}.` : "", unseen ? `It cannot see ${unseen} ${unseen === 1 ? "change" : "changes"}.` : ""].filter(Boolean).join(" ");
  const details: string[] = [];
  const names = report.findings.filter((f) => f.outcome === "reported").map((f) => f.subject);
  if (names.length) details.push(`Reported: ${names.join(", ")}.`);
  if (report.findings.some((f) => f.step === "unseen" && f.subject !== "A file inside a container")) {
    details.push("Nobody has written that machine into the repository yet, so there is nothing to compare it with.");
  }
  if (report.findings.some((f) => f.subject === "A file inside a container")) {
    details.push("What is inside a container is the backup's job, not Git's.");
  }
  if (report.findings.some((f) => f.subject.startsWith("A synced file with"))) {
    details.push("The password is scrubbed from the file before it is saved.");
  }
  return { tone: unseen ? "warn" : "ok", title, details };
}

/** What the job did about one guest or file, by subject. */
export function jobFor(report: Report, subject: string): Outcome | "nothing" {
  return report.findings.find((f) => f.subject === subject)?.outcome ?? "nothing";
}
