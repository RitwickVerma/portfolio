import Link from "next/link";
import HomelabDrawing from "@/components/HomelabDrawing";
import Sheet from "@/components/Sheet";
import { CASES } from "@/lib/cases";
import { education, experiences, projects } from "@/lib/data";

const OTHER = projects.filter((p) => ["shutup", "rpg-engine", "gesture-manager-x", "monster-sudoku", "solar-ev-daq"].includes(p.slug));

const PRINCIPLES = [
  {
    no: "P1",
    title: "Measure the thing, not the proxy.",
    body: "The ambilight’s own timing counters were lifetime averages — they held at a flat ~11 ms while the real frame time fell from ~98 ms to ~13 ms. Counting delivered frames directly is what found the actual bottleneck.",
  },
  {
    no: "P2",
    title: "Try to break every good result.",
    body: "Plutus’s best numbers all died under scrutiny: a survivor-only universe faked +16%, a one-month misalignment faked 28% a year. Each became a rule. Only pre-registered, out-of-sample results count.",
  },
  {
    no: "P3",
    title: "Fail loudly.",
    body: "This site once served a stale build for seven weeks: the build was OOM-killed, the deploy script exited before copying, and every health check still said 200. Checks now verify bytes and timestamps, never status codes.",
  },
  {
    no: "P4",
    title: "Keep the blast radius small.",
    body: "One service per container, images pinned and bumped deliberately, most hostnames reachable only over the VPN. When something breaks, it breaks alone.",
  },
];

export default function Home() {
  return (
    <>
      {/* ---------------- hero ---------------- */}
      <section className="hero frame" aria-labelledby="hero-title">
        <div className="hero-grid">
          <div>
            <p className="hero-kicker label fade-in">
              <span className="label-signal">Backend engineer · eBay</span>
              <span>San Francisco</span>
            </p>
            <h1 id="hero-title" className="display hero-title">
              <span className="sr-only">Ritwick Verma — </span>
              <span className="line"><span>I build systems,</span></span>
              <span className="line"><span>then try to</span></span>
              <span className="line"><span><em>prove them wrong.</em></span></span>
            </h1>
            <p className="lede hero-lede fade-in">
              I write backend services at eBay. On my own time I reverse‑engineered my TV to drive its ambient
              lights, run fifteen self‑hosted services like production, and spent two months trying to prove my
              trading bot works — then published that it doesn’t.
            </p>
            <div className="cta-row fade-in">
              <Link className="btn btn-solid" href="#work">
                Read the case studies <span className="arrow" aria-hidden="true">→</span>
              </Link>
              <Link className="btn btn-line" href="/resume/">
                Resume
              </Link>
            </div>
            <div className="proof fade-in" aria-label="Key figures">
              <div>
                <div className="spec-value signal num">8 → 46 fps</div>
                <div className="label">Ambilight, after profiling</div>
              </div>
              <div>
                <div className="spec-value num">30+</div>
                <div className="label">Plutus experiments, all logged</div>
              </div>
              <div>
                <div className="spec-value num">15</div>
                <div className="label">Self-hosted guests, one host</div>
              </div>
              <div>
                <div className="spec-value num">26,000+</div>
                <div className="label">ShutUp downloads, GPLv3</div>
              </div>
            </div>
          </div>
          <HomelabDrawing />
        </div>
      </section>

      {/* ---------------- work ---------------- */}
      <Sheet id="work" no="01" label="Selected work">
        <h2 className="h-sheet" style={{ maxWidth: "16em", marginBottom: "clamp(32px, 4vw, 56px)" }} data-reveal>
          Three systems, each written up with the numbers — <em>including the ones that went the wrong way.</em>
        </h2>
        <div className="work-list">
          {CASES.map((c) => (
            <Link key={c.slug} href={`/work/${c.slug}/`} className="work-row" data-reveal>
              <span className="work-idx">{c.idx}</span>
              <div>
                <h3 className="work-title">
                  {c.title[0]}
                  <em>{c.title[1]}</em>
                  {c.title[2]}
                </h3>
                <span className="work-more label" aria-hidden="true">
                  Read the case study →
                </span>
              </div>
              <p className="work-sum">{c.summary}</p>
              <div className="work-fig">
                <div className="spec-value num">{c.figure.value}</div>
                <div className="label">{c.figure.label}</div>
              </div>
            </Link>
          ))}
        </div>
      </Sheet>

      {/* ---------------- other work ---------------- */}
      <Sheet id="also" no="02" label="Also built">
        <h2 className="h-sheet" style={{ maxWidth: "16em", marginBottom: "clamp(28px, 3.4vw, 44px)" }} data-reveal>
          Smaller things, <em>shipped and maintained.</em>
        </h2>
        <div className="table-wrap" data-reveal>
          <table className="table">
            <caption className="sr-only">Other projects</caption>
            <thead>
              <tr>
                <th scope="col">Project</th>
                <th scope="col">What it is</th>
                <th scope="col" className="hide-sm">Spec</th>
                <th scope="col" className="r">Source</th>
              </tr>
            </thead>
            <tbody>
              {OTHER.map((p) => {
                const href = p.links.github ?? p.links.gitlab;
                return (
                  <tr key={p.slug}>
                    <td className="k">{p.title}</td>
                    <td>
                      {p.description}
                      <span className="mono muted" style={{ display: "block", fontSize: 12.5, marginTop: 4 }}>
                        {p.tech.join(" · ")}
                      </span>
                    </td>
                    <td className="v hide-sm">
                      {p.metric.value}
                      <span className="muted" style={{ display: "block", whiteSpace: "normal", fontSize: 12, maxWidth: 220 }}>
                        {p.metric.label}
                      </span>
                    </td>
                    <td className="r mono" style={{ fontSize: 13 }}>
                      {href ? (
                        <a className="link" href={href} aria-label={`${p.title} source code`}>
                          code ↗
                        </a>
                      ) : (
                        <span className="muted">no public repo</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Sheet>

      {/* ---------------- principles ---------------- */}
      <Sheet id="principles" no="03" label="Operating principles">
        <h2 className="h-sheet" style={{ maxWidth: "15em", marginBottom: "clamp(32px, 4vw, 56px)" }} data-reveal>
          Four rules, each one <em>learned the expensive way.</em>
        </h2>
        <div className="principles">
          {PRINCIPLES.map((p) => (
            <div key={p.no} className="principle" data-reveal>
              <span className="sheet-no">{p.no}</span>
              <h3 className="h-3">{p.title}</h3>
              <p>{p.body}</p>
            </div>
          ))}
        </div>
      </Sheet>

      {/* ---------------- experience ---------------- */}
      <Sheet id="experience" no="04" label="Experience">
        <h2 className="h-sheet" style={{ maxWidth: "16em", marginBottom: "clamp(28px, 3.4vw, 44px)" }} data-reveal>
          Where I’ve <em>worked and studied.</em>
        </h2>
        <div data-reveal>
          {experiences.map((e) => (
            <div key={e.company} className="tl-row">
              <div className="tl-when">{e.period}</div>
              <div className="tl-what">
                <h3 className="h-3">
                  {e.role} <span className="muted">· {e.company}</span>
                </h3>
                {e.description.map((d) => (
                  <p key={d}>{d}</p>
                ))}
              </div>
            </div>
          ))}
          {education.map((e) => (
            <div key={e.school} className="tl-row">
              <div className="tl-when">{e.period}</div>
              <div className="tl-what">
                <h3 className="h-3">
                  {e.degree} <span className="muted">· {e.school}</span>
                </h3>
              </div>
            </div>
          ))}
        </div>
      </Sheet>
    </>
  );
}
