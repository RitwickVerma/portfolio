import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { notes, getNote, noteUrl, formatNoteDate } from "@/lib/notes";
import { noteReadingMinutes } from "@/lib/notes.server";
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
    title: note.title,
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
    author: { "@type": "Person", name: hero.name, url: SITE_URL },
    url: `${SITE_URL}${noteUrl(note)}`,
  };

  return (
    <article className="max-w-3xl mx-auto px-6 pt-32 pb-24 sm:pb-32">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(articleJsonLd) }}
      />
      <header className="mb-12">
        <p className="font-mono text-xs text-muted mb-4">
          <Link href="/notes/" className="text-accent hover:underline underline-offset-4">
            Notes
          </Link>
          <span aria-hidden="true"> · </span>
          <time dateTime={note.date}>{formatNoteDate(note.date)}</time>
          <span aria-hidden="true"> · </span>
          {noteReadingMinutes(note.slug)} min read
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-fg leading-[1.1]">
          {note.title}
        </h1>
        <p className="mt-5 text-lg text-fg/75 leading-relaxed">{note.summary}</p>
      </header>

      <div className="note">
        <Body />
      </div>

      <footer className="mt-16 pt-8 border-t border-border flex flex-wrap items-center justify-between gap-4 text-sm">
        <ul className="flex flex-wrap gap-1.5">
          {note.tags.map((t) => (
            <li
              key={t}
              className="text-xs font-mono text-fg/70 bg-surface border border-border rounded px-2 py-0.5"
            >
              {t}
            </li>
          ))}
        </ul>
        <Link href="/notes/" className="text-accent hover:underline underline-offset-4">
          ← All notes
        </Link>
      </footer>
    </article>
  );
}
