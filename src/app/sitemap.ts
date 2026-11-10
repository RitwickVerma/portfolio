import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/data";
import { notes, noteUrl } from "@/lib/notes";
import { apps } from "@/lib/apps";

export const dynamic = "force-static";

// lastmod appears only where the repo holds a real date for the page: a note's
// own updated/date, and /notes/ (the index changes when a note is added or
// edited, so it takes the newest of those). Every other page has no date
// source, and a build-time stamp would change on every deploy and tell
// crawlers nothing, so those entries carry none. Dates are the plain
// YYYY-MM-DD strings lib/notes holds.
const noteDate = (n: (typeof notes)[number]) => n.updated ?? n.date;
const newestNote = notes.map(noteDate).reduce((a, b) => (a > b ? a : b));

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/resume/`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/notes/`, lastModified: newestNote, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/engine/`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/design/`, changeFrequency: "yearly", priority: 0.5 },
    ...Object.values(apps).map((a) => ({
      url: `${SITE_URL}/apps/${a.slug}/`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...notes.map((n) => ({
      url: `${SITE_URL}${noteUrl(n)}`,
      lastModified: noteDate(n),
      changeFrequency: "yearly" as const,
      priority: 0.7,
    })),
  ];
}
