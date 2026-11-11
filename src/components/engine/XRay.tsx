"use client";

import { useEffect, useMemo, useState } from "react";
import { search, parseQuery, scoreLine, factor, CONTROL, TREATMENT, FUZZY_WEIGHT, PHRASE_BONUS, PREFIX_WEIGHT, REWRITE_WEIGHT } from "@/lib/search";
import { useSearchIndex } from "@/lib/useSearchIndex";
import { PlanChips } from "@/components/search/parts";

// One query, taken apart. Each stage shows what the engine holds at that
// point: the stems, the plan, the scores. The last stage
// runs the same query through the control ranker and shows what moved.

const PRESETS = ["performance testing", '"traffic replay" -plutus', "fitmnet", "kind:note hdr tone", "reverse eng"];

function Stage({ n, name, what, children }: { n: number; name: string; what: string; children: React.ReactNode }) {
  return (
    <li className="border-t border-border py-6 grid lg:grid-cols-12 gap-x-8 gap-y-3">
      <div className="lg:col-span-3">
        <h3 className="wd-semi text-xl font-bold leading-tight text-balance">
          <span className="font-mono text-xs font-normal text-muted mr-2">{n}</span>
          {name}
        </h3>
        <p className="fact mt-1 max-w-[30ch]">{what}</p>
      </div>
      <div className="lg:col-span-9 min-w-0">{children}</div>
    </li>
  );
}

const TOP = 5;
const short = (s: string, n = 46) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** What is in the box is what the address says: ?q= follows the query, and goes when the box is empty. */
function writeUrl(query: string) {
  const url = new URL(window.location.href);
  if (query.trim()) url.searchParams.set("q", query);
  else url.searchParams.delete("q");
  window.history.replaceState(window.history.state, "", url);
}

/** Fired by a link in the replay table: take this query apart, here, without leaving the page. */
export const XRAY_EVENT = "xray:query";

