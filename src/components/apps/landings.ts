import type { ComponentType } from "react";
import type { PublicApp } from "@/lib/apps";
import ShutUpLanding from "./ShutUpLanding";
import SudoStampLanding from "./SudoStampLanding";

// One landing body per public app, keyed like src/lib/apps.ts. The apps share
// facts and chrome, not design, so each body is its own component.
export const LANDINGS: Record<string, ComponentType<{ app: PublicApp }>> = {
  shutup: ShutUpLanding,
  sudostamp: SudoStampLanding,
};
