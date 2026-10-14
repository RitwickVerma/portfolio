// Registry for /notes. One entry per MDX file in src/content/notes; the index
// page, sitemap, OG cards and the terminal all read from here. notes.test.ts
// checks the registry and the directory agree. Newest first.

export interface Note {
  slug: string;
  title: string;
  /** One or two sentences; shown on the index, in metadata and on the OG card. */
  summary: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  tags: string[];
}

export const notes: Note[] = [
  {
    slug: "homelab-git-is-the-truth",
    title: "Git is the truth: a homelab that diffs itself nightly",
    summary:
      "Fifteen guests declared in OpenTofu, a nightly pipeline that commits whatever changed on the box and reports what the plan disagrees with, paging that costs one message per fault. What it caught, and what it is not.",
    date: "2026-10-13",
    tags: ["Proxmox", "OpenTofu", "GitOps", "on-call"],
  },
  {
    slug: "plutus-what-the-backtest-cannot-tell-you",
    title: "Plutus: what the backtest cannot tell you",
    summary:
      "The five-signal bot that lost to SPY, the one signal that survived attribution, a Sharpe of 1.04 with its confidence interval attached, and the ideas tested and rejected on the way.",
    date: "2026-10-13",
    tags: ["Python", "quant", "backtesting"],
  },
  {
    slug: "tizen-video-plane-ambilight",
    title: "Reading a Samsung TV's video plane from inside the TV",
    summary:
      "No capture card, no HDMI splitter: a headless Tizen app pulls decoded frames out of memory and drives an LED strip. The capture ABI, the HDR colour math, and the ways it fails.",
    date: "2026-10-13",
    tags: ["Tizen", ".NET", "HDR", "reverse engineering"],
  },
  {
    slug: "colophon",
    title: "How this site is built, and how it was made",
    summary:
      "A static export served from my own rack, a 3D hero that fails toward a poster, and an AI pair programmer whose commits say so. What is mine, what is verified, what is a dated snapshot.",
    date: "2026-10-13",
    tags: ["this site", "Next.js", "three.js"],
  },
];

export function getNote(slug: string): Note | undefined {
  return notes.find((n) => n.slug === slug);
}

export function noteUrl(note: Pick<Note, "slug">): string {
  return `/notes/${note.slug}/`;
}

/** "13 Oct 2026" from an ISO date, without timezone drift. */
export function formatNoteDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1];
  return `${d} ${month} ${y}`;
}

/** Words per minute for the reading-time estimate; prose with tables and code reads slower. */
export const WORDS_PER_MINUTE = 200;

export function readingMinutes(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
}
