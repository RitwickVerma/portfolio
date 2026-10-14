import { SITE_URL, socialLinks } from "./data";

export const SITE_TITLE = "Ritwick Verma, software engineer";
export const SITE_DESCRIPTION =
  "Software engineer on eBay's C++ search engine. Android, firmware and reverse-engineering projects, a paper-traded momentum strategy, and engineering notes with the numbers left in.";

/** schema.org Person for the home and resume pages. */
export function personJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Ritwick Verma",
    url: SITE_URL,
    jobTitle: "Software Engineer 3",
    worksFor: { "@type": "Organization", name: "eBay", url: "https://www.ebay.com" },
    alumniOf: [
      { "@type": "CollegeOrUniversity", name: "University of California, Irvine" },
      { "@type": "CollegeOrUniversity", name: "SRM Institute of Science and Technology" },
    ],
    sameAs: [
      socialLinks.github,
      socialLinks.gitlab,
      socialLinks.linkedin,
    ],
  };
}

/** Serialise for a <script type="application/ld+json">; `<` is escaped so a string can never close the tag. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
