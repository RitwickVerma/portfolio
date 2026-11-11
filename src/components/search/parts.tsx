import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import {
  highlight, snippet, tokenize, scoreLine, termLine,
  type DocKind, type ParsedQuery, type PlanTerm, type SearchDoc, type SearchHit, type SearchIndex,
} from "@/lib/search";

// The pieces every search surface shares: the hero box, the command palette
// and the engine room all draw results, plans and the corpus map the same way.

export function Marked({ text, stems }: { text: string; stems: string[] }) {
  return <>{highlight(text, stems).map((seg, i) => (seg.hit ? <mark key={i}>{seg.text}</mark> : seg.text))}</>;
}

/** A result's link. A note carries the query along, so the note can highlight what matched. */
export function hrefFor(doc: SearchDoc, query: string): string {
  if (doc.kind !== "Note" || !query.trim()) return doc.href;
  const [path, hash] = doc.href.split("#");
  return `${path}?q=${encodeURIComponent(query.trim())}${hash ? `#${hash}` : ""}`;
}

export function ResultLink({ href, className, children, onNavigate }: { href: string; className?: string; children: ReactNode; onNavigate?: () => void }) {
  // Same-page anchors are plain links: only a native navigation updates :target,
  // which is what marks the row you land on.
  if (href.startsWith("/#")) {
    return (
      <a href={href} className={className} onClick={onNavigate}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className} onClick={onNavigate}>
      {children}
    </Link>
  );
}

const SOURCE_NOTE: Record<PlanTerm["source"], (t: PlanTerm) => string> = {
  typed: () => "from your query",
  phrase: () => "part of a quoted phrase",
  rewrite: (t) => `added by the rewriter for “${t.from}”`,
  prefix: (t) => `completes “${t.from}”`,
  fuzzy: (t) => `nearest spelling of “${t.from}”`,
};

/** The query plan: every term searched for, how it got there and how many documents hold it. */
export function PlanChips({ plan, parsed }: { plan: PlanTerm[]; parsed: ParsedQuery }) {
  return (
    <ul className="flex flex-wrap gap-1.5 min-w-0 max-w-full" aria-label="Query plan: the terms searched for">
      {plan.map((t) => (
        <li
          key={t.term}
          className="term"
          data-source={t.source}
          data-empty={t.df === 0}
          title={`${t.term}: ${SOURCE_NOTE[t.source](t)}, in ${t.df} document${t.df === 1 ? "" : "s"}, weight ${t.weight}`}
        >
          <span className="term-t">{t.term}</span>
          {/* Seen as "search 17"; read as "search, in 17 documents". */}
          <span className="sr-only">, in </span>
          <span>{t.df}</span>
          <span className="sr-only"> document{t.df === 1 ? "" : "s"}</span>
        </li>
      ))}
      {parsed.excludedPhrases.map((p) => (
        <li key={`-"${p.join(" ")}"`} className="term" data-source="excluded" title={`Documents containing the phrase ${p.join(" ")} are removed`}>
          <span className="sr-only">Excluded phrase: </span>
          <span className="term-t">{p.join(" ")}</span>
        </li>
      ))}
      {parsed.excluded.map((t) => (
        <li key={`-${t}`} className="term" data-source="excluded" title={`Documents containing ${t} are removed`}>
          <span className="sr-only">Excluded: </span>
          <span className="term-t">{t}</span>
        </li>
      ))}
      {parsed.kinds.length > 0 && (
        <li className="term" data-source="filter" title="Only these kinds of document">
          <span>kind</span>
          <span className="sr-only">: </span>
          <span className="term-t">{parsed.kinds.join(" + ")}</span>
        </li>
      )}
      {parsed.tech.map((t) => (
        <li key={`tech-${t}`} className="term" data-source="filter" title="Only documents whose stack lists this">
          <span>tech</span>
          <span className="sr-only">: </span>
          <span className="term-t">{t}</span>
        </li>
      ))}
    </ul>
  );
}

const FIELD_NAMES = ["title", "tags", "text"] as const;

