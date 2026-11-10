import { renderOg } from "@/lib/og";
import { OG_CARDS } from "@/lib/seo";

// Social card for /design/. The words live in lib/seo so the page's image alt reads the same strings.
export const dynamic = "force-static";

export function GET() {
  return renderOg(OG_CARDS.design);
}
