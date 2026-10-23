import type { Metadata } from "next";
import Link from "next/link";
import { socialLinks, hero, experiences, EBAY_ENDED } from "@/lib/data";
import { resume } from "@/lib/resume";

const DESCRIPTION =
  "Resume of Ritwick Verma, backend engineer with 5.5 years on eBay's Cassini search engine. Experience, projects, skills and education.";

// Says what the card says (resume/og.png): name, "Resume", the one-line role.
const OG_ALT = `${hero.name}. Resume. ${EBAY_ENDED ? "Backend engineer, C++ search systems." : "Backend engineer at eBay."}`;

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
  { label: experiences[0].location ?? "", href: "" },
  { label: socialLinks.email, href: `mailto:${socialLinks.email}` },
  { label: "linkedin.com/in/ritwick-verma", href: socialLinks.linkedin },
  { label: "github.com/RitwickVerma", href: socialLinks.github },
  { label: "gitlab.com/ritwick7", href: socialLinks.gitlab },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 print:mt-1">
      <h2 className="font-mono text-muted text-sm tracking-widest uppercase pb-2 mb-4 border-b border-border print:mb-1 print:pb-0 print:text-[8.5pt] print:border-black">
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
      {right && <span className="font-mono text-xs text-muted print:text-[8.5pt]">{right}</span>}
    </div>
  );
}

export default function ResumePage() {
  return (
    <div className="resume min-h-screen">
      <nav aria-label="Resume actions" className="print:hidden border-b border-border">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="font-mono text-sm text-accent hover:underline underline-offset-4">
            ← ritwickverma.dev
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-xs text-muted">Updated {resume.updated}</span>
            <a
              href="/Ritwick_Verma_Resume.pdf"
              download="Ritwick_Verma_Resume.pdf"
              className="font-mono text-sm text-accent hover:underline underline-offset-4"
            >
              Download
            </a>
            <a
              href="/Ritwick_Verma_Resume.pdf"
              target="_blank"
              rel="noopener"
              className="px-4 py-3 rounded-lg bg-accent text-background text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              Open PDF
            </a>
          </div>
        </div>
      </nav>

      <main
        id="main"
        tabIndex={-1}
        className="focus:outline-none max-w-3xl mx-auto px-6 py-12 text-fg/90 print:max-w-none print:p-0 print:text-[9pt] print:leading-[1.2]"
      >
        <header>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-fg print:text-[18pt]">
            {hero.name}
          </h1>
          <p className="mt-1 text-fg/80 print:mt-0">{resume.title}</p>
          <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 w-fit font-mono text-sm print:mt-0.5 print:grid-cols-3 print:gap-y-0 print:text-[8.5pt]">
            {contact.map((c) => (
              <li key={c.label}>
                {c.href ? (
                  <a href={c.href} className="text-accent hover:underline underline-offset-4">
                    {c.label}
                  </a>
                ) : (
                  <span className="text-fg/80">{c.label}</span>
                )}
              </li>
            ))}
          </ul>
        </header>

        <Section title="Summary">
          <p className="text-sm print:text-[9pt]">{resume.summary}</p>
        </Section>

        <Section title="Experience">
          <p className="text-fg font-medium">eBay</p>
          <ul className="mt-2 space-y-5 print:mt-0.5 print:space-y-1">
            {resume.roles.map((r) => (
              <li key={r.period}>
                <Row
                  left={
                    <>
                      {r.role}
                      <span className="text-muted font-normal"> · {r.location}</span>
                    </>
                  }
                  right={r.period}
                />
                <ul className="mt-1 space-y-1 list-disc pl-5 text-fg/80 text-sm print:mt-0 print:space-y-0 print:text-[9pt]">
                  {r.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-fg/80 print:mt-1 print:text-[9pt]">{resume.earlier}</p>
        </Section>

        <Section title="Selected Projects">
          {resume.projectsNote ? <p className="text-sm italic text-fg/70 mb-2 print:text-[9pt] print:mb-0.5">{resume.projectsNote}</p> : null}
          <ul className="space-y-2 list-disc pl-5 print:space-y-0.5">
            {resume.projects.map((p) => (
              <li key={p.name} className="text-sm text-fg/80 print:text-[9pt]">
                <span className="text-fg font-medium">{p.name}:</span> {p.description}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Skills">
          <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-1 text-sm print:text-[9pt] print:gap-y-0">
            {resume.skills.map((s) => (
              <div key={s.label} className="contents">
                <dt className="text-muted">{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section title="Education">
          <ul className="space-y-3 print:space-y-1">
            {resume.education.map((ed) => (
              <li key={ed.school}>
                <Row
                  left={
                    <>
                      {ed.degree}
                      <span className="text-muted font-normal">, {ed.school}</span>
                    </>
                  }
                  right={ed.period}
                />
              </li>
            ))}
          </ul>
        </Section>
      </main>
    </div>
  );
}