/** The arithmetic behind one result, laid out so each line can be checked by hand. */
export function Explain({ hit }: { hit: SearchHit }) {
  const { terms } = hit.explain;
  const sum = terms.reduce((s, t) => s + t.score, 0);
  const line = scoreLine(hit);
  const num = "text-right font-mono text-[0.7rem] py-1 pl-3";
  const found = (t: (typeof terms)[number]) =>
    t.tf
      .map((n, i) => (n > 0 ? `${FIELD_NAMES[i]}${n > 1 ? ` ×${n}` : ""}` : ""))
      .filter(Boolean)
      .join(", ");
  return (
    <div data-explain className="mt-3 border border-border rounded-[var(--r-box)] p-3 sm:p-4 bg-surface max-w-[44rem] overflow-x-auto">
      {line.listedByFilter ? (
        <p className="fact mb-2">Why it is here. No term scored: the filter alone lists it, so its base is 1.</p>
      ) : (
        <div className="@container">
          <p className="fact mb-2">Why it ranks here. Each row is one term: weight × idf × how often it appears, damped for length.</p>
          {/* Narrow panel (a phone): one stacked item per term, so every number is on screen. The table needs 26rem. */}
          <ol className="@min-[26rem]:hidden" aria-label="Score by term">
            {terms.map((t) => (
              <li key={t.term} className="border-t border-border py-2">
                <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="term" data-source={t.source}>
                    {t.term}
                  </span>
                  <span className="fact">{found(t)}</span>
                </p>
                <p className="mt-1 font-mono text-[0.7rem] leading-relaxed">
                  {termLine(t).weight} <span className="text-muted">weight</span> × {termLine(t).idf} <span className="text-muted">idf</span> ×{" "}
                  {termLine(t).saturation} <span className="text-muted">saturation</span> = <span className="font-bold">{termLine(t).score}</span>
                </p>
                <div className="mt-1 h-2 bg-fg/10" aria-hidden="true">
                  <div className="h-full bg-fg" style={{ width: `${Math.max(3, (t.score / sum) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ol>
          <table className="w-full border-collapse min-w-[26rem] hidden @min-[26rem]:table">
            <thead>
              <tr className="fact text-left">
                <th className="font-normal py-1">Term</th>
                <th className="font-normal py-1 pl-3">Found in</th>
                <th className="font-normal py-1 pl-3 text-right">Weight</th>
                <th className="font-normal py-1 pl-3 text-right">idf</th>
                <th className="font-normal py-1 pl-3 text-right">Score</th>
                <th className="font-normal py-1 pl-3 w-[22%]" aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {terms.map((t) => (
                <tr key={t.term} className="border-t border-border">
                  <td className="py-1">
                    <span className="term" data-source={t.source}>
                      {t.term}
                    </span>
                  </td>
                  <td className="py-1 pl-3 fact">{found(t)}</td>
                  <td className={num}>{t.weight.toFixed(2)}</td>
                  <td className={num}>{t.idf.toFixed(2)}</td>
                  <td className={num}>{t.score.toFixed(2)}</td>
                  <td className="py-1 pl-3" aria-hidden="true">
                    <div className="h-2 bg-fg" style={{ width: `${Math.max(3, (t.score / sum) * 100)}%` }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* The base is printed to three decimals, or to as many more as it takes for the line to round to the score when multiplied by hand. */}
      <p className="mt-2 pt-2 border-t border-fg font-mono text-[0.7rem] leading-relaxed">
        {line.base}
        {line.listedByFilter ? " (listed by the filter)" : ""}
        {line.factors.map((f) => ` × ${f.value} ${f.label}`).join("")} {line.exact ? "=" : "≈"} <span className="font-bold">{line.total}</span>
      </p>
    </div>
  );
}

/** One result row. */
export function ResultRow({
  hit, top, i, query, selected, open, onToggle, collapsed, id,
}: {
  hit: SearchHit;
  /** The best score in the list; 0 hides the score column (nothing was searched). */
  top: number;
  i: number;
  query: string;
  selected: boolean;
  /** Whether the score breakdown is open. */
  open: boolean;
  onToggle: () => void;
  collapsed: boolean;
  id: string;
}) {
  const { doc, score, matched } = hit;
  const shown = snippet(doc.text, matched);
  // A match on something the row does not print (the stack, a tag) is named, so no result looks unexplained.
  const visible = [doc.title, shown].some((t) => highlight(t, matched).some((s) => s.hit));
  const unseen = visible ? [] : (doc.keywords ?? []).filter((k) => tokenize(k).some((t) => matched.includes(t)));
  return (
    <li
      id={id}
      data-selected={selected}
      className={`rank-in ${collapsed ? "max-sm:hidden" : ""} relative grid grid-cols-[1fr_auto] sm:grid-cols-[7.5rem_1fr_auto] gap-x-3 sm:gap-x-6 gap-y-1 py-4 border-t border-border data-[selected=true]:bg-surface data-[selected=true]:shadow-[inset_3px_0_0_var(--fg)] data-[selected=true]:-mx-3 data-[selected=true]:px-3`}
      style={{ "--i": i } as CSSProperties}
    >
      <p className="fact sm:pt-1.5 col-span-2 sm:col-span-1">{doc.kind}</p>
      <div className="min-w-0">
        <h3>
          <ResultLink href={hrefFor(doc, query)} className="link text-lg sm:text-xl font-semibold leading-snug">
            <Marked text={doc.title} stems={matched} />
          </ResultLink>
        </h3>
        <p className="fact mt-0.5">{doc.context}</p>
        <p className="mt-1.5 text-fg/85 max-w-[68ch]">
          <Marked text={shown} stems={matched} />
        </p>
        {unseen.length > 0 && (
          <p className="fact mt-1.5">
            Matches on{" "}
            {unseen.map((k, n) => (
              <span key={k}>
                {n > 0 ? ", " : ""}
                <mark>{k}</mark>
              </span>
            ))}
          </p>
        )}
        {open && top > 0 && <Explain hit={hit} />}
      </div>
      {top > 0 && (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          // Wide: score, bar and "Why?" stacked. Phone: just "Why?", a 44 px target; the score is still read aloud.
          // 45 px, not 44: the .fact lines above it are 24.3167 px tall, so the button starts at a fractional offset,
          // and Firefox then reports a 44 px box as 43.9999 px. One extra pixel keeps the target at 44 wherever it lands.
          className="w-11 sm:w-[4.5rem] max-sm:min-h-[45px] max-sm:flex max-sm:items-start max-sm:justify-end max-sm:pt-1 self-start sm:pt-2 text-right group"
        >
          {/* No aria-label: the name is built from the content, so what is seen is what is announced. */}
          <span className="sr-only">Score </span>
          <span className="font-mono text-xs text-muted group-hover:text-fg max-sm:sr-only">{score.toFixed(2)}</span>
          <span className="block mt-1.5 h-[3px] bg-fg/10 max-sm:hidden">
            <span className="block h-full bg-fg" style={{ width: `${Math.max(4, (score / top) * 100)}%` }} />
          </span>
          <span className="fact !text-xs sm:mt-1.5 block underline decoration-fg/30 underline-offset-4 group-hover:text-fg max-sm:pt-2">
            {open ? "Hide" : "Why?"}
            <span className="sr-only">{open ? " the arithmetic" : " Show the arithmetic"}</span>
          </span>
        </button>
      )}
    </li>
  );
}

const KIND_ORDER: DocKind[] = ["eBay", "Project", "Note", "Earlier work", "Skills", "Education", "Homelab", "Page"];
const KIND_SHORT: Record<DocKind, string> = {
  eBay: "eBay",
  Project: "Projects",
  Note: "Notes",
  "Earlier work": "Earlier",
  Skills: "Skills",
  Education: "School",
  Homelab: "Lab",
  Page: "Pages",
};

/**
 * The whole index at a glance: one tick per document, grouped by kind. A tick
 * lights when its document matches and stands as tall as its score; the top
 * hit takes the highlighter.
 */
export function CorpusMap({ index, hits, compact = false }: { index: SearchIndex; hits: SearchHit[]; /** Without the legend row underneath. */ compact?: boolean }) {
  const scores = new Map(hits.map((h) => [h.doc.id, h.score]));
  const top = hits[0]?.score ?? 0;
  const topId = top > 0 ? hits[0].doc.id : null;
  const groups = KIND_ORDER.map((kind) => ({ kind, docs: index.docs.filter((d) => d.kind === kind) })).filter((g) => g.docs.length > 0);

  // A diagram, not navigation: the result list underneath is the way in.
  return (
    <div className="corpus-map" role="img" aria-label={`Map of the index: ${top > 0 ? hits.length : scores.size} of ${index.docs.length} documents match`}>
      {groups.map((g) => (
        <div key={g.kind} style={{ flex: `${g.docs.length} 1 0` }}>
          <div>
            {g.docs.map((d) => {
              const score = scores.get(d.id);
              const lit = score !== undefined;
              const style = lit && top > 0 ? ({ "--h": `${Math.round(30 + 70 * (score / top))}%` } as CSSProperties) : undefined;
              return (
                <span
                  key={d.id}
                  data-lit={lit}
                  data-top={d.id === topId}
                  style={style}
                  title={`${d.kind}: ${d.title}${lit && top > 0 ? ` (${score.toFixed(2)})` : ""}`}
                />
              );
            })}
          </div>
          {!compact && <p className="fact">{KIND_SHORT[g.kind]}</p>}
        </div>
      ))}
    </div>
  );
}
