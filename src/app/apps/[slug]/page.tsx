import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { apps, appSlugs, appCssVars, appBaseCss } from "@/lib/apps";
import { LANDINGS } from "@/components/apps/landings";

// Standalone landing page for a public Android app. Sits outside the (site)
// group on purpose (same reason /resume does): no shared Nav, Footer or
// backdrop, because the page wears the app's own design system instead of
// the portfolio's. Indexable; the privacy policy under it is not.
//
// Adding an app: one entry in src/lib/apps.ts and one landing component in
// src/components/apps/landings.ts.

export async function generateStaticParams() {
  return appSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const app = apps[slug];
  if (!app) return {};
  const title = `${app.name} · Ritwick Verma`;
  const images = [{ url: app.ogImage.src, width: app.ogImage.width, height: app.ogImage.height, alt: app.ogImage.alt }];
  return {
    title: app.name,
    description: app.tagline,
    alternates: { canonical: `/apps/${slug}/` },
    openGraph: {
      title,
      description: app.tagline,
      url: `/apps/${slug}/`,
      siteName: "ritwickverma.dev",
      type: "website",
      locale: "en_US",
      images,
    },
    twitter: { card: "summary_large_image", title, description: app.tagline, images },
    // The page is already in the app's own scheme; keep Dark Reader from
    // repainting a light Material page dark.
    other: { "darkreader-lock": "true" },
  };
}

export async function generateViewport({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Viewport> {
  const { slug } = await params;
  const app = apps[slug];
  if (!app) return {};
  return { themeColor: app.palette.bg, colorScheme: app.scheme };
}

export default async function AppPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const app = apps[slug];
  const Landing = LANDINGS[slug];
  if (!app || !Landing) notFound();

  return (
    <div
      className="app-root min-h-screen bg-[var(--bg)] text-[var(--fg)] antialiased"
      style={appCssVars(app) as CSSProperties}
    >
      <style>{appBaseCss(app)}</style>
      <Landing app={app} />
    </div>
  );
}

export const dynamicParams = false;
