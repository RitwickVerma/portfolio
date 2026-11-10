import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { apps, appSlugs, appCssVars, appBaseCss } from "@/lib/apps";
import { AppHeader, AppFooter } from "@/components/apps/AppChrome";

// The privacy policy Google Play (and any other store) points at. Same
// standalone, per-app-themed document as the landing page above it, but
// noindex: it is a reference for a store listing, not something to rank.
// Policy text lives in src/lib/apps.ts, copied from each repo's own
// docs/PRIVACY_POLICY.md.
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
    title: `Privacy Policy \u00b7 ${app.name}`,
    description: app.privacyPolicy.summary,
    alternates: { canonical: `/apps/${slug}/privacy-policy/` },
    robots: { index: false, follow: false },
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

const LINK = "text-[var(--accent)] underline decoration-[var(--accent)]/40 underline-offset-4 hover:decoration-[var(--accent)]";
const H2 = "text-xl font-semibold tracking-tight text-[var(--fg)]";

export default async function PrivacyPolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const app = apps[slug];
  if (!app) notFound();
  const pp = app.privacyPolicy;
  const toc = [
    { id: "summary", label: "The short version" },
    { id: "data", label: "What the app handles" },
    ...pp.sections.map((s) => ({ id: s.heading.toLowerCase().replace(/[^a-z]+/g, "-"), label: s.heading })),
    { id: "contact", label: "Contact" },
  ];

  return (
    <div
      className="app-root min-h-screen bg-[var(--bg)] text-[var(--fg)] antialiased"
      style={appCssVars(app) as CSSProperties}
    >
      <style>{appBaseCss(app)}</style>
      <AppHeader app={app} nav={[{ href: `/apps/${app.slug}/`, label: `About ${app.name}` }]} />

      <main id="main" tabIndex={-1} className="focus:outline-none">
        <div className="mx-auto max-w-6xl px-5 pb-24 pt-14 sm:px-8 sm:pt-20">
          <header className="max-w-3xl">
            <p className="text-sm font-medium text-[var(--accent)]">Privacy policy</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[var(--fg)] sm:text-5xl">
              {app.name} Privacy Policy
            </h1>
            <dl className="mt-6 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
              <dt className="text-[var(--muted)]">Effective date</dt>
              <dd className="text-[var(--fg)]">{pp.effectiveDate}</dd>
              <dt className="text-[var(--muted)]">App</dt>
              <dd className="font-mono text-[var(--fg)] [overflow-wrap:anywhere]">{app.packageId}</dd>
              <dt className="text-[var(--muted)]">Developer</dt>
              <dd className="text-[var(--fg)]">
                Ritwick Verma,{" "}
                <a href={`mailto:${pp.contactEmail}`} className={LINK}>
                  {pp.contactEmail}
                </a>
              </dd>
              <dt className="text-[var(--muted)]">Source</dt>
              <dd className="[overflow-wrap:anywhere]">
                <a href={app.repoUrl} className={LINK} target="_blank" rel="noopener noreferrer">
                  {app.repoUrl.replace("https://", "")}
                </a>{" "}
                <span className="text-[var(--muted)]">({app.license})</span>
              </dd>
            </dl>
          </header>

          <div className="mt-14 grid gap-12 lg:grid-cols-[13rem_1fr]">
            <nav aria-label="On this page" className="hidden lg:block">
              <ul className="sticky top-28 space-y-1 border-l border-[var(--outline)] text-sm">
                {toc.map((t) => (
                  <li key={t.id}>
                    <a
                      href={`#${t.id}`}
                      className="-ml-px block border-l border-transparent py-1 pl-4 text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--fg)]"
                    >
                      {t.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="min-w-0 max-w-3xl space-y-14 text-[15px] leading-relaxed text-[var(--muted)]">
              <section id="summary" className="scroll-mt-24">
                <div className="rounded-[var(--r-card)] border border-[var(--outline)] bg-[var(--surface)] p-6 sm:p-8">
                  <h2 className={H2}>The short version</h2>
                  <p className="mt-3 text-lg leading-relaxed text-[var(--fg)]">{pp.summary}</p>
                </div>
              </section>

              <section id="data" className="scroll-mt-24">
                <h2 className={H2}>What the app handles, and where it stays</h2>
                <div className="mt-5 overflow-hidden rounded-[var(--r-card)] border border-[var(--outline)]">
                <div
                  aria-hidden="true"
                  className="hidden gap-x-8 border-b border-[var(--outline)] bg-[var(--surface)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)] md:grid md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_minmax(0,1fr)]"
                >
                  <span>What</span>
                  <span>Why</span>
                  <span className="text-[var(--accent)]">Where it goes</span>
                </div>
                <ul>
                  {pp.dataTable.map((row) => (
                    <li
                      key={row.what}
                      className="grid gap-x-8 gap-y-3 border-b border-[var(--outline)] p-5 last:border-b-0 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_minmax(0,1fr)]"
                    >
                      <p className="font-medium text-[var(--fg)] [overflow-wrap:anywhere]">{row.what.replace(/_/g, "_\u200b")}</p>
                      <p>
                        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] md:hidden">
                          Why
                        </span>
                        {row.why}
                      </p>
                      <p>
                        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)] md:hidden">
                          Where it goes
                        </span>
                        <span className="text-[var(--fg)]">{row.whereItGoes}</span>
                      </p>
                    </li>
                  ))}
                </ul>
                </div>
              </section>

              {pp.sections.map((s) => (
                <section key={s.heading} id={s.heading.toLowerCase().replace(/[^a-z]+/g, "-")} className="scroll-mt-24">
                  <h2 className={H2}>{s.heading}</h2>
                  <p className="mt-3">{s.body}</p>
                </section>
              ))}

              <section id="contact" className="scroll-mt-24">
                <h2 className={H2}>Contact</h2>
                <p className="mt-3">
                  Questions:{" "}
                  <a href={`mailto:${pp.contactEmail}`} className={LINK}>
                    {pp.contactEmail}
                  </a>
                  {pp.issuesUrl ? (
                    <>
                      {" "}or open an issue at{" "}
                      <a href={pp.issuesUrl} className={`${LINK} break-all`} target="_blank" rel="noopener noreferrer">
                        {pp.issuesUrl.replace("https://", "")}
                      </a>
                    </>
                  ) : null}
                  .
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>

      <AppFooter app={app} />
    </div>
  );
}

export const dynamicParams = false;
