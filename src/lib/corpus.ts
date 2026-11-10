import { projects, experiences, education, services, skills, socialLinks } from "./data";
import { resume } from "./resume";
import { notes, noteUrl, formatNoteDate } from "./notes";
import type { SearchDoc } from "./search";

// Everything the search box can find, built from the same data that renders
// the page. Nothing here is written twice: a change in lib/data, lib/resume
// or lib/notes changes the index on the next build.

/**
 * A short headline per resume bullet, in bullet order. lib/resume.ts is
 * generated, so the headlines live here; corpus.test.ts fails if the counts
 * stop matching, which is the cue to rewrite them.
 */
export const WORK_HEADLINES: readonly (readonly string[])[] = [
  [
    "Owner of eBay Motors fitment",
    "Fitment moved onto the new query-transform architecture",
    "50,000 production queries replayed before a refactor merged",
    "A per-request cache on the search retry path",
    "Query transforms behind results-page product carousels",
    "Markdown test frameworks and a tokenizer API",
  ],
  [
    "Took over fitment and wrote its first tests",
    "Garage-vehicle fitment, two service calls removed",
    "A/B tests in one request, and PMR allocators",
  ],
];

/** "Jun 2023 - Present" as the resume writes it, "Jun 2023 – Present" as the site sets it. */
const dash = (period: string) => period.replace(/ - /g, " – ");

export interface WorkItem {
  id: string;
  headline: string;
  text: string;
}

export interface WorkRole {
  role: string;
  period: string;
  location: string;
  items: WorkItem[];
}

/** The eBay roles with their bullets and headlines; the Work section and the index both read this. */
export const workRoles: WorkRole[] = resume.roles.map((r, ri) => ({
  role: r.role,
  // The site's own data knows when "Present" stops being true; the generated resume does not.
  period: ri === 0 ? experiences[0].period : dash(r.period),
  location: r.location,
  items: r.bullets.map((text, bi) => ({
    id: `work-${ri}-${bi}`,
    headline: WORK_HEADLINES[ri]?.[bi] ?? "",
    text,
  })),
}));

export function projectAnchor(slug: string): string {
  return `p-${slug}`;
}

export function buildCorpus(): SearchDoc[] {
  const work: SearchDoc[] = workRoles.flatMap((r) =>
    r.items.map((item) => ({
      id: item.id,
      kind: "eBay" as const,
      title: item.headline,
      context: `${r.role}, ${r.period}`,
      text: item.text,
      keywords: ["eBay", "Cassini", "C++", "search engine", "backend"],
      href: `/#${item.id}`,
    })),
  );

  const earlier: SearchDoc[] = experiences
    .filter((e) => e.company !== "eBay")
    .map((e, i) => ({
      id: `earlier-${i}`,
      kind: "Earlier work" as const,
      title: `${e.role}, ${e.company}`,
      context: e.period,
      text: e.description.join(" "),
      keywords: e.tech,
      href: "/#earlier",
    }));

  const projectDocs: SearchDoc[] = projects.map((p) => ({
    id: `project-${p.slug}`,
    kind: "Project" as const,
    title: p.title,
    context: p.role,
    text: `${p.description} ${p.why} ${p.metric.value} ${p.metric.label}.`,
    keywords: [...p.tech, p.category, p.role],
    href: `/#${projectAnchor(p.slug)}`,
  }));

  const noteDocs: SearchDoc[] = notes.map((n) => ({
    id: `note-${n.slug}`,
    kind: "Note" as const,
    title: n.title,
    context: formatNoteDate(n.date),
    text: n.summary,
    keywords: n.tags,
    href: noteUrl(n),
  }));

  const lab: SearchDoc[] = services.map((s) => ({
    id: `lab-${s.ct}`,
    kind: "Homelab" as const,
    title: s.name,
    context: `${s.ct}, one of ${services.length} guests on the Proxmox host`,
    text: `${s.description}.`,
    keywords: [...s.tech, s.ct],
    href: "/#homelab",
  }));

  const skillDocs: SearchDoc[] = [
    {
      id: "skills-languages",
      kind: "Skills",
      title: "Languages I write myself",
      context: "Skills",
      text: `${skills.languages.join(", ")}.`,
      href: "/#skills",
    },
    {
      id: "skills-domains",
      kind: "Skills",
      title: "Domains",
      context: "Skills",
      text: `${skills.domains.join(", ")}.`,
      href: "/#skills",
    },
    {
      id: "skills-tools",
      kind: "Skills",
      title: "Tools and platforms",
      context: "Skills",
      text: `${skills.tools.join(", ")}.`,
      href: "/#skills",
    },
  ];

  const edu: SearchDoc[] = education.map((e, i) => ({
    id: `education-${i}`,
    kind: "Education" as const,
    title: e.degree,
    context: e.period,
    text: `${e.school}.`,
    keywords: ["education", "university"],
    href: "/#earlier",
  }));

  const pages: SearchDoc[] = [
    {
      id: "page-resume",
      kind: "Page",
      title: "Resume, one page",
      context: `Updated ${resume.updated}`,
      text: resume.summary,
      keywords: ["resume", "PDF", "download"],
      href: socialLinks.resume,
    },
    {
      id: "page-contact",
      kind: "Page",
      title: "Email is the fastest way to reach me",
      context: experiences[0].location ?? "",
      text: "I read everything that comes in and reply within a day.",
      keywords: ["email", "contact", "LinkedIn", "GitHub", "GitLab"],
      href: "/#contact",
    },
  ];

  const starting = new Set<string>(STARTING_POINTS);
  return [...work, ...projectDocs, ...noteDocs, ...earlier, ...skillDocs, ...edu, ...lab, ...pages].map((d) => ({
    ...d,
    prior: (KIND_PRIOR[d.kind] ?? 1) * (starting.has(d.id) ? STARTING_PRIOR : 1),
  }));
}

/**
 * Static rank by kind. The eBay record is what this site is for, so it leads
 * when a query matches it about as well as a side project. A skills list or a one-line guest entry is short, and
 * BM25 rewards short documents; these keep a list of keywords from outranking
 * the work it summarises.
 */
const KIND_PRIOR: Partial<Record<SearchDoc["kind"], number>> = { eBay: 1.3, Skills: 0.6, Homelab: 0.6 };

/** Static rank for the starting points: on a near tie, the document I would show first wins. */
export const STARTING_PRIOR = 1.25;

/** Shown before anything is typed: where I would start a stranger. */
export const STARTING_POINTS = [
  "work-0-0",
  "work-0-2",
  "work-1-0",
  "project-tizen-ambilight",
  "note-crush80-open-firmware",
] as const;

/** Queries offered under the box. Each one must return results (corpus.test.ts). */
export const EXAMPLE_QUERIES = ["fitment", "c++", "testing", "caching", "reverse engineering", "android", "infra"] as const;
