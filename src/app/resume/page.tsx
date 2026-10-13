import type { Metadata } from "next";
import Link from "next/link";
import PrintButton from "@/components/PrintButton";
import { CASES } from "@/lib/cases";
import { education, experiences, projects, skills, socialLinks } from "@/lib/data";

const DESCRIPTION =
  "Résumé of Ritwick Verma — backend engineer at eBay. Experience, selected work, education and skills.";
const OG_ALT = "Resume — Ritwick Verma, backend engineer at eBay.";

export const metadata: Metadata = {
  title: "Resume",
  description: DESCRIPTION,
  alternates: { canonical: "/resume/" },
  openGraph: {
    title: "Resume — Ritwick Verma",
    description: DESCRIPTION,
    url: "/resume/",
    siteName: "ritwickverma.dev",
    type: "profile",
    locale: "en_US",
    images: [{ url: "/resume/og.png", width: 1200, height: 630, alt: OG_ALT }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Resume — Ritwick Verma",
    description: DESCRIPTION,
    images: [{ url: "/resume/og.png", alt: OG_ALT }],
  },
};

const contact = [
  { label: socialLinks.email, href: `mailto:${socialLinks.email}` },
  { label: "ritwickverma.dev", href: "https://www.ritwickverma.dev" },
  { label: "linkedin.com/in/ritwickverma", href: "https://www.linkedin.com/in/ritwickverma" },
  { label: "github.com/RitwickVerma", href: socialLinks.github },
];

// One line per case study for the printed page; each has a full write-up online.
const SELECTED = [
  {
    title: "TV ambilight",
    stack: "C++, Tizen, UDP",
    line: "Headless service on a Samsung TV that reads the video plane through an undocumented native capture call and drives a 75-LED strip; profiling moved it from 8 to 46 fps.",
  },
  {
    title: "Plutus",
    stack: "Python, Alpaca, GitLab CI",
    line: "Long-short equity bot with point-in-time backtests; ran 30+ falsification experiments and eight method rules that took a +149% backtest to an honest +0.57% out of sample.",
  },
  {
    title: "Homelab",
    stack: "Proxmox, Docker, Traefik, Authelia",
    line: "Fifteen self-hosted services on one host behind an SSO gateway and VPN, with pinned images, nightly backups, health alerting and written postmortems.",
  },
];
const OTHER = projects.filter((p) => ["shutup", "rpg-engine", "gesture-manager-x", "monster-sudoku", "solar-ev-daq"].includes(p.slug));

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rs-section">
      <h2 className="rs-h2">{title}</h2>
      {children}
    </section>
  );
}

export default function ResumePage() {
  return (
    <div className="rs">
      <div className="rs-bar no-print">
        <div className="frame" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: 56, gap: 16 }}>
          <Link href="/" className="label link">
            ← Index
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span className="label hide-xs">Prints as one page</span>
            <PrintButton />
          </div>
        </div>
      </div>

      <main id="main" tabIndex={-1} className="rs-page">
        <header className="rs-head">
          <div>
            <h1 className="rs-name">Ritwick Verma</h1>
            <p className="rs-title">Software engineer — backend · San Francisco, CA</p>
          </div>
          <ul className="rs-contact">
            {contact.map((c) => (
              <li key={c.href}>
                <a href={c.href} className="link">{c.label}</a>
              </li>
            ))}
          </ul>
        </header>

        <Section title="Experience">
          {experiences.map((e) => (
            <div key={e.company} className="rs-item">
              <div className="rs-row">
                <h3>
                  {e.role}, <strong>{e.company}</strong>
                  {e.location && <span className="rs-muted"> · {e.location}</span>}
                </h3>
                <span className="rs-date">{e.period}</span>
              </div>
              <ul className="rs-bullets">
                {e.description.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          ))}
        </Section>

        <Section title="Selected work">
          {SELECTED.map((s, i) => (
            <div key={s.title} className="rs-item">
              <div className="rs-row">
                <h3>
                  <strong>{s.title}</strong> <span className="rs-muted">({s.stack})</span>
                </h3>
                <a className="rs-date link no-print-link" href={`/work/${CASES[i].slug}/`}>case study</a>
              </div>
              <p className="rs-line">{s.line}</p>
            </div>
          ))}
          {OTHER.map((p) => (
            <div key={p.slug} className="rs-item">
              <p className="rs-line">
                <strong>{p.title}</strong> <span className="rs-muted">({p.tech.join(", ")})</span> — {p.description}{" "}
                {p.metric.value} {p.metric.label}.
              </p>
            </div>
          ))}
        </Section>

        <Section title="Education">
          {education.map((ed) => (
            <div key={ed.school} className="rs-edu rs-item">
              <h3 style={{ fontSize: "inherit", fontWeight: 600 }}>{ed.school}</h3>
              <span className="rs-date">{ed.period}</span>
              <p>{ed.degree}</p>
            </div>
          ))}
        </Section>

        <Section title="Skills">
          <dl className="rs-skills">
            <dt>Languages</dt>
            <dd>{skills.languages.join(", ")}</dd>
            <dt>Domains</dt>
            <dd>{skills.domains.join(", ")}</dd>
            <dt>Tools</dt>
            <dd>{skills.tools.join(", ")}</dd>
          </dl>
        </Section>
      </main>
    </div>
  );
}
