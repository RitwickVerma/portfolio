import type { Metadata } from "next";
import { SITE_URL, hero, socialLinks, EBAY_ENDED } from "./data";
import { noteUrl, type Note } from "./notes";

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

/** schema.org TechArticle for a note; `image` is the note's own card, as an absolute URL (Google wants one for an article). */
export function noteJsonLd(note: Note) {
  const url = `${SITE_URL}${noteUrl(note)}`;
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: note.title,
    description: note.summary,
    image: `${url}og.png`,
    datePublished: note.date,
    ...(note.updated ? { dateModified: note.updated } : {}),
    author: { "@type": "Person", name: hero.name, url: SITE_URL },
    url,
  };
}

/** Serialise for a <script type="application/ld+json">; `<` is escaped so a string can never close the tag. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** Longest <title> and meta description tools/seo-audit.mjs and seo.test.ts accept ("under 60", "under 160"). */
export const TITLE_MAX = 59;
export const DESCRIPTION_MAX = 159;

/**
 * `text` cut to fit a meta description: whole sentences while they fit, otherwise cut at a word
 * with an ellipsis. For pages whose own summary is longer than a description may be.
 */
export function fitDescription(text: string, max = DESCRIPTION_MAX): string {
  if (text.length <= max) return text;
  let out = "";
  for (const sentence of text.match(/[^.!?]+[.!?]+(?=\s|$)/g) ?? []) {
    const next = out ? `${out} ${sentence.trim()}` : sentence.trim();
    if (next.length > max) break;
    out = next;
  }
  if (out) return out;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:]$/, "")}…`;
}

/**
 * What a page-specific social card says. The card route renders these strings
 * and the page's metadata takes its image alt from them, so the alt cannot
 * drift from the picture. Every string is lifted from the page it belongs to
 * (seo.test.ts checks that against the page source).
 */
export type OgCard = {
  /** Path of the page the card is for, with trailing slash. */
  path: string;
  /** Path of the card image. */
  image: string;
  eyebrow: string;
  name: string;
  nameSize?: number;
  line: string;
  lineTwo: string;
};

export const OG_CARDS = {
  engine: {
    path: "/engine/",
    image: "/engine/og.png",
    eyebrow: "ritwickverma.dev/engine",
    name: "The engine room",
    line: "How the search on ritwickverma.dev works",
    lineTwo: "A query taken apart stage by stage and a control-against-treatment replay of judged queries.",
  },
  design: {
    path: "/design/",
    image: "/design/og.png",
    eyebrow: "ritwickverma.dev/design",
    name: "Index",
    line: "The design language of ritwickverma.dev",
    lineTwo: "Five rules, seven colours and their contrast, one typeface at three widths, and a table of tokens and parts.",
  },
} as const satisfies Record<string, OgCard>;

/** The alt text for a card: the words on it, in reading order. */
export function ogAlt(card: Pick<OgCard, "name" | "line" | "lineTwo">): string {
  return `${card.name}. ${card.line}. ${card.lineTwo}`;
}

/**
 * canonical, openGraph and twitter for a page that has its own card.
 * `socialTitle` is the full og/twitter title (with the site suffix the layout
 * template adds to the <title>); the description is shared by meta, og and twitter.
 */
export function cardMetadata(
  card: OgCard,
  { socialTitle, description }: { socialTitle: string; description: string },
): Pick<Metadata, "alternates" | "openGraph" | "twitter"> {
  const alt = ogAlt(card);
  return {
    alternates: { canonical: card.path },
    openGraph: {
      title: socialTitle,
      description,
      url: card.path,
      siteName: "ritwickverma.dev",
      type: "website",
      locale: "en_US",
      images: [{ url: card.image, width: 1200, height: 630, alt }],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [{ url: card.image, alt }],
    },
  };
}
