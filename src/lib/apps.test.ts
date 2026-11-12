import { describe, it, expect } from "vitest";
import { apps, appSlugs, appCssVars } from "./apps";
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

  it("keeps each app's own license", () => {
    expect(apps.sudostamp.license).toBe("MIT");
    expect(apps.shutup.license).toBe("GPLv3");
  });
});
