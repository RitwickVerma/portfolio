import Link from "next/link";
import type { ReactNode } from "react";
import AppIcon from "@/components/AppIcon";
import type { PublicApp } from "@/lib/apps";

// Header and footer shared by every app page. Everything is styled off the
// app's own CSS variables (set by the route), so the same markup reads as a
// dark terminal tool on one page and a Material 3 app on the other.

export type ChromeLink = { href: string; label: string; external?: boolean };

export function ext(external?: boolean) {
  return external ? { target: "_blank", rel: "noopener noreferrer" } : {};
}

export function AppHeader({
  app,
  nav,
  cta,
  ctaClass,
  home = `/apps/${app.slug}/`,
}: {
  app: PublicApp;
  nav: ChromeLink[];
  cta?: ChromeLink;
  ctaClass?: string;
  home?: string;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--outline)] bg-[color-mix(in_srgb,var(--bg)_82%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5 sm:px-8">
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
          <Link
            href="/"
            className="hidden shrink-0 text-[var(--muted)] transition-colors hover:text-[var(--fg)] sm:inline"
          >
            ritwickverma.dev
          </Link>
          <span aria-hidden="true" className="hidden text-[var(--outline-strong,var(--muted))] sm:inline">
            /
          </span>
          <Link href={home} className="flex min-w-0 items-center gap-2.5 font-semibold text-[var(--fg)]">
            <AppIcon app={app} size={28} />
            <span className="truncate">{app.name}</span>
          </Link>
        </nav>
        <nav aria-label={`${app.name} sections`} className="ml-auto hidden items-center gap-1 md:flex">
          {nav.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-[var(--r-button)] px-3 py-2 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--fg)]"
              {...ext(l.external)}
            >
              {l.label}
            </a>
          ))}
        </nav>
        {cta ? (
          <a href={cta.href} className={`ml-auto shrink-0 md:ml-2 ${ctaClass ?? ""}`} {...ext(cta.external)}>
            {cta.label}
          </a>
        ) : null}
      </div>
    </header>
  );
}

export function AppFooter({ app, extra }: { app: PublicApp; extra?: ReactNode }) {
  const cols: { title: string; links: ChromeLink[] }[] = [
    {
      title: "App",
      links: [
        ...(app.playUrl ? [{ href: app.playUrl, label: "Google Play", external: true }] : []),
        { href: app.releasesUrl, label: "Releases", external: true },
        { href: app.repoUrl, label: "Source code", external: true },
        { href: app.issuesUrl, label: "Report an issue", external: true },
      ],
    },
    {
      title: "Legal",
      links: [
        { href: `/apps/${app.slug}/privacy-policy/`, label: "Privacy policy" },
        { href: app.repoUrl, label: `${app.license} licence`, external: true },
      ],
    },
    {
      title: "Author",
      links: [
        { href: "/", label: "Ritwick Verma" },
        { href: "/#projects", label: "More projects" },
      ],
    },
  ];
  return (
    <footer className="border-t border-[var(--outline)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <div className="flex items-center gap-3">
            <AppIcon app={app} size={40} />
            <span className="text-lg font-semibold text-[var(--fg)]">{app.name}</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-[var(--muted)]">{app.tagline}</p>
          {extra}
          <p className="mt-4 font-mono text-xs text-[var(--muted)] [overflow-wrap:anywhere]">{app.packageId}</p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--fg)]/70">{c.title}</h2>
            <ul className="mt-3 text-sm">
              {c.links.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="inline-block py-1.5 text-[var(--fg)] underline-offset-4 transition-colors hover:text-[var(--accent)] hover:underline"
                    {...ext(l.external)}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--outline)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>
            © {new Date(process.env.NEXT_PUBLIC_BUILD_DATE ?? "2026-01-01").getFullYear()} Ritwick Verma. {app.name} is free software under the{" "}
            {app.license} licence.
          </p>
          <Link href="/" className="text-[var(--muted)] transition-colors hover:text-[var(--fg)]">
            ritwickverma.dev
          </Link>
        </div>
      </div>
    </footer>
  );
}
