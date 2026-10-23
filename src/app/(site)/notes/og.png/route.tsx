import { hero } from "@/lib/data";
import { renderOg } from "@/lib/og";

// Social card for the notes index; the per-note cards live under [slug]/og.png.
export const dynamic = "force-static";

export function GET() {
  return renderOg({
    eyebrow: "ritwickverma.dev/notes",
    name: hero.name,
    line: "Notes",
    lineTwo: "How specific things were built, with the numbers left in.",
  });
}
