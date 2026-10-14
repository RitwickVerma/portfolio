import type { Metadata } from "next";
import Link from "next/link";
import PrintButton from "@/components/PrintButton";
import { experiences, education, projects, skills, socialLinks, hero } from "@/lib/data";

const DESCRIPTION =
  "Resume of Ritwick Verma, backend engineer at eBay. Experience, projects, education and skills.";

const OG_ALT = "Resume of Ritwick Verma, backend engineer at eBay.";

export const metadata: Metadata = {
  title: "Resume",
  description: DESCRIPTION,
  alternates: { canonical: "/resume/" },
  openGraph: {
    title: "Resume · Ritwick Verma",
    description: DESCRIPTION,
    url: "/resume/",
    siteName: "ritwickverma.dev",
    type: "profile",
    locale: "en_US",
    images: [{ url: "/resume/og.png", width: 1200, height: 630, alt: OG_ALT }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Resume · Ritwick Verma",
    description: DESCRIPTION,
    images: [{ url: "/resume/og.png", alt: OG_ALT }],
  },
};

const contact = [
  { label: socialLinks.email, href: `mailto:${socialLinks.email}` },
  { label: "linkedin.com/in/ritwick-verma", href: socialLinks.linkedin },
  { label: "github.com/RitwickVerma", href: socialLinks.github },
  { label: "gitlab.com/ritwick7", href: socialLinks.gitlab },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 print:mt-2">
      <h2 className="font-mono text-muted text-sm tracking-widest uppercase pb-2 mb-4 border-b border-border print:mb-1 print:pb-0 print:text-[9pt] print:border-black">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ left, right }: { left: React.ReactNode; right?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6">
      <h3 className="text-fg font-medium">{left}</h3>
      {right && <span className="font-mono text-xs text-muted print:text-[9pt]">{right}</span>}
    </div>
  );
}

export default function ResumePage() {
  return (
    <div className="resume min-h-screen">
      <div className="print:hidden border-b border-border">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="font-mono text-sm text-accent hover:underline underline-offset-4">
            ← ritwickverma.dev
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-xs text-muted">
              Prints as one black-on-white page
            </span>
            <PrintButton />
          </div>
        </div>
      </div>

      <main
        id="main"
        tabIndex={-1}
        className="focus:outline-none max-w-3xl mx-auto px-6 py-12 text-fg/90 print:max-w-none print:p-0 print:text-[10pt] print:leading-tight"
      >
        <header>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-fg print:text-[20pt]">
            {hero.name}
          </h1>
          <p className="mt-1 text-fg/80 print:mt-0">
            {hero.line} {hero.lineTwo}
          </p>
          <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 w-fit font-mono text-sm print:mt-1 print:grid-cols-2 print:text-[9pt]">
            {contact.map((c) => (
              <li key={c.href}>
                <a href={c.href} className="text-accent hover:underline underline-offset-4">
                  {c.label}
                </a>
              </li>
            ))}
          </ul>
        </header>

        <Section title="Experience">
          <ul className="space-y-5 print:space-y-1.5">
            {experiences.map((e) => (
              <li key={`${e.company} ${e.period}`}>
                <Row
                  left={
                    <>
                      {e.role}, <span className="text-accent print:text-black">{e.company}</span>
                      {e.location && <span className="text-muted font-normal"> · {e.location}</span>}
                    </>
                  }
                  right={e.period}
                />
                <ul className="mt-1 space-y-1 list-disc pl-5 text-fg/80 text-sm print:mt-0 print:space-y-0 print:text-[10pt]">
                  {e.description.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Projects">
          <ul className="space-y-3 print:space-y-1">
            {projects.filter((p) => p.onResume !== false).map((p) => (
              <li key={p.slug} className="text-sm print:text-[10pt]">
                <span className="text-fg font-medium">{p.title}</span>{" "}
                <span className="font-mono text-xs text-fg/70 print:text-[9pt]">
                  ({p.tech.join(", ")})
                </span>: {p.description}{" "}
                <span className="text-fg/80">
                  {p.metric.value} {p.metric.label}.
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Education">
          <ul className="space-y-3 print:space-y-1">
            {education.map((ed) => (
              <li key={ed.school}>
                {/* Screen: degree on its own line. Print: inline, to hold one page. */}
                <Row
                  left={
                    <>
                      {ed.school}
                      <span className="hidden print:inline font-normal">, {ed.degree}</span>
                    </>
                  }
                  right={ed.period}
                />
                <p className="text-sm text-fg/70 print:hidden">{ed.degree}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Skills">
          <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-1 text-sm print:text-[10pt] print:gap-y-0">
            <dt className="text-muted">Languages</dt>
            <dd>{skills.languages.join(", ")}</dd>
            <dt className="text-muted">Domains</dt>
            <dd>{skills.domains.join(", ")}</dd>
            <dt className="text-muted">Tools</dt>
            <dd>{skills.tools.join(", ")}</dd>
          </dl>
        </Section>
      </main>
    </div>
  );
}
