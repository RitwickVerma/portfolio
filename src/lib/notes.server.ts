import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { readingMinutes } from "./notes";

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
