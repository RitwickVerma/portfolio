import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { SITE_URL } from "@/lib/data";
import { SITE_TITLE, SITE_DESCRIPTION, personJsonLd, jsonLdString } from "@/lib/seo";
import "./globals.css";

// Type system: Fraunces (optical-size serif) carries the voice, IBM Plex Sans the
// reading, IBM Plex Mono every label, figure number and table cell. next/font
// self-hosts all three at build time — the page makes no third-party requests.
const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
  style: ["normal", "italic"],
  display: "swap",
});

const sans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const OG_ALT = "Ritwick Verma — I build systems, then try to prove them wrong.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: "%s — Ritwick Verma" },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: "ritwickverma.dev",
    type: "website",
    locale: "en_US",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: OG_ALT }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: "/og.png", alt: OG_ALT }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2efe8" },
    { media: "(prefers-color-scheme: dark)", color: "#11110f" },
  ],
  colorScheme: "light dark",
};

// Both inline scripts below are compile-time constants (no user input reaches
// them): a one-word class toggle, and JSON-LD built from our own data with `<`
// escaped by jsonLdString. dangerouslySetInnerHTML is safe here.
const JS_FLAG = "document.documentElement.classList.add('js')";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <head>
        {/* Reveal styles are gated on this class: with no script, nothing is hidden. */}
        <script dangerouslySetInnerHTML={{ __html: JS_FLAG }} />
      </head>
      <body>
        <a href="#main" className="skip">
          Skip to content
        </a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdString(personJsonLd()) }}
        />
        {children}
      </body>
    </html>
  );
}
