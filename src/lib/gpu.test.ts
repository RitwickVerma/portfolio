import { describe, expect, it } from "vitest";
import { hasCoarsePointer, hasWebGL2, prefersReducedMotion } from "./gpu";

// jsdom has neither a WebGL2 context nor matchMedia: both probes must say
// "no" quietly rather than throw, because the poster is the fallback.
describe("hero capability probes", () => {
  it("report no WebGL2 where a context cannot be created", () => {
    expect(hasWebGL2()).toBe(false);
  });

  it("report a fine pointer where matchMedia is missing, so desktops keep full resolution", () => {
    expect(hasCoarsePointer()).toBe(false);
  });

  it("report no reduced-motion preference where matchMedia is missing", () => {
    expect(prefersReducedMotion()).toBe(false);
  });
});
