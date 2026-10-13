import { renderOg } from "@/lib/og";

// A route handler (not the opengraph-image convention) so the static export
// emits a real `og.png` — a file extension means any static host serves it
// as image/png, even under `X-Content-Type-Options: nosniff`.
export const dynamic = "force-static";

export function GET() {
  return renderOg({
    sheet: "SHEET 00 · INDEX",
    title: "I build systems, then try to",
    emphasis: "prove them wrong.",
    footer: "Backend engineer · eBay · San Francisco",
  });
}
