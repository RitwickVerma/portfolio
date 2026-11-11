// Where each note figure's code comes from. One entry per figure: the module on this site that the
// figure runs, and the file, symbol and commit in the upstream repository it was ported from, read
// from, or reimplements. Every upstream entry was checked when written: the commit is the tip of the
// repository's default branch at that time, `git show <commit>:<path>` has the symbol on `line`, and
// the GitLab blob URL answered 200. sources.test.ts pins the shape and that each site symbol exists
// in this repository; the upstream half cannot be tested offline, so it is a pin, not a promise that
// the upstream file is unchanged since.
//
// Symbols are written as the source writes them: a trailing `()` marks a function. Plutus is a
// private repository, so its entries have no upstream link and say so.

export const SITE_REPO = "ritwick7/portfolio";
export const SITE_BRANCH = "master";

/** How the figure's code relates to the upstream: followed line for line, only fed its data, or written again. */
export type Relation = "ports" | "reimplements" | "reads data from";

export interface UpstreamFile {
  /** GitLab project path, e.g. "ritwick7/sudostamp". */
  repo: string;
  /** File path inside the repository at `commit`. */
  path: string;
  /** The function, class, constant, devicetree node or doc section the figure answers to. */
  symbol: string;
  /** Line of `symbol` at `commit`. */
  line: number;
  /** Full 40-hex sha: the tip of the default branch when this was read. */
  commit: string;
}

export interface NoUpstream {
  repo: null;
  /** Why there is no link, in words the fold can show. */
  note: string;
}

export interface SourceEntry {
  /** Stable id, used in the MDX as <Sources figure="..." />. */
  figure: string;
  /** Slug of the note the figure sits in. */
  slug: string;
  /** The figure's component, as the note's MDX names it. */
  component: string;
  site: { file: string; symbol: string };
  relation: Relation;
  upstream: UpstreamFile | NoUpstream;
}

const PRIVATE_PLUTUS = "private repository; ";

