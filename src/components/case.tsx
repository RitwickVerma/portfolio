import Link from "next/link";
import { CASES, caseBySlug, type CaseIndex } from "@/lib/cases";

/** Case-study title block: sheet number, title, abstract, and a spec row. */
export function CaseHeader({ slug, abstract }: { slug: CaseIndex["slug"]; abstract: React.ReactNode }) {
  const c = caseBySlug(slug);
  return (
    <header className="case-head frame">
      <p className="label" style={{ display: "flex", gap: 18, marginBottom: 22 }}>
        <Link href="/#work" className="link">
          ← Index
        </Link>
        <span className="label-signal">Case study {c.idx} / 0{CASES.length}</span>
      </p>
      <h1 className="display case-title">
        {c.title[0]}
        <em>{c.title[1]}</em>
        {c.title[2]}
      </h1>
      <div className="lede" style={{ marginTop: "clamp(22px, 3vw, 34px)", maxWidth: "38em" }}>
        {abstract}
      </div>
      <dl className="case-meta">
        {(
          [
            ["Role", c.meta.role],
            ["Stack", c.meta.stack],
            ["Status", c.meta.status],
          ] as const
        ).map(([k, v]) => (
          <div key={k}>
            <dt className="label">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
        <div>
          <dt className="label">Key figure</dt>
          <dd className="kf num">
            {c.figure.value}
            <small>{c.figure.label}</small>
          </dd>
        </div>
      </dl>
    </header>
  );
}

/** A numbered step in the write-up. */
export function Step({ no, title, children }: { no: string; title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="step" data-reveal>
      <div className="step-head">
        <span className="sheet-no">{no}</span>
        <h3 className="h-3">{title}</h3>
      </div>
      <div className="prose">{children}</div>
    </div>
  );
}

/** A figure plate with its numbered caption. */
export function Fig({
  no,
  caption,
  children,
  pad = true,
}: {
  no: string;
  caption: React.ReactNode;
  children: React.ReactNode;
  pad?: boolean;
}) {
  return (
    <figure className="figure" data-reveal style={{ marginBlock: "clamp(28px, 4vw, 48px)" }}>
      <div className="plate" style={{ padding: pad ? "clamp(36px, 4vw, 52px) clamp(16px, 3vw, 36px) clamp(18px, 3vw, 32px)" : 0 }}>
        <span className="plate-tag">Fig. {no}</span>
        {children}
      </div>
      <figcaption className="figcap">
        <b>Fig. {no}</b>
        <span>{caption}</span>
      </figcaption>
    </figure>
  );
}

/** Pull-quote style statement. */
export function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="callout-box" data-reveal>
      <p>{children}</p>
    </div>
  );
}

/** Link to the next case study (wraps around). */
export function NextCase({ slug }: { slug: CaseIndex["slug"] }) {
  const i = CASES.findIndex((c) => c.slug === slug);
  const next = CASES[(i + 1) % CASES.length];
  return (
    <Link href={`/work/${next.slug}/`} className="next-case frame">
      <span className="label">Next case study · {next.idx}</span>
      <span className="h-sheet" style={{ display: "block", marginTop: 10 }}>
        {next.title[0]}
        <em>{next.title[1]}</em>
        {next.title[2]} <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}
