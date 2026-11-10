import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import AppIcon from "@/components/AppIcon";
import { apps, appSlugs, appCssVars, appBaseCss } from "@/lib/apps";

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

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-[var(--app-muted)] text-sm tracking-widest uppercase pb-2 mb-3 border-b border-[var(--app-border)]">
      {children}
    </h2>
  );
}

const LINK = "text-[var(--app-accent)] underline underline-offset-4 decoration-[var(--app-accent)]/40 hover:decoration-[var(--app-accent)]";

export default async function PrivacyPolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const app = apps[slug];
  if (!app) notFound();
  const pp = app.privacyPolicy;
  const terminal = app.look === "terminal";

  return (
    <div
      className="app-root min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)] font-[family-name:var(--app-font)] selection:bg-[var(--app-accent)] selection:text-[var(--app-accent-fg)]"
      style={appCssVars(app) as CSSProperties}
    >
      <style>{appBaseCss(app)}</style>

      <nav aria-label="Back" className="border-b border-[var(--app-border)]">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center">
          <Link
            href={`/apps/${app.slug}/`}
            className="font-mono text-sm text-[var(--app-muted)] py-3 hover:text-[var(--app-fg)] hover:underline underline-offset-4"
          >
            ← {app.name}
          </Link>
        </div>
      </nav>

      <main
        id="main"
        tabIndex={-1}
        className="focus:outline-none max-w-3xl mx-auto px-6 py-12 text-[var(--app-fg)]/90"
      >
        <header className="flex items-start gap-4">
          <AppIcon app={app} size={48} />
          <div>
            <h1
              className={
                terminal
                  ? "text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--app-fg)]"
                  : "text-3xl font-medium tracking-tight text-[var(--app-fg)]"
              }
            >
              {app.name} Privacy Policy
            </h1>
            <dl className="mt-3 space-y-1 font-mono text-sm text-[var(--app-muted)] [overflow-wrap:anywhere]">
              <div>
                <dt className="inline">Effective date: </dt>
                <dd className="inline text-[var(--app-fg)]/80">{pp.effectiveDate}</dd>
              </div>
              <div>
                <dt className="inline">App: </dt>
                <dd className="inline text-[var(--app-fg)]/80">{app.packageId}</dd>
              </div>
              <div>
                <dt className="inline">Source: </dt>
                <dd className="inline">
                  <a href={app.repoUrl} className={LINK} target="_blank" rel="noopener noreferrer">
                    {app.repoUrl}
                  </a>
                </dd>
              </div>
            </dl>
          </div>
        </header>

        <section className="mt-10">
          <H2>The short version</H2>
          <p className="text-sm leading-relaxed">{pp.summary}</p>
        </section>

        <section className="mt-10">
          <H2>What the app handles, and where it stays</H2>
          {/* Below md the three columns are too tight: each row stacks instead. */}
          <ul className="md:hidden divide-y divide-[var(--app-border)] text-sm">
            {pp.dataTable.map((row) => (
              <li key={row.what} className="py-4 first:pt-0">
                <p className="text-[var(--app-fg)] font-medium [overflow-wrap:anywhere]">{row.what}</p>
                <p className="mt-1 text-[var(--app-fg)]/80">{row.why}</p>
                <p className="mt-3 text-[var(--app-fg)]/80">
                  <span className="block font-mono text-xs tracking-widest uppercase text-[var(--app-muted)]">
                    Where it goes
                  </span>
                  {row.whereItGoes}
                </p>
              </li>
            ))}
          </ul>
          <table className="hidden md:table w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-[var(--app-muted)] border-b border-[var(--app-border)]">
                <th className="py-2 pr-6 font-medium">What</th>
                <th className="py-2 pr-6 font-medium">Why</th>
                <th className="py-2 font-medium">Where it goes</th>
              </tr>
            </thead>
            <tbody>
              {pp.dataTable.map((row) => (
                <tr key={row.what} className="border-b border-[var(--app-border)] align-top">
                  <td className="py-3 pr-6 text-[var(--app-fg)] font-medium">{row.what}</td>
                  <td className="py-3 pr-6 text-[var(--app-fg)]/80">{row.why}</td>
                  <td className="py-3 text-[var(--app-fg)]/80">{row.whereItGoes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {pp.sections.map((s) => (
          <section key={s.heading} className="mt-10">
            <H2>{s.heading}</H2>
            <p className="text-sm leading-relaxed">{s.body}</p>
          </section>
        ))}

        <section className="mt-10">
          <H2>Contact</H2>
          <p className="text-sm leading-relaxed">
            <a href={`mailto:${pp.contactEmail}`} className={LINK}>
              {pp.contactEmail}
            </a>
            {pp.issuesUrl ? (
              <>
                {" "}or open an issue at{" "}
                <a href={pp.issuesUrl} className={`${LINK} break-all`} target="_blank" rel="noopener noreferrer">
                  {pp.issuesUrl}
                </a>
              </>
            ) : null}
          </p>
        </section>
      </main>
    </div>
  );
}

export const dynamicParams = false;
