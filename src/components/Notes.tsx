import Link from "next/link";
import { notes, noteUrl, formatNoteDate } from "@/lib/notes";
import Section from "@/components/Section";

export default function Notes() {
  return (
    <Section
      id="notes"
      title="I write things up with the numbers and the failures left in."
      lede={
        <p>
          How specific things were built, including the wrong turns.{" "}
          <Link href="/notes/" className="link">
            All {notes.length} notes
          </Link>
        </p>
      }
    >
      <ol className="border-b border-border">
        {notes.map((n) => (
          <li key={n.slug} className="border-t border-border py-5 grid lg:grid-cols-12 gap-x-8 gap-y-1">
            <p className="lg:col-span-2 wd-narrow text-[0.95rem] text-muted lg:pt-1">
              <time dateTime={n.date}>{formatNoteDate(n.date)}</time>
            </p>
            <h3 className="lg:col-span-5 text-xl font-semibold leading-snug">
              <Link href={noteUrl(n)} className="link">
                {n.title}
              </Link>
            </h3>
            <p className="lg:col-span-5 text-fg/80">{n.summary}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
