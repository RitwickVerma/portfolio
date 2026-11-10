// Registry for /notes. One entry per MDX file in src/content/notes; the index
// page, sitemap, OG cards and the search index all read from here. notes.test.ts
// checks the registry and the directory agree. Newest first.

export interface Note {
  slug: string;
  title: string;
  /** One or two sentences; shown on the index, in metadata and on the OG card. */
  summary: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** ISO date of the last change a reader would notice; shown as "Updated …". */
  updated?: string;
  tags: string[];
}

export const notes: Note[] = [
  {
    slug: "sudostamp-refuse-before-asking",
    title: "A phone that approves sudo refuses first",
    summary:
      "SudoStamp's phone limits requests by computer, not address, and refuses before it asks. One encoding detail decides if a signature verifies.",
    date: "2026-11-10",
    tags: ["SudoStamp", "Android Keystore", "ssh-agent", "security"],
  },
  {
    slug: "kwin-canvas-frame-classifier",
    title: "I undo KWin's moves by their shape",
    summary:
      "kwin-canvas parks windows where KWin will not leave them. It undoes a move only when it has the shape of KWin's rule. Drag a window and see the verdict.",
    date: "2026-11-10",
    tags: ["KWin", "QML", "compositor", "testing"],
  },
  {
    slug: "shutup-wave-or-reach",
    title: "Reaching to decline looks like a wave",
    summary:
      "A hand reaching for Decline crosses a proximity sensor like a wave does. Three rules and a property test keep ShutUp from answering when you reach.",
    date: "2026-11-10",
    tags: ["Android", "Kotlin", "property testing", "sensors"],
  },
  {
    slug: "chordist-chart-alignment",
    title: "One bad row should not move the rest",
    summary:
      "Drop one row from a chord chart and the old greedy matcher loses its place for the rest of the song. Chordist's alignment keeps it. Try it on Amazing Grace.",
    date: "2026-11-10",
    tags: ["Chordist", "dynamic programming", "sequence alignment", "Python"],
  },
  {
    slug: "crush80-open-firmware",
    title: "Open firmware for a keyboard that shipped none",
    summary:
      "Hold Fn on the real keymap. A rounding error made its clock run 6.7% fast, and I got the chip wrong twice before I read the board.",
    date: "2026-10-21",
    updated: "2026-11-10",
    tags: ["ZMK", "RISC-V", "reverse engineering", "firmware"],
  },
  {
    slug: "homelab-git-is-the-truth",
    title: "Git is the truth: a homelab that diffs itself nightly",
    summary:
      "Sixteen guests with fourteen declared in OpenTofu. A nightly pipeline commits whatever changed on the box. What it caught and where it falls short.",
    date: "2026-10-13",
    updated: "2026-11-10",
    tags: ["Proxmox", "OpenTofu", "GitOps", "on-call"],
  },
  {
    slug: "plutus-what-the-backtest-cannot-tell-you",
    title: "Plutus: what the backtest cannot tell you",
    summary:
      "I found no edge. The same code earned 21.3% a year on today's index members and 3.1% on the members of the day. Press the figures.",
    date: "2026-10-13",
    updated: "2026-11-10",
    tags: ["Python", "quant", "backtesting"],
  },
  {
    slug: "tizen-video-plane-ambilight",
    title: "Reading a Samsung TV's video plane from inside the TV",
    summary:
      "No capture card and no HDMI splitter. A headless Tizen app reads decoded frames from the TV's memory and drives an LED strip. How it works and how it fails.",
    date: "2026-10-13",
    updated: "2026-11-10",
    tags: ["Tizen", ".NET", "HDR", "reverse engineering"],
  },
  {
    slug: "colophon",
    title: "How this site is built, and how it was made",
    summary:
      "What on this site is mine, what is machine-made under my direction and which numbers are dated snapshots.",
    date: "2026-10-13",
    updated: "2026-11-10",
    tags: ["this site", "Next.js", "search"],
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
