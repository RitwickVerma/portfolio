// The paging rule of "Paging without noise", as the note words it, on made-up
// runs. One run is one health check; the note says it runs every five minutes.
//
//   Confirmation gate: a condition must fail two consecutive runs before it can page.
//   Change-gated: an alert is emitted only when it is new. While it persists it
//     re-notifies after a cooldown (six hours for service checks, twelve for the
//     infrastructure watchdog). When it clears, it clears silently.
//   A check that cannot run is itself an alert.
//
// Where the note is silent, this model picks one reading and says so in the
// caption: a fault that clears and comes back is a new fault.

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
  let kind: Run = 0;
  let streak = 0;
  let paged: number | null = null;
  runs.forEach((r, i) => {
    if (r === 0) {
      // Clears silently, and the next fault is a new one.
      kind = 0;
      streak = 0;
      paged = null;
      out.push(false);
      return;
    }
    if (r !== kind) {
      kind = r;
      streak = 0;
      paged = null;
    }
    streak += 1;
    let send = false;
    if (streak >= confirm) {
      if (paged === null) send = true;
      else if (i - paged >= cooldown) send = true;
    }
    if (send) paged = i;
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

export const RUNS = 16;

/** The next state when a cell is pressed: healthy, failed, and for the watchdog could not check. */
export function nextRun(r: Run, watchdog: boolean): Run {
  if (r === 0) return 1;
  if (r === 1) return watchdog ? 2 : 0;
  return 0;
}

const z = (n: number): Run[] => Array.from({ length: n }, () => 0 as Run);

export function initialRuns(): Record<string, Run[]> {
  const service = z(RUNS);
  for (const i of [3, 4, 5, 6, 7, 8, 11]) service[i] = 1;
  const tls = z(RUNS);
  for (const i of [12, 13, 14]) tls[i] = 2;
  const backup = z(RUNS);
  backup[6] = 1;
  return { service, tls, backup };
}

export function cooldownFor(row: CheckRow): number {
  return row.watchdog ? COOLDOWN_RUNS.watchdog : COOLDOWN_RUNS.service;
}
