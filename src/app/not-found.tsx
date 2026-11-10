import type { Metadata } from "next";
import Link from "next/link";

// No canonical: the root layout's "/" would otherwise mark every 404 as a copy of the home page.
export const metadata: Metadata = { title: "Not found", robots: { index: false }, alternates: { canonical: null } };

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
