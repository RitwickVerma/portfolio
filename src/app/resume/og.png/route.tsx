import { renderOg } from "@/lib/og";

export const dynamic = "force-static";

export function GET() {
  return renderOg({
    sheet: "RESUME",
    title: "Ritwick Verma —",
    emphasis: "backend engineer at eBay.",
    footer: "UC Irvine MCS · San Francisco",
  });
}
