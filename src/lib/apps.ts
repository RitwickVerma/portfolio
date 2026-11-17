// Public Android apps: one showcase page at /apps/<slug>/. The route sits outside the (site)
// group (same reason /resume does) and wears the app's own design system,
// taken from the app's real source, not the portfolio's. Shared facts live
// here; each landing page body is its own component under
// src/components/apps/ because the two apps share nothing visually. Each app's
// privacy policy lives on that app's own site, built and deployed by its repository
// (privacyUrl); nothing an app needs to work or ship lives on this portfolio, which only links out.
// Old /apps/<slug>/privacy-policy/ addresses redirect there (public/_redirects).

/**
 * The app's colours as CSS custom properties (`--<key>`). The privacy page
 * and the shared chrome read only the core keys; each landing page may use
 * the extras its own design system defines.
 */
export type Palette = {
  bg: string;
  surface: string;
  surfaceHi: string;
  outline: string;
  fg: string;
  muted: string;
  accent: string;
  onAccent: string;
  /** Tinted fill behind accent-coloured content (chips, icon wells). */
  accentSoft: string;
  onAccentSoft: string;
  [extra: string]: string;
};

export type PublicApp = {
  slug: string;
  name: string;
  /** One line: meta description and share text. */
  tagline: string;
  packageId: string;
  license: string;
  repoUrl: string;
  releasesUrl: string;
  issuesUrl: string;
  /** null until the app is live on Google Play: no button, never a dead link. */
  playUrl: string | null;
  /** Path under /public. */
  iconSrc: string;
  /** Optional layer under iconSrc (adaptive-icon background), stacked in the badge. */
  iconBackdropSrc?: string;
  /** Behind the backdrop layer; the legacy icon blue, used only for the badge. */
  iconBadgeBg?: string;
  /** The Play feature graphic, reused as the share card. */
  ogImage: { src: string; width: number; height: number; alt: string };
  scheme: "dark" | "light";
  palette: Palette;
  /** Corner radius of cards and of buttons in the app's own UI. */
  shape: { card: string; button: string; icon: string };
  /** The privacy policy on the app's own site, owned and deployed by its repository. */
  privacyUrl: string;
};

/** Where an app's privacy policy lives: always the app's own site. */
export function privacyHref(app: PublicApp): string {
  return app.privacyUrl;
}

