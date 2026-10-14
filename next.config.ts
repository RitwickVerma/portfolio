import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  output: "export",
  // /resume/index.html — works on any static host, not only nginx try_files.
  trailingSlash: true,
  // Notes are MDX under src/content; the extension list lets the loader see them.
  pageExtensions: ["ts", "tsx", "md", "mdx"],
};

// Plugins are named as strings: Turbopack cannot take JS functions.
const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-gfm"],
  },
});

export default withMDX(nextConfig);
