import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // /resume/index.html — works on any static host, not only nginx try_files.
  trailingSlash: true,
};

export default nextConfig;