export default function XRay() {
  const { index } = useSearchIndex();
  const [text, setText] = useState(PRESETS[0]);

  // The query is a link: /engine/?q=... opens on it.
  const choose = (query: string) => {
    setText(query);
    writeUrl(query);
  };

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    const t = q ? window.setTimeout(() => setText(q.slice(0, 120)), 0) : undefined;
    // A link in the replay table sits on this same page, so nothing remounts: it tells us instead.
    const onQuery = (e: Event) => {
      const query = String((e as CustomEvent<string>).detail ?? "").slice(0, 120);
      setText(query);
      writeUrl(query);
    };
    window.addEventListener(XRAY_EVENT, onQuery);
    return () => {
      if (t) window.clearTimeout(t);
      window.removeEventListener(XRAY_EVENT, onQuery);
    };
  }, []);

  const treatment = useMemo(() => search(index, text, TREATMENT), [index, text]);
  const control = useMemo(() => search(index, text, CONTROL), [index, text]);
  const parsed = treatment.parsed;

  // What each typed word became: the surface form next to its stem.
  const words = useMemo(
    () =>
      text
        .replace(/"/g, " ")
        .split(/\s+/)
        .filter((w) => w && !/^(kind|in|tech|stack):/i.test(w))
        .map((w) => {
          const bare = w.replace(/^-/, "").toLowerCase();
          const stems = parseQuery(`${bare} `).terms;
          return { raw: w, stems, dropped: stems.length === 0 };
        }),
    [text],
  );

  const controlRank = new Map(control.hits.map((h, i) => [h.doc.id, i + 1]));
  const best = treatment.hits[0]?.score ?? 1;
  const filtered = parsed.excluded.length > 0 || parsed.excludedPhrases.length > 0 || parsed.kinds.length > 0 || parsed.tech.length > 0;

  return (
    <div>
      <label htmlFor="xray-q" className="sr-only">
        Query to take apart
      </label>
      <input
        id="xray-q"
        type="search"
        value={text}
        onChange={(e) => choose(e.target.value)}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={120}
        className="w-full border-2 border-fg bg-background rounded-[var(--r-box)] px-4 py-3.5 font-mono text-base sm:text-lg outline-none focus:border-accent [&::-webkit-search-cancel-button]:hidden"
      />
      <div className="mt-3 mb-8 flex flex-wrap items-baseline gap-x-1 gap-y-1">
        <span className="fact mr-2">Try</span>
        {PRESETS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => choose(q)}
            aria-pressed={text === q}
            className="font-mono text-xs px-2 py-1.5 rounded-[var(--r-chip)] text-accent underline decoration-accent/40 underline-offset-4 aria-pressed:bg-hit aria-pressed:text-ink aria-pressed:no-underline"
          >
            {q}
          </button>
        ))}
      </div>

      <ol className="border-b border-border">
        <Stage n={1} name="Your words are cut down to stems." what="Lowercase, split, drop stopwords, strip suffixes. Quotes, a leading minus and kind: or tech: are read first.">
          {words.length === 0 ? (
            <p className="fact">Nothing to parse yet.</p>
          ) : (
            <ul className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-xs">
              {words.map((w, i) => (
                <li key={`${w.raw}${i}`} className={`max-w-full [overflow-wrap:anywhere] ${w.dropped ? "text-muted line-through" : ""}`} title={w.dropped ? "Dropped: a stopword or punctuation" : undefined}>
                  {w.raw}
                  {!w.dropped && (
                    <>
                      <span className="text-muted mx-1.5" aria-label="becomes">
                        ⟶
                      </span>
                      <span className="font-bold">{w.stems.join(" ")}</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
          {(parsed.phrases.length > 0 || parsed.excluded.length > 0 || parsed.excludedPhrases.length > 0 || parsed.kinds.length > 0 || parsed.tech.length > 0) && (
            <p className="fact mt-3">
              {[
                parsed.phrases.length > 0 ? `${parsed.phrases.length} phrase${parsed.phrases.length > 1 ? "s" : ""} (${parsed.phrases.map((p) => `“${p.join(" ")}”`).join(", ")}) must appear with its words next to each other and in order (small words such as “of” are ignored)` : "",
                parsed.excluded.length + parsed.excludedPhrases.length > 0
                  ? `documents with ${[...parsed.excluded, ...parsed.excludedPhrases.map((p) => `“${p.join(" ")}”`)].join(", ")} are removed`
                  : "",
                parsed.kinds.length > 0 ? `only ${parsed.kinds.join(" and ")} documents` : "",
                parsed.tech.length > 0 ? `only stacks listing ${parsed.tech.join(", ")}` : "",
              ]
                .filter(Boolean)
                .join("; ")}
              .
            </p>
          )}
        </Stage>

        <Stage n={2} name="The engine adds words you did not type." what={`Add the site's words for yours at ${REWRITE_WEIGHT}, complete the word still being typed at ${PREFIX_WEIGHT}, respell a word nothing matched at ${FUZZY_WEIGHT}.`}>
          {treatment.plan.length === 0 && !filtered ? (
            <p className="fact">No terms.</p>
          ) : (
            <>
              {/* A long unbroken word makes a long chip; it scrolls here instead of widening the page. */}
              <div className="max-w-full overflow-x-auto">
                <PlanChips plan={treatment.plan} parsed={parsed} />
              </div>
              <p className="fact mt-3">
                {treatment.plan.filter((t) => t.source === "typed" || t.source === "phrase").length} from the query,{" "}
                {treatment.plan.filter((t) => t.source === "rewrite").length} from the rewriter, {treatment.plan.filter((t) => t.source === "prefix").length}{" "}
                completions, {treatment.plan.filter((t) => t.source === "fuzzy").length} respellings. The number on each is how many documents hold it.
              </p>
            </>
          )}
        </Stage>

        <Stage n={3} name="Each score is a sum you can check." what="BM25 per term across title, tags and text, summed, then multiplied by the document's static rank. Each bar is split by term.">
          {treatment.hits.length === 0 ? (
            <p>No document matches. That is a result too.</p>
          ) : (
            <ol className="space-y-3">
              {treatment.hits.slice(0, TOP).map((h, i) => {
                const sum = h.explain.terms.reduce((s, t) => s + t.score, 0) || 1;
                return (
                  <li key={h.doc.id} className="grid grid-cols-[1.25rem_1fr_3rem] gap-x-3 items-baseline">
                    <span className="font-mono text-xs text-muted">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="font-semibold leading-snug truncate">
                        {h.doc.title} <span className="fact font-normal">{h.doc.kind}</span>
                      </p>
                      <div className="mt-1.5 flex h-5 gap-px" style={{ width: `${Math.max(8, (h.score / best) * 100)}%` }}>
                        {/* Ink on paper never drops below 70%, or the label on it fails 4.5 : 1 in one of the two themes. */}
                        {h.explain.terms.map((t, k) => (
                          <span
                            key={t.term}
                            title={`${t.term}: ${t.score.toFixed(2)}`}
                            className="h-full overflow-hidden font-mono text-[0.7rem] leading-5 px-1 whitespace-nowrap text-background"
                            style={{ flex: `${t.score / sum} 1 0`, background: `rgb(var(--fg-rgb) / ${Math.max(0.7, 1 - k * 0.1)})` }}
                          >
                            {t.term}
                          </span>
                        ))}
                        {h.explain.terms.length === 0 && <span className="h-full flex-1 bg-fg" title="Listed because it matches the filter" />}
                      </div>
                      <p className="font-mono text-[0.7rem] text-muted mt-1">
                        {h.explain.terms.length === 0 ? "filter only, base 1" : scoreLine(h).base}
                        {h.explain.prior !== 1 ? ` × ${factor(h.explain.prior)} static rank` : ""}
                        {h.explain.phrases > 0 ? ` × ${factor(PHRASE_BONUS ** h.explain.phrases)} phrase` : ""}
                      </p>
                    </div>
                    <span className="font-mono text-xs text-right">{h.score.toFixed(2)}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </Stage>

        <Stage n={4} name="Plain BM25 ranks the same query differently." what="The same query through plain BM25 with nothing added, beside what the site runs. One query, both rankers.">
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
            <div>
              <p className="fact mb-1.5">Control: BM25 only, {control.hits.length} match{control.hits.length === 1 ? "" : "es"}</p>
              <ol className="border-b border-border">
                {control.hits.slice(0, TOP).map((h, i) => (
                  <li key={h.doc.id} className="border-t border-border py-1.5 grid grid-cols-[1.25rem_1fr] gap-x-2 text-[0.95rem]">
                    <span className="font-mono text-xs text-muted pt-1">{i + 1}</span>
                    <span className="truncate">{short(h.doc.title)}</span>
                  </li>
                ))}
                {control.hits.length === 0 && <li className="border-t border-border py-1.5 text-[0.95rem] text-muted">Nothing.</li>}
              </ol>
            </div>
            <div>
              <p className="fact mb-1.5">Treatment: what this site runs, {treatment.hits.length} match{treatment.hits.length === 1 ? "" : "es"}</p>
              <ol className="border-b border-border">
                {treatment.hits.slice(0, TOP).map((h, i) => {
                  const was = controlRank.get(h.doc.id);
                  const delta = was === undefined ? null : was - (i + 1);
                  return (
                    <li key={h.doc.id} className="border-t border-border py-1.5 grid grid-cols-[1.25rem_1fr_auto] gap-x-2 text-[0.95rem]">
                      <span className="font-mono text-xs text-muted pt-1">{i + 1}</span>
                      <span className="truncate">{short(h.doc.title)}</span>
                      <span className={`font-mono text-xs pt-1 ${delta === null || delta > 0 ? "text-ok" : delta < 0 ? "text-warn" : "text-muted"}`}>
                        {delta === null ? "new" : delta > 0 ? `up ${delta}` : delta < 0 ? `down ${-delta}` : "same"}
                      </span>
                    </li>
                  );
                })}
                {treatment.hits.length === 0 && <li className="border-t border-border py-1.5 text-[0.95rem] text-muted">Nothing.</li>}
              </ol>
            </div>
          </div>
        </Stage>
      </ol>
    </div>
  );
}
