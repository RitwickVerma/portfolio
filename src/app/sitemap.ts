import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/data";
import { notes, noteUrl } from "@/lib/notes";
import { apps } from "@/lib/apps";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  // No build-time stamp: lastmod that changes every deploy tells crawlers nothing.
  return [
    { url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/resume/`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/notes/`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/engine/`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/design/`, changeFrequency: "yearly", priority: 0.5 },
    ...Object.values(apps).map((a) => ({
      url: `${SITE_URL}/apps/${a.slug}/`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...notes.map((n) => ({
      url: `${SITE_URL}${noteUrl(n)}`,
      lastModified: new Date(n.updated ?? n.date),
      changeFrequency: "yearly" as const,
      priority: 0.7,
    })),
  ];
}
