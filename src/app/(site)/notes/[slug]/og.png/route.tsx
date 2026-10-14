import { notes, getNote, formatNoteDate } from "@/lib/notes";
import { hero } from "@/lib/data";
import { renderOg } from "@/lib/og";

// One social card per note, rendered to a real .png at build.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return notes.map((n) => ({ slug: n.slug }));
}

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const note = getNote(slug);
  if (!note) return new Response("Not found", { status: 404 });
  return renderOg({
    eyebrow: `ritwickverma.dev/notes · ${formatNoteDate(note.date)}`,
    name: note.title,
    nameSize: 56,
    line: hero.name,
    lineTwo: note.summary,
  });
}