export const apps: Record<string, PublicApp> = {
  shutup: {
    slug: "shutup",
    name: "ShutUp!",
    tagline: "Control phone calls without touching the screen. Wave to silence, flip to end, and calls that place themselves.",
    packageId: "com.laughingstock.ritwick.shutup",
    license: "GPLv3",
    repoUrl: "https://gitlab.com/ritwick7/shutup",
    releasesUrl: "https://gitlab.com/ritwick7/shutup/-/releases",
    issuesUrl: "https://gitlab.com/ritwick7/shutup/-/issues",
    playUrl: "https://play.google.com/store/apps/details?id=com.laughingstock.ritwick.shutup",
    iconSrc: "/apps/shutup/icon-fg.png",
    iconBackdropSrc: "/apps/shutup/icon-bg.png",
    iconBadgeBg: "#6699ED",
    ogImage: {
      src: "/apps/shutup/og.png",
      width: 1024,
      height: 500,
      alt: "ShutUp! on three phones: the gesture playground with the phone mascot, an incoming call with the watcher listening for a wave, and scheduled calls in dark theme",
    },
    scheme: "light",
    // Material 3, fidelity from the launcher icon's cornflower #6699ED, light scheme
    // (ui/theme/Color.kt, ShutUpLightColors; ShutUp! 2.2).
    palette: {
      bg: "#F9F9FF",
      surface: "#EDEDF5", // surfaceContainer
      surfaceHi: "#E1E2E9", // surfaceContainerHighest
      surfaceLow: "#F3F3FA", // surfaceContainerLow
      surfaceLowest: "#FFFFFF",
      outline: "#C2C6D3", // outlineVariant
      outlineStrong: "#737783",
      fg: "#191C21",
      muted: "#424751",
      accent: "#215DAD",
      onAccent: "#FFFFFF",
      accentSoft: "#D6E3FF", // primaryFixed: a light tint (the icon blue is `brand`; as a panel colour it fails 80 % text)
      onAccentSoft: "#00458D", // onPrimaryFixedVariant, 7.3:1
      secondarySoft: "#C9DAFF", // secondaryContainer
      onSecondarySoft: "#354766", // onSecondaryFixedVariant, 6.9:1 (the scheme's onSecondaryContainer is 4.6:1)
      tertiarySoft: "#FFDCC1", // tertiaryFixed (the container is a saturated amber, too loud for page chips)
      onTertiarySoft: "#6C3A00",
      inverse: "#2E3036",
      onInverse: "#F0F0F8",
      inversePrimary: "#AAC7FF",
      brand: "#6699ED", // launcher icon blue
    },
    shape: { card: "28px", button: "9999px", icon: "26%" },
    // ShutUp!'s policy lives on its own site, built from docs/PRIVACY_POLICY.md and deployed by its repository.
    privacyUrl: "https://shutup.ritwickverma.dev/privacy-policy/",
  },
  sudostamp: {
    slug: "sudostamp",
    name: "SudoStamp",
    tagline: "Approve sudo on your Linux computer by touching your Android phone's fingerprint sensor. No password typed, nothing in the cloud.",
    packageId: "com.ritwick.sudostamp",
    license: "MIT",
    repoUrl: "https://gitlab.com/ritwick7/sudostamp",
    releasesUrl: "https://gitlab.com/ritwick7/sudostamp/-/releases",
    issuesUrl: "https://gitlab.com/ritwick7/sudostamp/-/issues",
    playUrl: "https://play.google.com/store/apps/details?id=com.ritwick.sudostamp",
    iconSrc: "/apps/sudostamp/icon.png",
    ogImage: {
      src: "/apps/sudostamp/og.png",
      width: 1024,
      height: 500,
      alt: "SudoStamp: a terminal running sudo next to a phone asking Approve sudo? and then showing Approved",
    },
    scheme: "dark",
    // The app's one dark scheme (Ui.kt). Green is the only accent; amber and
    // red carry meaning (warnings, Deny) and nothing else.
    palette: {
      bg: "#0B0D12",
      surface: "#141821",
      surfaceHi: "#1C2230",
      outline: "#252C3B",
      fg: "#E7EDF7",
      muted: "#8A97AD",
      faint: "#5B6577",
      accent: "#4ADE80",
      onAccent: "#06210F",
      accentSoft: "rgba(74,222,128,0.15)",
      onAccentSoft: "#4ADE80",
      warn: "#FBBF24",
      warnSoft: "rgba(251,191,36,0.15)",
      danger: "#F87171",
      dangerSoft: "rgba(248,113,113,0.15)",
    },
    shape: { card: "20px", button: "14px", icon: "22%" },
    // Its own site, deployed from the sudostamp repository (site/), renders docs/PRIVACY_POLICY.md.
    privacyUrl: "https://sudostamp.ritwickverma.dev/privacy-policy/",
  },
};

export function appSlugs(): string[] {
  return Object.keys(apps);
}

/** `--bg`, `--accent`, ... plus the shape tokens, set on the page's root wrapper. */
export function appCssVars(app: PublicApp): Record<`--${string}`, string> {
  const vars: Record<`--${string}`, string> = {};
  for (const [k, v] of Object.entries(app.palette)) {
    vars[`--${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`] = v;
  }
  vars["--r-card"] = app.shape.card;
  vars["--r-button"] = app.shape.button;
  vars["--r-icon"] = app.shape.icon;
  return vars;
}

/**
 * Unlayered, so it beats globals.css: the page canvas (overscroll shows it),
 * the text selection, the focus ring and the scrollbar all take the app's
 * colours, not the portfolio's amber.
 */
export function appBaseCss(app: PublicApp): string {
  const p = app.palette;
  return [
    `html,body{background:${p.bg};color-scheme:${app.scheme}}`,
    `html{scrollbar-color:${p.outline} ${p.bg};scroll-behavior:smooth}`,
    `@media (prefers-reduced-motion: reduce){html{scroll-behavior:auto}}`,
    `.app-root ::selection{background:${p.accent};color:${p.onAccent}}`,
    `.app-root :focus-visible{outline:2px solid ${p.accent};outline-offset:3px}`,
  ].join("");
}
