import Link from "next/link";
import { notes, noteUrl, formatNoteDate } from "@/lib/notes";

// The writing, on the home page. Titles and summaries only; reading time and
// tags live on /notes.
export default function NotesSection() {
  return (
    <section id="notes" className="max-w-6xl mx-auto px-6 py-24 sm:py-32">
      <div className="flex items-baseline justify-between gap-6 mb-8">
        <h2 className="font-mono text-muted text-sm tracking-widest uppercase">Notes</h2>
        <Link href="/notes/" className="text-sm text-accent hover:underline underline-offset-4">
          All notes →
        </Link>
      </div>
      <ol className="grid md:grid-cols-2 gap-x-12 gap-y-10">
        {notes.map((n) => (
          <li key={n.slug}>
            <p className="font-mono text-xs text-muted mb-2">
              <time dateTime={n.date}>{formatNoteDate(n.date)}</time>
            </p>
            <h3 className="text-lg font-semibold tracking-tight leading-snug">
              <Link href={noteUrl(n)} className="text-fg hover:text-accent transition-colors">
                {n.title}
              </Link>
            </h3>
            <p className="mt-2 text-sm text-fg/70 leading-relaxed">{n.summary}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
