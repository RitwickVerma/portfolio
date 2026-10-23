import type { Metadata } from "next";
import Link from "next/link";
import { notes, noteUrl, formatNoteDate } from "@/lib/notes";
import { noteReadingMinutes } from "@/lib/notes.server";

const DESCRIPTION =
  "Engineering notes by Ritwick Verma: how specific things were built, with the numbers left in.";

const OG_ALT = "Ritwick Verma. Notes. How specific things were built, with the numbers left in.";

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
    <div className="max-w-3xl mx-auto px-6 pt-32 pb-24 sm:pb-32">
      <h1 className="font-mono text-muted text-sm tracking-widest uppercase mb-3">Notes</h1>
      <p className="text-fg/80 leading-relaxed max-w-2xl mb-14">
        How specific things were built, with the numbers and the failures left in.
      </p>

      <ol className="space-y-12">
        {notes.map((n) => (
          <li key={n.slug}>
            <article>
              <p className="font-mono text-xs text-muted mb-2">
                <time dateTime={n.date}>{formatNoteDate(n.date)}</time>
                {n.updated && (
                  <>
                    <span aria-hidden="true"> · </span>
                    Updated <time dateTime={n.updated}>{formatNoteDate(n.updated)}</time>
                  </>
                )}
                <span aria-hidden="true"> · </span>
                {noteReadingMinutes(n.slug)} min read
              </p>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
                <Link href={noteUrl(n)} className="text-fg hover:text-accent transition-colors">
                  {n.title}
                </Link>
              </h2>
              <p className="mt-3 text-fg/75 leading-relaxed">{n.summary}</p>
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {n.tags.map((t) => (
                  <li
                    key={t}
                    className="text-xs font-mono text-fg/70 bg-surface border border-border rounded px-2 py-0.5"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
}
