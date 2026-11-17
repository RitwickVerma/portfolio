import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { apps, appSlugs, appCssVars, privacyHref } from "./apps";
import { LANDINGS } from "@/components/apps/landings";

describe("public app pages", () => {
  it("gives every app a landing body, and nothing else", () => {
    expect(Object.keys(LANDINGS).sort()).toEqual(appSlugs().sort());
  });

  it("defines the core palette keys the shared chrome and privacy page read", () => {
    const core = ["bg", "surface", "surfaceHi", "outline", "fg", "muted", "accent", "onAccent", "accentSoft", "onAccentSoft"];
    for (const app of Object.values(apps)) {
      for (const k of core) expect(app.palette[k], `${app.slug}.${k}`).toBeTruthy();
      const vars = appCssVars(app);
      expect(vars["--on-accent"]).toBe(app.palette.onAccent);
      expect(vars["--r-card"]).toBe(app.shape.card);
    }
  });

  it("links Google Play only for apps that are live there", () => {
    expect(apps.shutup.playUrl).toMatch(/^https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.laughingstock\.ritwick\.shutup$/);
    expect(apps.sudostamp.playUrl).toBe("https://play.google.com/store/apps/details?id=com.ritwick.sudostamp");
  });

  it("links every app to the policy on its own site, and redirects each old address there", () => {
    // Each policy is owned and deployed by the app's own repository: nothing of an app depends on
    // this portfolio, which only links out.
    const redirects = readFileSync(join(process.cwd(), "public", "_redirects"), "utf8");
    for (const slug of appSlugs()) {
      const own = `https://${slug}.ritwickverma.dev/privacy-policy/`;
      expect(privacyHref(apps[slug])).toBe(own);
      for (const from of [`/apps/${slug}/privacy-policy/`, `/apps/${slug}/privacy-policy`]) {
        expect(redirects).toMatch(new RegExp(`^${from.replace(/\//g, "\\/")} ${own.replace(/[./]/g, "\\$&")} 301$`, "m"));
      }
    }
  });

  it("keeps each app's own license", () => {
    expect(apps.sudostamp.license).toBe("MIT");
    expect(apps.shutup.license).toBe("GPLv3");
  });
});
