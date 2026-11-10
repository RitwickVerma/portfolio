import type { Metadata } from "next";
import Link from "next/link";

const TITLE = "Not found";
const DESCRIPTION = "No document matches that address. The index holds only what is on this site.";

// Nothing is inherited from the home page: no canonical (the layout's "/" would mark every 404 as a
// copy of it), no og:url, and a description of its own. An openGraph of its own, without a url,
// replaces the layout's whole openGraph, so the home page's url and card do not carry over.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: false },
  alternates: { canonical: null },
  openGraph: { title: `${TITLE} · Ritwick Verma`, description: DESCRIPTION, siteName: "ritwickverma.dev", type: "website", locale: "en_US" },
  twitter: { card: "summary", title: `${TITLE} · Ritwick Verma`, description: DESCRIPTION },
};

export default function NotFound() {
  return (
    <main id="main" className="flex-1 flex flex-col justify-center gap-5 max-w-[78rem] w-full mx-auto px-5 sm:px-8 min-h-screen">
      <h1 className="wd-wide text-display font-black leading-[0.86]">404</h1>
      <p className="text-lede max-w-[34ch]">
        No document matches that address. The index holds only what is on this site.
      </p>
      <p className="flex flex-wrap gap-x-6 gap-y-2 text-lg">
        <Link href="/" className="link">
          Search the site
        </Link>
        <Link href="/notes/" className="link">
          Read the notes
        </Link>
        <Link href="/resume/" className="link">
          Open the resume
        </Link>
      </p>
    </main>
  );
}
