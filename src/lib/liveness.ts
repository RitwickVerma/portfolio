// Project liveness as the page shows it. The numbers come from tools/liveness.mjs, which asks the
// public GitLab API once per build and writes liveness.generated.json; nothing here fetches, and
// nothing reads the clock: every "ago" is measured against the day the data was fetched, so the
// static page says the same thing on the day it is read as on the day it was built. Pure.

export type Pipeline = "passed" | "failed" | "running" | null;
export type Source = "api" | "previous" | "snapshot";

/** One project as tools/liveness.mjs writes it. `asOf` is the UTC day this entry was fetched. */
export interface GeneratedEntry {
  lastCommit: string | null;
  pipeline: Pipeline;
  tag: string | null;
  stars: number | null;
  source: "api" | "previous";
  asOf?: string;
}

export interface Generated {
  fetchedAt: string | null;
  projects: Record<string, GeneratedEntry>;
}

export interface Liveness {
  lastCommit: Date | null;
  /** "today", "yesterday", "N days ago", "N months ago", "N years ago"; null without a commit date. */
  ago: string | null;
  pipeline: Pipeline;
  tag: string | null;
  stars: number | null;
  /** The UTC day the figures were fetched, "YYYY-MM-DD"; null when there is no fetch to date. */
  asOf: string | null;
  /** "api": fetched in this build. "previous": kept from an earlier build. "snapshot": nothing fetched. */
  source: Source;
}

const DAY = 86_400_000;

/** Whole UTC calendar days from `from` to `to`; a negative gap (clock skew) counts as zero. */
export function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.max(0, Math.round((b - a) / DAY));
}

/**
 * How long before `to` the `from` day was, in the largest unit that fits: 0 days is "today", 1 is
 * "yesterday", up to 29 days is days, then months of 30 days up to 364, then years of 365 days.
 */
export function agoText(from: Date, to: Date): string {
  const d = daysBetween(from, to);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return `${d} days ago`;
  if (d < 365) {
    const m = Math.floor(d / 30);
    return m === 1 ? "1 month ago" : `${m} months ago`;
  }
  const y = Math.floor(d / 365);
  return y === 1 ? "1 year ago" : `${y} years ago`;
}

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * What the row shows for `slug`.
 *
 * - No entry for the slug (or no file): a snapshot with only `snapshotStars`, the hand-typed
 *   figure from data.ts, if there is one.
 * - An entry from this build's fetch: source "api". With `buildDate` given ("YYYY-MM-DD", the day
 *   of the export), an "api" entry fetched on an earlier day is reported as "previous": the
 *   fetch failed this time and the file is older than the page.
 * - An entry the tool kept from an earlier run: "previous".
 *
 * `ago` is measured against the entry's own fetch day (`asOf`, else `generated.fetchedAt`), never
 * against now.
 */
export function livenessFor(
  slug: string,
  generated: Generated | null | undefined,
  snapshotStars: number | null = null,
  buildDate?: string,
): Liveness {
  const entry = generated?.projects?.[slug];
  if (!entry) {
    return { lastCommit: null, ago: null, pipeline: null, tag: null, stars: snapshotStars, asOf: null, source: "snapshot" };
  }
  const asOf = entry.asOf ?? generated?.fetchedAt?.slice(0, 10) ?? null;
  const fetched = parseDate(asOf);
  const lastCommit = parseDate(entry.lastCommit);
  const stale = entry.source === "api" && buildDate !== undefined && asOf !== buildDate;
  return {
    lastCommit,
    ago: lastCommit && fetched ? agoText(lastCommit, fetched) : null,
    pipeline: entry.pipeline === "passed" || entry.pipeline === "failed" || entry.pipeline === "running" ? entry.pipeline : null,
    tag: entry.tag || null,
    stars: typeof entry.stars === "number" ? entry.stars : snapshotStars,
    asOf,
    source: entry.source === "api" && !stale ? "api" : "previous",
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-11-11" to "11 Nov 2026" (no Intl: the same string in every runtime). */
export function dateLabel(day: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(day);
  if (!m) return day;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] ?? m[2]} ${m[1]}`;
}

export interface LivenessLine {
  /** Words before the CI verdict ("Last commit 3 days ago"), or "" . */
  commit: string;
  /** "CI passed" etc., or "" when there is no verdict; `tone` says how to colour it. */
  ci: string;
  tone: "ok" | "bad" | "quiet";
  tag: string;
  stars: string;
  /** "as of 11 Nov 2026", or "" when nothing was dated. */
  asOf: string;
  /** True when the line must end with "(snapshot)". */
  snapshot: boolean;
}

/** The row's line as parts, in display order; the component joins them with " · ". */
export function livenessLine(l: Liveness): LivenessLine {
  return {
    commit: l.ago ? `Last commit ${l.ago}` : "",
    ci: l.pipeline ? `CI ${l.pipeline}` : "",
    tone: l.pipeline === "passed" ? "ok" : l.pipeline === "failed" ? "bad" : "quiet",
    tag: l.tag ?? "",
    stars: l.stars === null ? "" : l.stars === 1 ? "1 star" : `${l.stars} stars`,
    asOf: l.asOf ? `as of ${dateLabel(l.asOf)}` : "",
    snapshot: l.source !== "api",
  };
}

/** Plain-text form of the line: what a reader, a screen reader and the tests see. */
export function lineText(line: LivenessLine): string {
  const parts = [line.commit, line.ci, line.tag, line.stars, line.asOf].filter(Boolean);
  const body = parts.length > 0 ? parts.join(" · ") : "No live figures in this build";
  return line.snapshot ? `${body} (snapshot)` : body;
}
