import { notes } from "@/lib/notes";
import { noteText } from "@/lib/notes.server";

// The bodies of the notes, split at their headings, emitted as a static JSON
// file at build. The search box starts on the record alone and fetches this
// once the browser is idle, so the notes' full text never weighs on first paint.
export const dynamic = "force-static";

export function GET() {
  return Response.json(notes.map((n) => noteText(n.slug)));
}
