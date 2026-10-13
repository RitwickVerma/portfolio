import { hero } from "@/lib/data";
import { renderOg } from "@/lib/og";

export const dynamic = "force-static";

export function GET() {
  return renderOg({
    eyebrow: "ritwickverma.dev/resume",
    name: hero.name,
    line: "Resume",
    lineTwo: "Backend engineer at eBay.",
  });
}
