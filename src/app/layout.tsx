import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SITE_URL, hero } from "@/lib/data";
import { SITE_TITLE, SITE_DESCRIPTION, personJsonLd, jsonLdString } from "@/lib/seo";
import { LIGHT, DARK } from "@/lib/theme";
import "./globals.css";

const OG_ALT = `${hero.name}. ${hero.line} ${hero.lineTwo}`;

// Self-hosted variable fonts (OFL, licences beside the files). Archivo carries
// a width axis as well as weight; globals.css uses it as the type system.
const archivo = localFont({
  src: "../fonts/Archivo-latin-wdth-wght.woff2",
  variable: "--font-archivo",
  weight: "100 900",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
});

const martian = localFont({
  src: "../fonts/MartianMono-latin-wght.woff2",
  variable: "--font-martian",
  weight: "100 800",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: "%s · Ritwick Verma" },
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
    { media: "(prefers-color-scheme: light)", color: LIGHT.BG },
    { media: "(prefers-color-scheme: dark)", color: DARK.BG },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${martian.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-fg flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-background focus:text-accent focus:border focus:border-accent/40 focus:rounded"
        >
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
