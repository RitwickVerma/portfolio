import { SITE_URL, socialLinks, EBAY_ENDED } from "./data";

export const SITE_TITLE = "Ritwick Verma, backend engineer";
export const SITE_DESCRIPTION =
  "Backend engineer: 5.5 years on Cassini, eBay's C++ search engine. Firmware, Android and reverse-engineering projects, and notes with the numbers left in.";

/** schema.org Person for the home and resume pages. */
export function personJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Ritwick Verma",
    url: SITE_URL,
    jobTitle: "Backend Engineer",
    knowsAbout: ["C++", "Search systems", "Information retrieval", "Query rewriting", "Distributed systems"],
    ...(EBAY_ENDED ? {} : { worksFor: { "@type": "Organization", name: "eBay", url: "https://www.ebay.com" } }),
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
