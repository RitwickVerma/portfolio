// The three case studies. Every number below is a measured value from the
// project's own logs or reports — see the per-case pages for where each comes from.

export type CaseIndex = {
  slug: "ambilight" | "plutus" | "homelab";
  idx: string;
  /** Title split so one phrase can be set in italic. */
  title: [string, string, string?];
  summary: string;
  figure: { value: string; label: string };
  meta: { role: string; stack: string; status: string; period: string };
};

export const CASES: CaseIndex[] = [
  {
    slug: "ambilight",
    idx: "01",
    title: ["The TV that ", "lights its own room", ""],
    summary:
      "A headless service on a Samsung TV reads its own video plane through an undocumented capture API and drives a 75-LED strip from the live picture. Profiling found the bottleneck everyone assumed — the capture — wasn't it.",
    figure: { value: "8 → 46", label: "frames per second" },
    meta: {
      role: "Design, reverse engineering, implementation",
      stack: "C++ · Tizen native service · UDP → WLED",
      status: "Running daily in the media room",
      period: "2026",
    },
  },
  {
    slug: "plutus",
    idx: "02",
    title: ["Proving my trading bot ", "doesn’t work", ""],
    summary:
      "Plutus is a long-short equity bot with nightly point-in-time backtests. Its first backtest said +149%. Three bugs later, and after 30+ experiments built to falsify it, the honest answer is no demonstrated edge — and a set of method rules that caught every fake result along the way.",
    figure: { value: "+0.57%", label: "walk-forward vs SPY +95.3%" },
    meta: {
      role: "Author — research, engineering, operations",
      stack: "Python · Alpaca (paper) · SQLite · GitLab CI",
      status: "Paper trading; research ledger public here",
      period: "2026",
    },
  },
  {
    slug: "homelab",
    idx: "03",
    title: ["A homelab run ", "like production", ""],
    summary:
      "Fifteen guests on one Proxmox host behind a Debian gateway with SSO and a VPN, pinned images, nightly backups and health checks that stay silent until something breaks. Plus two honest postmortems — one of them about this very site.",
    figure: { value: "15", label: "guests · 4 public hostnames" },
    meta: {
      role: "Architect and sole operator",
      stack: "Proxmox · Docker · Traefik · Authelia · Headscale",
      status: "In service",
      period: "Ongoing",
    },
  },
];

export function caseBySlug(slug: CaseIndex["slug"]) {
  return CASES.find((c) => c.slug === slug)!;
}

/** Ambilight: measured frame rate and colour error per zone-sampling step (same frame, every-pixel reference). */
export const ZONE_SAMPLE = [
  { zs: 1, fps: 10.2, meanErr: 0, note: "every pixel — the reference" },
  { zs: 3, fps: 46.4, meanErr: 3.5, note: "shipped default · 89% of zones within ±3 of the reference" },
  { zs: 6, fps: 76.2, meanErr: 7.5, note: "zs ≥ 4 doubles the error for little extra rate" },
] as const;

/** Ambilight: perimeter zones per edge (73 total) feeding a 75-LED strip. */
export const ZONES = { top: 23, bottom: 24, left: 13, right: 13 } as const;

/** Plutus: what each stage of honesty did to the headline result. */
export const PLUTUS_STAGES = [
  { label: "First backtest", value: 149, bench: null, note: "three bugs, undetected" },
  { label: "Bugs fixed · 2024–25", value: 39, bench: 49, note: "trails SPY by 10 points" },
  { label: "Walk-forward · 2020–24", value: 0.57, bench: 95.3, note: "out of sample: no edge" },
] as const;
