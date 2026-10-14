import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/data";
import { notes, noteUrl } from "@/lib/notes";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/resume/`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/notes/`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    ...notes.map((n) => ({
      url: `${SITE_URL}${noteUrl(n)}`,
      lastModified: new Date(n.date),
      changeFrequency: "yearly" as const,
      priority: 0.7,
    })),
  ];
}
