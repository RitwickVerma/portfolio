import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import AppIcon from "@/components/AppIcon";
import { apps, appSlugs, appCssVars, appBaseCss } from "@/lib/apps";

// Standalone landing page for a public Android app. Sits outside the (site)
// group on purpose (same reason /resume does): no shared Nav, Footer or
// backdrop, because the page wears the app's own palette instead of the
// portfolio's. Indexable; the privacy policy under it is not.
//
// Adding an app: one entry in src/lib/apps.ts. Nothing here changes.
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
  return {
    title: app.name,
    description: app.tagline,
    alternates: { canonical: `/apps/${slug}/` },
    openGraph: {
      title: `${app.name} · Ritwick Verma`,
      description: app.tagline,
      url: `/apps/${slug}/`,
      siteName: "ritwickverma.dev",
      type: "website",
      locale: "en_US",
    },
    twitter: { card: "summary", title: `${app.name} · Ritwick Verma`, description: app.tagline },
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
  return { themeColor: app.theme.bg, colorScheme: app.theme.scheme };
}

const BUTTON =
  "inline-flex items-center min-h-11 px-5 text-sm font-medium border rounded-[var(--app-radius)] transition-colors";
const PRIMARY = `${BUTTON} bg-[var(--app-accent)] text-[var(--app-accent-fg)] border-[var(--app-accent)] hover:opacity-90`;
const SECONDARY = `${BUTTON} text-[var(--app-fg)] border-[var(--app-border)] hover:border-[var(--app-accent)]`;

export default async function AppPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const app = apps[slug];
  if (!app) notFound();

  const terminal = app.look === "terminal";
  const actions: { href: string; label: string; external: boolean }[] = [
    ...(app.playUrl ? [{ href: app.playUrl, label: "Get it on Google Play", external: true }] : []),
    { href: app.repoUrl, label: "Source on GitLab", external: true },
    { href: `/apps/${app.slug}/privacy-policy/`, label: "Privacy policy", external: false },
  ];

  return (
    <div
      className="app-root min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)] font-[family-name:var(--app-font)] selection:bg-[var(--app-accent)] selection:text-[var(--app-accent-fg)]"
      style={appCssVars(app) as CSSProperties}
    >
      <style>{appBaseCss(app)}</style>

      <nav aria-label="Back" className="border-b border-[var(--app-border)]">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center">
          <Link
            href="/"
            className="font-mono text-sm text-[var(--app-muted)] py-3 hover:text-[var(--app-fg)] hover:underline underline-offset-4"
          >
            ← ritwickverma.dev
          </Link>
        </div>
      </nav>

      <main id="main" tabIndex={-1} className="focus:outline-none max-w-3xl mx-auto px-6 py-12 sm:py-20">
        <header className={terminal ? "flex items-center gap-5" : "flex flex-col items-start gap-6"}>
          <AppIcon app={app} size={terminal ? 72 : 96} />
          <div>
            <h1
              className={
                terminal
                  ? "text-3xl sm:text-4xl font-semibold tracking-tight"
                  : "text-4xl sm:text-5xl font-medium tracking-tight"
              }
            >
              {terminal ? (
                <span aria-hidden="true" className="text-[var(--app-accent)]">
                  ${" "}
                </span>
              ) : null}
              {app.name}
            </h1>
            <p
              className={
                terminal
                  ? "mt-2 text-sm sm:text-base text-[var(--app-muted)] max-w-xl"
                  : "mt-3 text-lg sm:text-xl text-[var(--app-muted)] max-w-xl"
              }
            >
              {app.tagline}
            </p>
          </div>
        </header>

        <section className="mt-12 sm:mt-16" aria-labelledby="what-it-does">
          <h2
            id="what-it-does"
            className="font-mono text-[var(--app-muted)] text-sm tracking-widest uppercase pb-2 mb-4 border-b border-[var(--app-border)]"
          >
            What it does
          </h2>
          <ul className={terminal ? "space-y-3" : "divide-y divide-[var(--app-border)]"}>
            {app.highlights.map((h) => (
              <li
                key={h}
                className={
                  terminal
                    ? "flex gap-3 text-sm leading-relaxed text-[var(--app-fg)]/90"
                    : "py-4 text-base leading-relaxed first:pt-0"
                }
              >
                {terminal ? (
                  <span aria-hidden="true" className="select-none text-[var(--app-accent)]">
                    $
                  </span>
                ) : null}
                <span>{h}</span>
              </li>
            ))}
          </ul>
          {app.caveat ? (
            <p className="mt-8 border-l border-[var(--app-accent)] pl-4 font-mono text-[0.8125rem] leading-relaxed text-[var(--app-fg)]/80 max-w-xl">{app.caveat}</p>
          ) : null}
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          {actions.map((a, i) => (
            <a
              key={a.href}
              href={a.href}
              className={i === 0 ? PRIMARY : SECONDARY}
              {...(a.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {a.label}
            </a>
          ))}
        </div>

        <dl className="mt-12 pt-4 border-t border-[var(--app-border)] flex flex-wrap gap-x-8 gap-y-1 font-mono text-xs text-[var(--app-muted)]">
          <div>
            <dt className="inline">Package </dt>
            <dd className="inline text-[var(--app-fg)]/80">{app.packageId}</dd>
          </div>
          <div>
            <dt className="inline">License </dt>
            <dd className="inline text-[var(--app-fg)]/80">{app.license}</dd>
          </div>
        </dl>
      </main>
    </div>
  );
}

export const dynamicParams = false;
