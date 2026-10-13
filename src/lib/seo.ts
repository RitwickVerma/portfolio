import { SITE_URL, socialLinks } from "./data";

export const SITE_TITLE = "Ritwick Verma — Software Engineer";
export const SITE_DESCRIPTION =
  "Backend engineer at eBay. Case studies with the numbers: reverse-engineering a TV's video capture for an ambilight, falsifying my own trading bot, and running a 15-guest homelab like production.";

/** schema.org Person for the home and resume pages. */
export function personJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Ritwick Verma",
    url: SITE_URL,
    jobTitle: "Software Engineer",
    worksFor: { "@type": "Organization", name: "eBay", url: "https://www.ebay.com" },
    alumniOf: [
      { "@type": "CollegeOrUniversity", name: "University of California, Irvine" },
      { "@type": "CollegeOrUniversity", name: "SRM Institute of Science and Technology" },
    ],
    sameAs: [
      socialLinks.github,
      socialLinks.gitlab,
      "https://www.linkedin.com/in/ritwickverma",
    ],
  };
}

/** Serialise for a <script type="application/ld+json">; `<` is escaped so a string can never close the tag. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
