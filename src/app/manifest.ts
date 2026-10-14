import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION } from "@/lib/seo";
import { BG } from "@/lib/theme";

// Emitted as /manifest.webmanifest at build. Gives Android and desktop Chrome
// a proper tile (name, theme, icons) for "add to home screen" and the tab
// strip; the icons live in public/icons so they ship as plain static files.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ritwick Verma",
    short_name: "ritwickverma",
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "browser",
    background_color: BG,
    theme_color: BG,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
