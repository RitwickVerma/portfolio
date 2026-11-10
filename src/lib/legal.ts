// Privacy-policy pages for apps that need a public URL (Play Console, App Store
// Connect, OAuth consent screens) but must never appear in the site's own nav,
// footer or sitemap — see src/app/legal/[project]/privacy-policy/page.tsx.
// Adding a new project is one entry here; the route is generic.

export type LegalProject = {
  slug: string;
  appName: string;
  packageOrBundleId: string;
  effectiveDate: string; // human-readable, matches the source-of-truth doc
  repoUrl: string;
  contactEmail: string;
  /** Short lead-in shown under the title, one or two sentences. */
  summary: string;
  /** Row-per-concern table: what the app handles, why, where it goes. */
  dataTable: { what: string; why: string; whereItGoes: string }[];
  /** Plain-prose sections after the table, in order. */
  sections: { heading: string; body: string }[];
};

export const legalProjects: Record<string, LegalProject> = {
  sudostamp: {
    slug: "sudostamp",
    appName: "SudoStamp",
    packageOrBundleId: "com.ritwick.sudostamp",
    effectiveDate: "24 October 2026 (applies to SudoStamp 1.4 and later)",
    repoUrl: "https://gitlab.com/ritwick7/sudostamp",
    contactEmail: "verma1997@gmail.com",
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
  },
};

export function legalSlugs(): string[] {
  return Object.keys(legalProjects);
}
