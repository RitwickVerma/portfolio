// Public Android apps: one landing page at /apps/<slug>/ and one privacy
// policy at /apps/<slug>/privacy-policy/. Both routes sit outside the (site)
// group (same reason /resume does) and wear the app's own design system,
// taken from the app's real source, not the portfolio's. Shared facts live
// here; each landing page body is its own component under
// src/components/apps/ because the two apps share nothing visually. The
// policy text is the source of truth in each app's repository
// (docs/PRIVACY_POLICY.md); the Play Console points at the nested URL.

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

export type PrivacyPolicy = {
  effectiveDate: string; // human-readable, matches the source-of-truth doc
  /** Short lead-in shown under the title, one or two sentences. */
  summary: string;
  /** Row-per-concern table: what the app handles, why, where it goes. */
  dataTable: { what: string; why: string; whereItGoes: string }[];
  /** Plain-prose sections after the table, in order. */
  sections: { heading: string; body: string }[];
  contactEmail: string;
  /** Extra contact route named by the source policy, when it names one. */
  issuesUrl?: string;
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
  /**
   * The policy, rendered here at /apps/<slug>/privacy-policy/. An app with its own site keeps its
   * policy there instead (privacyUrl), owned by its repository: nothing of the app depends on this
   * portfolio, which only links to it.
   */
  privacyPolicy?: PrivacyPolicy;
  privacyUrl?: string;
};

/** Where an app's privacy policy lives: its own site's, or the page under /apps/<slug>/. */
export function privacyHref(app: PublicApp): string {
  return app.privacyUrl ?? `/apps/${app.slug}/privacy-policy/`;
}

/** The apps whose policy this site renders. */
export function policySlugs(): string[] {
  return appSlugs().filter((slug) => apps[slug].privacyPolicy !== undefined);
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
    privacyPolicy: {
      effectiveDate: "15 October 2026 (applies to ShutUp! 2.0 and later)",
      summary:
        "ShutUp! does not collect, store off-device, or share any personal data. Everything it needs stays on your phone. There are no ads, no analytics, no crash-reporting services and no network requests.",
      dataTable: [
        {
          what: "Phone state (READ_PHONE_STATE)",
          why: "To know when a call is ringing, active or ended, so gestures work only during calls.",
          whereItGoes: "Stays on the device; never stored.",
        },
        {
          what: "Answer / end calls (ANSWER_PHONE_CALLS)",
          why: "To answer or end a call when you wave or flip the phone.",
          whereItGoes: "Nothing is recorded.",
        },
        {
          what: "Place calls (CALL_PHONE)",
          why: "To dial a call you scheduled, at the time you chose.",
          whereItGoes: "Only the number you entered is stored, on the device.",
        },
        {
          what: "Phone number picker",
          why: "When you schedule a call you may pick a number with the system picker. ShutUp! receives that one name and number only; it has no contacts permission and cannot read your address book.",
          whereItGoes:
            "Stored on the device in your schedule list; deleted when you delete the schedule.",
        },
        {
          what: "Proximity and accelerometer sensors",
          why: "To detect waves, pick-ups and face-down only while a call is ringing or active.",
          whereItGoes: "Processed in memory; never stored.",
        },
        {
          what: "Do Not Disturb access (optional)",
          why: "To fully silence the ringer. Without it the app switches to vibrate instead.",
          whereItGoes: "\u2014",
        },
        {
          what: "Alarms & reminders (optional)",
          why: "To place scheduled calls at the exact minute.",
          whereItGoes: "\u2014",
        },
        {
          what: "Notifications",
          why: "An ongoing, silent notification while the master switch is on (required by Android for the call watcher), countdown and missed-call notifications for scheduled calls.",
          whereItGoes: "\u2014",
        },
      ],
      sections: [
        {
          heading: "Backups",
          body: "Your settings and scheduled calls are stored in the app's private storage and may be included in Android's device backup if you have backup enabled on your phone; that backup is handled by Google under Google's privacy policy, not by ShutUp!.",
        },
        {
          heading: "Children",
          body: "ShutUp! is a utility for people who make phone calls and is not directed at children under 13.",
        },
        {
          heading: "Changes",
          body: "Changes to this policy are published at the URL shown in the Play listing and inside the app (About \u2192 Privacy policy), with a new effective date.",
        },
      ],
      contactEmail: "verma1997@gmail.com",
      issuesUrl: "https://gitlab.com/ritwick7/shutup/-/issues",
    },
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
