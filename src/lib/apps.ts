// Public Android apps: one landing page at /apps/<slug>/ and one privacy
// policy at /apps/<slug>/privacy-policy/. Both routes sit outside the (site)
// group (same reason /resume does) and wear the app's own palette, taken from
// the app's real source. Adding an app is one entry here; the routes are
// generic. The policy text is the source of truth in each app's repository
// (docs/PRIVACY_POLICY.md); the Play Console points at the nested URL.

export type AppTheme = {
  bg: string;
  fg: string;
  muted: string;
  accent: string;
  accentFg: string;
  border: string;
  /** Optional tonal surface (icon badge, quiet fills). Falls back to bg. */
  surface?: string;
  scheme: "dark" | "light";
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
  /** One line. */
  tagline: string;
  packageId: string;
  license: string;
  repoUrl: string;
  /** null until the app is live on Google Play: no button, never a dead link. */
  playUrl: string | null;
  /** Path under /public. */
  iconSrc: string;
  /** Optional layer under iconSrc (adaptive-icon background), stacked in the page. */
  iconBackdropSrc?: string;
  /** Behind the backdrop layer; the legacy icon blue, used only for the badge. */
  iconBadgeBg?: string;
  theme: AppTheme;
  /** Type and geometry the app's own UI uses. */
  look: "terminal" | "material";
  /** 3-5 short bullets of what it does, from the app's README. */
  highlights: string[];
  /** One honest caveat from the README, shown quietly under the highlights. */
  caveat?: string;
  privacyPolicy: PrivacyPolicy;
};

