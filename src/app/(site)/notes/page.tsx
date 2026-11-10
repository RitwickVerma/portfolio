import type { Metadata } from "next";
import Link from "next/link";
import { notes, noteUrl, formatNoteDate } from "@/lib/notes";
import { noteReadingMinutes } from "@/lib/notes.server";

const DESCRIPTION =
  "Engineering notes by Ritwick Verma: how specific things were built, with the numbers and the failures left in.";

const OG_ALT = "Ritwick Verma. Notes. How specific things were built, with the numbers and the failures left in.";

export const metadata: Metadata = {
  title: "Notes",
  description: DESCRIPTION,
  alternates: { canonical: "/notes/" },
  openGraph: {
    title: "Notes · Ritwick Verma",
    description: DESCRIPTION,
    url: "/notes/",
    siteName: "ritwickverma.dev",
    type: "website",
    locale: "en_US",
    images: [{ url: "/notes/og.png", width: 1200, height: 630, alt: OG_ALT }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Notes · Ritwick Verma",
    description: DESCRIPTION,
    images: [{ url: "/notes/og.png", alt: OG_ALT }],
  },
};

export default function NotesIndex() {
  return (
    <div className="max-w-[var(--page)] mx-auto px-5 sm:px-8 pt-12 sm:pt-16 pb-24 sm:pb-32">
      <h1 className="wd-wide text-[clamp(3rem,8vw,6.5rem)] font-black leading-[0.9] -ml-[0.04em]">Notes</h1>
      <p className="mt-5 text-lede leading-[1.25] max-w-[36ch] mb-14">
        How specific things were built, with the numbers and the failures left in.
      </p>

      <ol className="max-w-3xl border-b border-border">
        {notes.map((n) => (
          <li key={n.slug} className="border-t border-border py-7">
            <article>
              <p className="wd-narrow text-[0.95rem] text-muted mb-1.5">
                <time dateTime={n.date}>{formatNoteDate(n.date)}</time>
                {n.updated && (
                  <>
                    <span aria-hidden="true">, </span>
                    updated <time dateTime={n.updated}>{formatNoteDate(n.updated)}</time>
                  </>
                )}
                <span aria-hidden="true">, </span>
                {noteReadingMinutes(n.slug)} min read
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold leading-tight">
                <Link href={noteUrl(n)} className="link">
                  {n.title}
                </Link>
              </h2>
              <p className="mt-3 text-fg/85 max-w-[64ch]">{n.summary}</p>
              <p className="mt-2 wd-narrow text-[0.95rem] text-muted">{n.tags.join(", ")}</p>
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
}
