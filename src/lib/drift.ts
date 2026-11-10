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
export const DRIFT_IDS: readonly string[] = ["VM100", "CT104", "VM110", "CT102", "CT118", "CT119"];

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

/** The night the figure opens on: one guest edited by hand, one compose file changed. */
export const INITIAL: Live = { ...CALM, edited: ["VM110"], compose: true };

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