export const apps: Record<string, PublicApp> = {
  shutup: {
    slug: "shutup",
    name: "ShutUp!",
    tagline: "Control phone calls without touching the screen.",
    packageId: "com.laughingstock.ritwick.shutup",
    license: "GPLv3",
    repoUrl: "https://gitlab.com/ritwick7/shutup",
    playUrl: "https://play.google.com/store/apps/details?id=com.laughingstock.ritwick.shutup",
    iconSrc: "/apps/shutup/icon-fg.png",
    iconBackdropSrc: "/apps/shutup/icon-bg.png",
    iconBadgeBg: "#5D9CEC",
    // Material 3, tonal spot from seed #2C3E50, light scheme.
    theme: {
      bg: "#F7F9FF",
      fg: "#181C20",
      muted: "#42474E",
      accent: "#30628C",
      accentFg: "#FFFFFF",
      border: "#C2C7CF",
      surface: "#ECEEF4",
      scheme: "light",
    },
    look: "material",
    highlights: [
      "Wave over the phone to silence it. Wave twice to answer or end a ringing call.",
      "Pick it up from a flat surface to hush it. Put it face down, or fold it shut, to hang up.",
      "Scheduled calls: it buzzes, says the name out loud and dials on the minute, on the SIM you pick.",
      "A gesture playground to rehearse every gesture and tune the double-wave window to your pace.",
      "Nothing leaves the phone: no analytics, no crash reporters, no ads and no network use.",
    ],
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
    tagline: "Approve sudo on your Linux computer with your phone's fingerprint sensor.",
    packageId: "com.ritwick.sudostamp",
    license: "MIT",
    repoUrl: "https://gitlab.com/ritwick7/sudostamp",
    playUrl: null,
    iconSrc: "/apps/sudostamp/icon.png",
    // The app's single dark scheme. Green is the only accent.
    theme: {
      bg: "#0B0D12",
      fg: "#E6E8EE",
      muted: "#8B93A7",
      accent: "#4ADE80",
      accentFg: "#0B0D12",
      border: "rgba(74,222,128,0.22)",
      scheme: "dark",
    },
    look: "terminal",
    highlights: [
      "Type sudo, your phone buzzes, you touch the sensor and the command runs. No password typed.",
      "The phone answers over your local network. Nothing goes through the cloud.",
      "The fingerprint is enforced by the phone's secure hardware, and the signing key cannot be exported.",
      "One key per computer, made inside the phone's secure hardware when you pair.",
      "If anything goes wrong (phone off, out of range, you tap Deny or 60 seconds pass), sudo falls back to your ordinary password prompt.",
    ],
    caveat:
      "Review status: written with an AI assistant and put through an AI-run security audit. No human security professional has reviewed it yet. It sits in front of sudo, so read the security notes in the repository before you rely on it.",
    privacyPolicy: {
      effectiveDate: "24 October 2026 (applies to SudoStamp 1.4 and later)",
      summary:
        "SudoStamp does not collect, send or share any personal data. It has no accounts, no ads, no analytics, no crash reporting and no internet connection of its own. It talks only to the computers you pair it with, on your own local network.",
      dataTable: [
        {
          what: "Your fingerprint",
          why: "Android's biometric prompt confirms it is you before each approval.",
          whereItGoes:
            "Never seen by the app: Android checks the fingerprint in its secure hardware and only tells the app \u201cyes\u201d or \u201cno\u201d.",
        },
        {
          what: "Signing keys",
          why: "One per paired computer, made inside the phone's secure hardware (Android Keystore).",
          whereItGoes: "Never leave the phone; cannot be exported, even by the app.",
        },
        {
          what: "Paired computers",
          why:
            "The name each computer gave when pairing, when it was paired, and the address it paired from, so approvals can say which computer is asking.",
          whereItGoes:
            "Stored in the app's private storage on the phone; deleted when you remove that computer or uninstall the app. Excluded from Android backup and device transfer.",
        },
        {
          what: "Requests from your computers",
          why:
            "A computer you paired sends a random 32-byte challenge; the phone signs it after your fingerprint and sends the signature back to that computer.",
          whereItGoes: "Over your local network only, directly between the phone and that computer. Nothing is stored.",
        },
        {
          what: "Local network",
          why:
            "The app listens on TCP port 7777 for paired computers, and serves only devices on the same Wi-Fi or Ethernet network. While you pair a computer it announces itself on that network (mDNS) so the computer can find it.",
          whereItGoes: "Nothing goes to the internet.",
        },
        {
          what: "Notifications",
          why: "Shows \u201cApprove sudo?\u201d for each request, and an ongoing notice while the listener runs (Android requires it).",
          whereItGoes: "\u2014",
        },
      ],
      sections: [
        {
          heading: "What the app does not do",
          body:
            "No data is sold, shared, or sent to the developer or any third party. There are no third-party libraries in the app at all. The app does not access contacts, location, files, the camera, the microphone or your accounts.",
        },
        {
          heading: "Children",
          body: "SudoStamp is a tool for computer administrators and is not directed at children.",
        },
        {
          heading: "Changes",
          body:
            "Changes to this policy are made in the source-of-truth file in the public repository, with the effective date above updated; the history is visible in the repository.",
        },
      ],
      contactEmail: "verma1997@gmail.com",
    },
  },
};

export function appSlugs(): string[] {
  return Object.keys(apps);
}

/**
 * The app's palette and type as CSS custom properties, set on the page's root
 * wrapper. Everything below it styles off var(--app-*), so the two apps share
 * markup and share nothing visually.
 */
export function appCssVars(app: PublicApp): Record<`--app-${string}`, string> {
  const t = app.theme;
  const terminal = app.look === "terminal";
  return {
    "--app-bg": t.bg,
    "--app-fg": t.fg,
    "--app-muted": t.muted,
    "--app-accent": t.accent,
    "--app-accent-fg": t.accentFg,
    "--app-border": t.border,
    "--app-surface": t.surface ?? t.bg,
    "--app-font": terminal ? "var(--font-geist-mono), ui-monospace, monospace" : "var(--font-geist-sans), system-ui, sans-serif",
    "--app-radius": terminal ? "2px" : "9999px",
    "--app-icon-radius": terminal ? "22%" : "26%",
  };
}

/**
 * Unlayered, so it can beat globals.css: the page canvas (overscroll shows it),
 * the focus ring and the scrollbar all take the app's colours, not amber.
 */
export function appBaseCss(app: PublicApp): string {
  const t = app.theme;
  return `html,body{background:${t.bg}}html{scrollbar-color:${t.muted} transparent}.app-root *:focus-visible{outline-color:${t.accent}}`;
}
