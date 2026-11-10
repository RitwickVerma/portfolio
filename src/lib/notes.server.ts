import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { readingMinutes } from "./notes";
import { slugify } from "./slug";
import type { NoteText } from "./corpus";

// Build-time only (static export runs server components at `next build`).
// Kept apart from notes.ts so the registry stays importable from the client.

export const NOTES_DIR = join(process.cwd(), "src", "content", "notes");

export function noteSource(slug: string): string {
  return readFileSync(join(NOTES_DIR, `${slug}.mdx`), "utf8");
}

export function noteSlugsOnDisk(): string[] {
  return readdirSync(NOTES_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""))
    .sort();
}

/** Prose words only: fenced code and import/export lines are not read at prose speed. */
export function noteWordCount(slug: string): number {
  const body = noteSource(slug)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^(import|export)\s.*$/gm, " ");
  return body.split(/\s+/).filter(Boolean).length;
}

export function noteReadingMinutes(slug: string): number {
  return readingMinutes(noteWordCount(slug));
}

/** Markdown to the plain prose a reader sees: no fences, no markup, links as their text. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^(import|export)\s.*$/gm, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s*\|?[\s:|-]+\|?\s*$/gm, " ")
    .replace(/\|/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, "")
    .replace(/[`*_>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** A note split at its `##` headings: the text before the first one, then each section with its anchor id. */
export function noteText(slug: string): NoteText {
  const parts = noteSource(slug).split(/^## +(.+)$/m);
  const sections = [];
  for (let i = 1; i < parts.length; i += 2) {
    const heading = plainText(parts[i]);
    sections.push({ id: slugify(heading), heading, text: plainText(parts[i + 1] ?? "") });
  }
  return { slug, intro: plainText(parts[0]), sections };
}

/** Every `##` and `###` heading of a note, in order, for its contents rail. */
export function noteHeadings(slug: string): { id: string; text: string; depth: 2 | 3 }[] {
  const source = noteSource(slug).replace(/```[\s\S]*?```/g, "");
  return [...source.matchAll(/^(##|###) +(.+)$/gm)].map((m) => {
    const text = plainText(m[2]);
    return { id: slugify(text), text, depth: m[1].length as 2 | 3 };
  });
}
