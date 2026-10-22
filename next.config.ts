import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  output: "export",
  // /resume/index.html — works on any static host, not only nginx try_files.
  trailingSlash: true,
  // Notes are MDX under src/content; the extension list lets the loader see them.
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  // The day this export was built, inlined into server and client alike so a
  // date-dependent string (see EBAY_SEPARATION in lib/data.ts) can never
  // disagree between the HTML and the hydrating script.
  env: { NEXT_PUBLIC_BUILD_DATE: new Date().toISOString().slice(0, 10) },
};

// Plugins are named as strings: Turbopack cannot take JS functions.
const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-gfm"],
  },
});

export default withMDX(nextConfig);
