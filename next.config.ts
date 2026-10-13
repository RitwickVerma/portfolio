import type { NextConfig } from "next";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Build receipt: facts about this exact build, baked in at build time and shown
// in the colophon. Every value is read from the build itself — nothing typed by hand.
// execFileSync with an argument array: no shell, and every argument is a constant.
function git(args: string[], fallback: string) {
  try {
    return execFileSync("git", args, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim() || fallback;
  } catch {
    return fallback;
  }
}
const pkg = JSON.parse(readFileSync("./package.json", "utf8")) as { dependencies?: Record<string, string> };

const nextConfig: NextConfig = {
  output: "export",
  // /resume/index.html — works on any static host, not only nginx try_files.
  trailingSlash: true,
  env: {
    BUILD_SHA: git(["rev-parse", "--short", "HEAD"], "local"),
    BUILD_DATE: new Date().toISOString().slice(0, 10),
    BUILD_COMMITS: git(["rev-list", "--count", "HEAD"], "0"),
    BUILD_DEPS: Object.keys(pkg.dependencies ?? {}).join(", "),
  },
};

export default nextConfig;
