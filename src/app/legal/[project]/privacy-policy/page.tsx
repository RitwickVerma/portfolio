import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { legalProjects, legalSlugs } from "@/lib/legal";

// Standalone legal pages: Google Play / App Store Connect / OAuth consent
// screens need a public, stable URL for a privacy policy. This route sits
// outside the (site) group on purpose (same reason /resume does) so it never
// picks up the shared Nav or Footer, is never added to sitemap.ts, and is
// never linked from anywhere on ritwickverma.dev — the only way in is the
// exact URL handed to the platform that required it. `robots: noindex` below
// is belt-and-suspenders on top of that.
//
// Adding a project: one entry in src/lib/legal.ts. Nothing here changes.
export async function generateStaticParams() {
  return legalSlugs().map((project) => ({ project }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ project: string }>;
}): Promise<Metadata> {
  const { project } = await params;
  const data = legalProjects[project];
  if (!data) return {};
  return {
    title: `Privacy Policy \u00b7 ${data.appName}`,
    description: data.summary,
    alternates: { canonical: `/legal/${project}/privacy-policy/` },
    robots: { index: false, follow: false },
  };
}

export default async function PrivacyPolicyPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project } = await params;
  const data = legalProjects[project];
  if (!data) notFound();

  return (
    <div className="min-h-screen bg-background text-fg">
      <main
        id="main"
        tabIndex={-1}
        className="focus:outline-none max-w-2xl mx-auto px-6 py-12 text-fg/90"
      >
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-fg">
            {data.appName} Privacy Policy
          </h1>
          <dl className="mt-3 space-y-1 font-mono text-sm text-muted">
            <div>
              <dt className="inline">Effective date: </dt>
              <dd className="inline text-fg/80">{data.effectiveDate}</dd>
            </div>
            <div>
              <dt className="inline">App: </dt>
              <dd className="inline text-fg/80">{data.packageOrBundleId}</dd>
            </div>
            <div>
              <dt className="inline">Source: </dt>
              <dd className="inline text-fg/80">{data.repoUrl}</dd>
            </div>
          </dl>
        </header>

        <section className="mt-8">
          <h2 className="font-mono text-muted text-sm tracking-widest uppercase pb-2 mb-3 border-b border-border">
            The short version
          </h2>
          <p className="text-sm leading-relaxed">{data.summary}</p>
        </section>

        <section className="mt-8 overflow-x-auto">
          <h2 className="font-mono text-muted text-sm tracking-widest uppercase pb-2 mb-3 border-b border-border">
            What the app handles, and where it stays
          </h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="py-2 pr-4 font-medium">What</th>
                <th className="py-2 pr-4 font-medium">Why</th>
                <th className="py-2 font-medium">Where it goes</th>
              </tr>
            </thead>
            <tbody>
              {data.dataTable.map((row) => (
                <tr key={row.what} className="border-b border-border/60 align-top">
                  <td className="py-2 pr-4 text-fg font-medium whitespace-nowrap">{row.what}</td>
                  <td className="py-2 pr-4 text-fg/80">{row.why}</td>
                  <td className="py-2 text-fg/80">{row.whereItGoes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {data.sections.map((s) => (
          <section key={s.heading} className="mt-8">
            <h2 className="font-mono text-muted text-sm tracking-widest uppercase pb-2 mb-3 border-b border-border">
              {s.heading}
            </h2>
            <p className="text-sm leading-relaxed">{s.body}</p>
          </section>
        ))}

        <section className="mt-8">
          <h2 className="font-mono text-muted text-sm tracking-widest uppercase pb-2 mb-3 border-b border-border">
            Contact
          </h2>
          <p className="text-sm leading-relaxed">{data.contactEmail}</p>
        </section>
      </main>
    </div>
  );
}

export const dynamicParams = false;
