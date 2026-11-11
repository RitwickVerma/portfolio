// The paging rule of "Paging without noise", as the note words it, on made-up
// runs. One run is one health check; the note says it runs every five minutes.
//
//   Confirmation gate: a condition must fail two consecutive runs before it can page.
//   Change-gated: an alert is emitted only when it is new. While it persists it
//     re-notifies after a cooldown (six hours for service checks, twelve for the
//     infrastructure watchdog). When it clears, it clears silently.
//   A check that cannot run is itself an alert.
//
// Where the note is silent this model picks the reading that keeps every
// sentence true: "a flapping condition costs one message, not one per flap",
// so a fault that clears and comes back inside the cooldown is the same alert
// and does not page again.

/** 0 healthy, 1 failed, 2 could not be checked (a finding of its own, for the watchdog). */
export type Run = 0 | 1 | 2;
export type Rule = "gated" | "every";

export const CONFIRM = 2;
/** Cooldowns in runs: six and twelve hours at one run every five minutes. */
export const COOLDOWN_RUNS = { service: 72, watchdog: 144 } as const;

export interface Options {
  confirm?: number;
  cooldown?: number;
}

/** For each run, whether a page is sent. */
export function pages(runs: readonly Run[], rule: Rule, opts: Options = {}): boolean[] {
  if (rule === "every") return runs.map((r) => r !== 0);
  const confirm = opts.confirm ?? CONFIRM;
  const cooldown = opts.cooldown ?? COOLDOWN_RUNS.service;
  const out: boolean[] = [];
  let streak = 0;
  // When each kind of fault last paged. Clearing does not reset it.
  const lastPaged: Record<number, number | undefined> = {};
  runs.forEach((r, i) => {
    if (r === 0) {
      streak = 0;
      out.push(false);
      return;
    }
    // Any run that is not healthy continues the streak: a check that fails and then cannot be
    // run at all has still gone two runs without a clean answer. (Restarting the count when the
    // kind changed let two bad runs in a row page nobody while the verdict said none had happened.)
    streak += 1;
    const last = lastPaged[r];
    const send = streak >= confirm && (last === undefined || i - last >= cooldown);
    if (send) lastPaged[r] = i;
    out.push(send);
  });
  return out;
}

export function failed(runs: readonly Run[]): number {
  return runs.filter((r) => r !== 0).length;
}

export function sent(flags: readonly boolean[]): number {
  return flags.filter(Boolean).length;
}

export interface CheckRow {
  id: string;
  label: string;
  /** Watchdog checks can also be "could not be checked". */
  watchdog: boolean;
}

/** The conditions the note names: service checks, and what the infrastructure watchdog reads. */
export const ROWS: CheckRow[] = [
  { id: "service", label: "A service check", watchdog: false },
  { id: "tls", label: "TLS expiry", watchdog: true },
  { id: "backup", label: "Backup freshness", watchdog: true },
];

export const RUNS = 12;

/** The next state when a cell is pressed: healthy, failed, and for the watchdog could not check. */
export function nextRun(r: Run, watchdog: boolean): Run {
  if (r === 0) return 1;
  if (r === 1) return watchdog ? 2 : 0;
  return 0;
}

const z = (n: number): Run[] => Array.from({ length: n }, () => 0 as Run);

type Strips = Record<string, Run[]>;

function strips(over: Partial<Record<string, Run[]>>): Strips {
  return { service: z(RUNS), tls: z(RUNS), backup: z(RUNS), ...over } as Strips;
}

export type ScenarioId = "lasts" | "blips" | "flaps" | "cannot";

/** One-tap scenarios on a strip of made-up runs. The first is the one to try. */
export const SCENARIOS: { id: ScenarioId; label: string; runs: () => Strips }[] = [
  { id: "lasts", label: "A fault that lasts", runs: () => strips({ service: [0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0] }) },
  { id: "blips", label: "One failed check now and then", runs: () => strips({ service: [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], backup: [0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0] }) },
  { id: "flaps", label: "A fault that comes and goes", runs: () => strips({ service: [1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0] }) },
  { id: "cannot", label: "A check that could not run", runs: () => strips({ tls: [0, 0, 0, 0, 2, 2, 2, 2, 0, 0, 0, 0] }) },
];

export function initialRuns(): Strips {
  return SCENARIOS[0].runs();
}

export function cooldownFor(row: CheckRow): number {
  return row.watchdog ? COOLDOWN_RUNS.watchdog : COOLDOWN_RUNS.service;
}

export interface Totals {
  failed: number;
  sent: number;
}

export function totals(strips: Strips, rule: Rule): Totals {
  let f = 0;
  let p = 0;
  for (const row of ROWS) {
    f += failed(strips[row.id]);
    p += sent(pages(strips[row.id], rule, { cooldown: cooldownFor(row) }));
  }
  return { failed: f, sent: p };
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export interface PagingVerdict {
  tone: "ok" | "warn" | "plain";
  title: string;
  detail: string;
}

/** The totals as a plain sentence for the reader. */
export function pagingVerdict(t: Totals, rule: Rule): PagingVerdict {
  const title = `${plural(t.failed, "check", "checks")} failed, ${plural(t.sent, "page", "pages")} sent.`;
  if (rule === "every") {
    return { tone: t.failed > 1 ? "warn" : "plain", title, detail: "Every failed check pages, so a fault that lasts pages again on every check." };
  }
  if (t.failed === 0) return { tone: "plain", title: "Nothing failed, so nothing paged.", detail: "Silent means healthy." };
  if (t.sent === 0) return { tone: "ok", title, detail: "No fault failed twice in a row, so nobody was woken for a blip." };
  return { tone: t.sent < t.failed ? "ok" : "plain", title, detail: "A page goes out once a check has failed twice in a row, and not again while it keeps failing." };
}
