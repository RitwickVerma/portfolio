import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/data";
import { CASES } from "@/lib/cases";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: "monthly", priority: 1 },
    ...CASES.map((c) => ({
      url: `${SITE_URL}/work/${c.slug}/`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    })),
    { url: `${SITE_URL}/resume/`, lastModified, changeFrequency: "monthly", priority: 0.8 },
  ];
}
