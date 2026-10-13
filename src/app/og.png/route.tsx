import { hero } from "@/lib/data";
import { renderOg } from "@/lib/og";

// A route handler (not the opengraph-image convention) so the static export
// emits a real `og.png` — a file extension means any static host serves it
// as image/png, even under `X-Content-Type-Options: nosniff`.
export const dynamic = "force-static";

export function GET() {
  return renderOg({
    eyebrow: "ritwickverma.dev",
    name: hero.name,
    line: hero.line,
    lineTwo: hero.lineTwo,
  });
}
