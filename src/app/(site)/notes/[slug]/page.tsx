import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { notes, getNote, noteUrl, formatNoteDate } from "@/lib/notes";
import { noteReadingMinutes, noteHeadings } from "@/lib/notes.server";
import { NoteContents, NoteHighlights } from "@/components/NoteExtras";
import { SITE_URL, hero } from "@/lib/data";
import { jsonLdString } from "@/lib/seo";

type Params = { params: Promise<{ slug: string }> };

// Every note is prerendered at build; anything else is a 404 (static export).
export const dynamicParams = false;

export function generateStaticParams() {
  return notes.map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const note = getNote(slug);
  if (!note) return {};
  const url = noteUrl(note);
  const og = `${url}og.png`;
  return {
    // Long titles drop the " · Ritwick Verma" suffix so the <title> stays under 60 characters.
    title: note.title.length > 43 ? { absolute: note.title } : note.title,
    description: note.summary,
    alternates: { canonical: url },
    openGraph: {
      title: note.title,
      description: note.summary,
      url,
      type: "article",
      siteName: "ritwickverma.dev",
      locale: "en_US",
      publishedTime: note.date,
      ...(note.updated ? { modifiedTime: note.updated } : {}),
      authors: [hero.name],
      images: [{ url: og, width: 1200, height: 630, alt: note.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: note.title,
      description: note.summary,
      images: [{ url: og, alt: note.title }],
    },
  };
}

export default async function NotePage({ params }: Params) {
  const { slug } = await params;
  const note = getNote(slug);
  if (!note) notFound();

  const { default: Body } = await import(`@/content/notes/${slug}.mdx`);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: note.title,
    description: note.summary,
    datePublished: note.date,
    ...(note.updated ? { dateModified: note.updated } : {}),
    author: { "@type": "Person", name: hero.name, url: SITE_URL },
    url: `${SITE_URL}${noteUrl(note)}`,
  };

  return (
    <article className="max-w-[var(--page)] mx-auto px-5 sm:px-8 pt-12 sm:pt-16 pb-24 sm:pb-32">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(articleJsonLd) }}
      />
      <header className="mb-12 pb-10 border-b-2 border-fg">
        <p className="wd-narrow text-[0.95rem] text-muted mb-5">
          <Link href="/notes/" className="link">
            Notes
          </Link>
          <span aria-hidden="true">, </span>
          <time dateTime={note.date}>{formatNoteDate(note.date)}</time>
          {note.updated && (
            <>
              <span aria-hidden="true">, </span>
              updated <time dateTime={note.updated}>{formatNoteDate(note.updated)}</time>
            </>
          )}
          <span aria-hidden="true">, </span>
          {noteReadingMinutes(note.slug)} min read
        </p>
        <h1 className="wd-semi text-[clamp(2.1rem,5vw,4.25rem)] font-extrabold leading-[1] max-w-[20ch]">
          {note.title}
        </h1>
        <p className="mt-6 text-lede leading-[1.3] text-fg/80 max-w-[44ch]">{note.summary}</p>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,44rem)_1fr] gap-x-16">
        <div className="min-w-0">
          <NoteHighlights />
          <div className="note text-[1.0625rem]">
            <Body />
          </div>
        </div>
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <NoteContents headings={noteHeadings(slug)} />
          </div>
        </aside>
      </div>

      <footer className="mt-16 pt-6 border-t border-border max-w-[44rem] flex flex-wrap items-baseline justify-between gap-4">
        <p className="wd-narrow text-[0.95rem] text-muted">{note.tags.join(", ")}</p>
        <Link href="/notes/" className="link">
          All notes
        </Link>
      </footer>
    </article>
  );
}