export const SOURCES: readonly SourceEntry[] = [
  // ── Tizen ──────────────────────────────────────────────────────────────
  {
    figure: "ambilight-strip",
    slug: "tizen-video-plane-ambilight",
    component: "Ambilight",
    site: { file: "src/components/figures/Ambilight.tsx", symbol: "Ambilight()" },
    relation: "reimplements",
    upstream: {
      repo: "ritwick7/TizenAmbilight",
      path: "TizenAmbilight/src/ZoneEngine.cs",
      symbol: "ZoneLayout",
      line: 72,
      commit: "ccb646600286a02150aa353db261ca3753a44a9e",
    },
  },
  {
    figure: "pq-to-led",
    slug: "tizen-video-plane-ambilight",
    component: "PqToLed",
    site: { file: "src/lib/pq.ts", symbol: "pqToSdrTable()" },
    relation: "ports",
    upstream: {
      repo: "ritwick7/TizenAmbilight",
      path: "TizenAmbilight/src/VideoPlaneCapture.cs",
      symbol: "BuildPqToSdrTable()",
      line: 442,
      commit: "ccb646600286a02150aa353db261ca3753a44a9e",
    },
  },
  {
    figure: "fallback-ceiling",
    slug: "tizen-video-plane-ambilight",
    component: "Ceiling",
    site: { file: "src/lib/ceiling.ts", symbol: "spotHz()" },
    relation: "reads data from",
    upstream: {
      repo: "ritwick7/TizenAmbilight",
      path: "docs/how-it-works.md",
      symbol: "Hard limits, as measured",
      line: 207,
      commit: "ccb646600286a02150aa353db261ca3753a44a9e",
    },
  },
  // ── kwin-canvas ────────────────────────────────────────────────────────
  {
    figure: "frame-authority",
    slug: "kwin-canvas-frame-classifier",
    component: "FrameAuthority",
    site: { file: "src/lib/frameAuthority.ts", symbol: "isPull()" },
    relation: "ports",
    upstream: {
      repo: "ritwick7/kwin-canvas",
      path: "effect/contents/ui/logic.js",
      symbol: "isPull()",
      line: 259,
      commit: "69644f92b4b7b23fa58f3365923b47714841dd6b",
    },
  },
  // ── ShutUp ─────────────────────────────────────────────────────────────
  {
    figure: "wave-or-reach",
    slug: "shutup-wave-or-reach",
    component: "WaveOrReach",
    site: { file: "src/lib/shutup.ts", symbol: "GestureSession" },
    relation: "ports",
    upstream: {
      repo: "ritwick7/shutup",
      path: "app/src/main/kotlin/com/laughingstock/ritwick/shutup/domain/gesture/GestureSession.kt",
      symbol: "GestureSession",
      line: 29,
      commit: "a1635907e993ab7fdec0fd35b922603f17ce1c53",
    },
  },
  // ── SudoStamp ──────────────────────────────────────────────────────────
  {
    figure: "limiter-timeline",
    slug: "sudostamp-refuse-before-asking",
    component: "LimiterTimeline",
    site: { file: "src/lib/sudostamp.ts", symbol: "Limiter" },
    relation: "ports",
    upstream: {
      repo: "ritwick7/sudostamp",
      path: "app/src/main/java/com/ritwick/sudostamp/Limiter.kt",
      symbol: "Limiter",
      line: 21,
      commit: "c55e2b6944a320d7fdf7076d28f1fc7513a17c34",
    },
  },
  {
    figure: "signature-bytes",
    slug: "sudostamp-refuse-before-asking",
    component: "SignatureBytes",
    site: { file: "src/lib/sudostamp.ts", symbol: "signatureBlob()" },
    relation: "ports",
    upstream: {
      repo: "ritwick7/sudostamp",
      path: "app/src/main/java/com/ritwick/sudostamp/SshSig.kt",
      symbol: "signatureBlob()",
      line: 76,
      commit: "c55e2b6944a320d7fdf7076d28f1fc7513a17c34",
    },
  },
  // ── Chordist ───────────────────────────────────────────────────────────
  {
    figure: "chord-alignment",
    slug: "chordist-chart-alignment",
    component: "ChordAlignment",
    site: { file: "src/lib/chordAlign.ts", symbol: "alignDetail()" },
    relation: "ports",
    upstream: {
      repo: "ritwick7/chordist",
      path: "chordist/align.py",
      symbol: "align()",
      line: 83,
      commit: "d757d9403f4e1e6094be43d97016ba6cb054323a",
    },
  },
  // ── Crush 80 ───────────────────────────────────────────────────────────
  {
    figure: "keymap-layers",
    slug: "crush80-open-firmware",
    component: "KeymapLayers",
    site: { file: "src/lib/layers.ts", symbol: "resolve()" },
    relation: "reads data from",
    upstream: {
      repo: "ritwick7/crush80-zmk",
      path: "config/crush80.keymap",
      symbol: "keymap",
      line: 46,
      commit: "4deee1d15ff2a4ec37e696e09f4e85ff8a46faf4",
    },
  },
  {
    figure: "clock-drift",
    slug: "crush80-open-firmware",
    component: "ClockDrift",
    site: { file: "src/lib/tickDrift.ts", symbol: "tick()" },
    relation: "reads data from",
    upstream: {
      repo: "ritwick7/crush80-zmk",
      path: "conf/app.conf",
      symbol: "CONFIG_SYS_CLOCK_TICKS_PER_SEC",
      line: 37,
      commit: "4deee1d15ff2a4ec37e696e09f4e85ff8a46faf4",
    },
  },
  // ── Homelab: modelled from the note's own description ─────────────────
  {
    figure: "nightly-drift",
    slug: "homelab-git-is-the-truth",
    component: "DriftFigure",
    site: { file: "src/lib/drift.ts", symbol: "plan()" },
    relation: "reimplements",
    upstream: { repo: null, note: "no public upstream; the figure models the nightly job as this note describes it, on a made-up lab state" },
  },
  {
    figure: "lab-topology",
    slug: "homelab-git-is-the-truth",
    component: "LabTopology",
    site: { file: "src/lib/lab.ts", symbol: "labCounts()" },
    relation: "reads data from",
    upstream: { repo: null, note: "no upstream repository; every box is read from this site's own data file, src/lib/data.ts" },
  },
  {
    figure: "paging-rule",
    slug: "homelab-git-is-the-truth",
    component: "PagingFigure",
    site: { file: "src/lib/paging.ts", symbol: "pages()" },
    relation: "reimplements",
    upstream: { repo: null, note: "no public upstream; the figure models the paging rule as this note words it, on made-up health checks" },
  },
  {
    figure: "backup-copies",
    slug: "homelab-git-is-the-truth",
    component: "BackupsFigure",
    site: { file: "src/lib/restore.ts", symbol: "verdict()" },
    relation: "reimplements",
    upstream: { repo: null, note: "no public upstream; the figure is a lookup built from this note's own description of the copies" },
  },
  // ── Plutus: private ────────────────────────────────────────────────────
  {
    figure: "universe-switch",
    slug: "plutus-what-the-backtest-cannot-tell-you",
    component: "UniverseSwitch",
    site: { file: "src/lib/plutusResults.ts", symbol: "UNIVERSES" },
    relation: "reads data from",
    upstream: { repo: null, note: `${PRIVATE_PLUTUS}the figure shows numbers recorded in the strategy's results file, typed in here` },
  },
  {
    figure: "survivor-toy",
    slug: "plutus-what-the-backtest-cannot-tell-you",
    component: "SurvivorToy",
    site: { file: "src/lib/survivorship.ts", symbol: "runToy()" },
    relation: "reimplements",
    upstream: { repo: null, note: `${PRIVATE_PLUTUS}the figure is a synthetic market with the repo's idea in spirit, not its code` },
  },
  {
    figure: "bootstrap-path",
    slug: "plutus-what-the-backtest-cannot-tell-you",
    component: "BootstrapPath",
    site: { file: "src/lib/bootstrap.ts", symbol: "stationaryBootstrap()" },
    relation: "reimplements",
    upstream: { repo: null, note: `${PRIVATE_PLUTUS}the figure reimplements the bootstrap described in the note` },
  },
];

/** Figure components a note renders that have no Source fold, with the reason. Empty: every figure has one. */
export const NO_SOURCE: Readonly<Record<string, string>> = {};

export function sourceFor(figure: string): SourceEntry | undefined {
  return SOURCES.find((s) => s.figure === figure);
}

/** The file on this site's repository, on the branch the site deploys from. */
export function siteUrl(file: string): string {
  return `https://gitlab.com/${SITE_REPO}/-/blob/${SITE_BRANCH}/${file}`;
}

/** The upstream file at its pinned commit, at the symbol's line. */
export function upstreamUrl(u: UpstreamFile): string {
  return `https://gitlab.com/${u.repo}/-/blob/${u.commit}/${u.path}#L${u.line}`;
}

/** A symbol without the `()` that marks a function: what to search a source file for. */
export function bareSymbol(symbol: string): string {
  return symbol.replace(/\(\)$/, "");
}
