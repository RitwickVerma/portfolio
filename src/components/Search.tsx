"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { EXAMPLE_QUERIES, STARTING_POINTS } from "@/lib/corpus";
import { search, type DocKind, type SearchHit, type SearchResult } from "@/lib/search";
import { useSearchIndex, timed } from "@/lib/useSearchIndex";
import { CorpusMap, PlanChips, ResultRow, hrefFor } from "@/components/search/parts";

// The hero. A working search engine over everything on this site: type, and
// lib/search.ts parses, rewrites, retrieves and ranks in the browser. Before
// any JavaScript runs the box shows a fixed list of starting points, so the
// server HTML is already a complete page.

const SHOWN = 6;
/** Phones show fewer before "Show all": the record itself starts right below. */
const SHOWN_PHONE = 3;
/** Typed into the box once, on first load, unless the visitor gets there first. */
const DEMO_QUERY = "fitment";
const DEMO_START_MS = 1500;
const DEMO_KEY_MS = 95;

/** kind: value that selects exactly this facet. */
const FACET_FILTER: Record<DocKind, string> = {
  eBay: "ebay",
  "Earlier work": "work",
  Project: "project",
  Note: "note",
  Homelab: "lab",
  Skills: "skills",
  Education: "education",
  Page: "page",
};

type Run = { result: SearchResult; ms: number } | null;

export default function Search() {
  const { index, full, buildMs } = useSearchIndex();
  const starting = useMemo(
    () =>
      STARTING_POINTS.map((id) => index.docs.find((d) => d.id === id))
        .filter((d) => d !== undefined)
        .map((doc): SearchHit => ({ doc, score: 0, matched: [], explain: { terms: [], prior: 1, phrases: 0 } })),
    [index],
  );

  const [text, setText] = useState("");
  const [run, setRun] = useState<Run>(null);
  const [all, setAll] = useState(false);
  const [selected, setSelected] = useState(-1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  /** True once the visitor has touched the box; the demo never types over them. */
  const touched = useRef(false);
  const textRef = useRef("");

  const execute = useCallback(
    (query: string, { syncUrl = true } = {}) => {
      textRef.current = query;
      setText(query);
      setAll(false);
      setSelected(-1);
      setOpenId(null);
      if (!query.trim()) {
        setRun(null);
      } else {
        const { value, ms } = timed(() => search(index, query));
        setRun({ result: value, ms });
      }
      if (syncUrl) {
        // A query is a link: /?q=c%2B%2B opens with the results already ranked.
        const url = new URL(window.location.href);
        if (query.trim()) url.searchParams.set("q", query);
        else url.searchParams.delete("q");
        window.history.replaceState(window.history.state, "", url);
      }
    },
    [index],
  );

  // Timers set on mount must reach the current index, not the one they closed over.
  const executeRef = useRef(execute);
  useEffect(() => {
    executeRef.current = execute;
  }, [execute]);

  // When the notes' full text arrives, the query on screen is run again against it.
  useEffect(() => {
    if (!full || !textRef.current.trim()) return;
    const t = window.setTimeout(() => execute(textRef.current, { syncUrl: false }), 0);
    return () => window.clearTimeout(t);
  }, [full, execute]);

  // On load: honour ?q=, otherwise type one query as a demonstration.
  useEffect(() => {
    const timers: number[] = [];
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) {
      touched.current = true;
      timers.push(window.setTimeout(() => executeRef.current(q.slice(0, 120), { syncUrl: false }), 0));
    } else if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      for (let i = 1; i <= DEMO_QUERY.length; i++) {
        timers.push(
          window.setTimeout(() => {
            if (!touched.current) executeRef.current(DEMO_QUERY.slice(0, i), { syncUrl: false });
          }, DEMO_START_MS + i * DEMO_KEY_MS),
        );
      }
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  // "/" jumps to the box from anywhere that is not already taking keystrokes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement;
      if (el && el !== document.body) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const result = run?.result ?? null;
  const hits = result ? result.hits : starting;
  const top = result?.hits[0]?.score ?? 0;
  const visible = all ? hits : hits.slice(0, SHOWN);
  const respelled = result?.plan.filter((t) => t.source === "fuzzy") ?? [];
  const facets = result ? (Object.entries(result.facets) as [DocKind, number][]).sort((a, b) => b[1] - a[1]) : [];
  const facetTotal = facets.reduce((n, [, c]) => n + c, 0);
  const activeKinds = result?.parsed.kinds ?? [];

  const setKind = (kind: DocKind | null) => {
    touched.current = true;
    const bare = textRef.current.replace(/(^|\s)(kind|in):\S*/gi, " ").replace(/\s+/g, " ").trim();
    execute(kind ? `${bare} kind:${FACET_FILTER[kind]} `.trimStart() : `${bare} `);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (visible.length === 0) return;
      e.preventDefault();
      const next = e.key === "ArrowDown" ? Math.min(selected + 1, visible.length - 1) : Math.max(selected - 1, -1);
      setSelected(next);
      if (next >= 0) document.getElementById(`hit-${next}`)?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" && selected >= 0 && visible[selected]) {
      e.preventDefault();
      window.location.assign(hrefFor(visible[selected].doc, text));
    } else if (e.key === "Escape" && text) {
      e.preventDefault();
      execute("");
    }
  };

  return (
    <search className="block">
      <form
        role="search"
        onSubmit={(e) => e.preventDefault()}
        className="flex items-center gap-3 border-2 border-fg bg-background focus-within:border-accent transition-colors rounded-[var(--r-box)] px-4 sm:px-5"
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true" className="shrink-0">
          <circle cx="9.5" cy="9.5" r="6.5" stroke="currentColor" strokeWidth="2" />
          <path d="M14.5 14.5 20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
        </svg>
        <label htmlFor="q" className="sr-only">
          Search my record
        </label>
        <input
          ref={inputRef}
          id="q"
          name="q"
          type="search"
          value={text}
          onChange={(e) => {
            touched.current = true;
            execute(e.target.value);
          }}
          onFocus={() => (touched.current = true)}
          onKeyDown={onKeyDown}
          placeholder="Search my record"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="search"
          maxLength={120}
          aria-controls="hits"
          aria-activedescendant={selected >= 0 ? `hit-${selected}` : undefined}
          className="flex-1 min-w-0 bg-transparent py-4 sm:py-5 text-xl sm:text-2xl font-medium placeholder:text-muted placeholder:font-normal outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {text ? (
          <button
            type="button"
            onClick={() => {
              touched.current = true;
              execute("");
              inputRef.current?.focus();
            }}
            className="fact hover:text-fg px-2 py-2 -mr-2"
          >
            Clear
          </button>
        ) : (
          <kbd className="hidden sm:block" title="Press / to search">
            /
          </kbd>
        )}
      </form>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-1 gap-y-1">
        <span className="fact mr-2">Try</span>
        {EXAMPLE_QUERIES.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => {
              touched.current = true;
              execute(q);
            }}
            aria-pressed={text.trim().toLowerCase() === q}
            className="text-sm px-2 py-1 rounded-[var(--r-chip)] text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent aria-pressed:bg-hit aria-pressed:text-ink aria-pressed:no-underline"
          >
            {q}
          </button>
        ))}
        <button type="button" onClick={() => setHelp((h) => !h)} aria-expanded={help} className="fact ml-auto underline decoration-fg/30 underline-offset-4 hover:text-fg py-1">
          Query syntax
        </button>
      </div>

      {help && (
        <dl className="mt-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-3 border border-border rounded-[var(--r-box)] p-4 bg-surface text-[0.95rem]">
          {[
            ['"traffic replay"', "Those words, adjacent and in order."],
            ["replay -plutus", "Leave out anything that mentions the second word."],
            ["kind:note hdr", "Only one kind: work, ebay, project, note, lab, skills."],
            ["tech:kotlin", "Only things whose stack lists it."],
          ].map(([q, what]) => (
            <div key={q}>
              <dt>
                <button
                  type="button"
                  className="font-mono text-xs text-accent underline decoration-accent/40 underline-offset-4"
                  onClick={() => {
                    touched.current = true;
                    execute(`${q} `);
                  }}
                >
                  {q}
                </button>
              </dt>
              <dd className="text-fg/80 mt-0.5">{what}</dd>
            </div>
          ))}
          <p className="fact sm:col-span-2 lg:col-span-4">
            Arrow keys move through results, Enter opens one, Esc clears. <kbd>/</kbd> focuses this box and <kbd>Ctrl K</kbd> opens search on any page. Click a score to see how it was computed.
          </p>
        </dl>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {result ? `${result.hits.length} of ${result.total} documents match` : ""}
      </p>

      <div className="mt-6">
        <CorpusMap index={index} hits={result ? result.hits : []} />
        <p className="fact !text-xs mt-1 sm:hidden">One tick per document, grouped by kind. Lit ticks match.</p>
      </div>

      <div className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 pb-3 min-h-11">
          {result ? (
            <>
              <PlanChips plan={result.plan} parsed={result.parsed} />
              <p className="font-mono text-[0.7rem] text-muted">
                {result.hits.length} of {result.total} documents, {run!.ms < 0.01 ? "under 0.01" : run!.ms.toFixed(2)} ms, ranked in your browser
              </p>
            </>
          ) : (
            <p className="fact">Nothing typed yet. This is where I would start you:</p>
          )}
        </div>

        {respelled.length > 0 && (
          <p className="pb-3 text-[0.95rem]">
            Nothing here is spelt <span className="font-semibold">{[...new Set(respelled.map((t) => t.from))].join(", ")}</span>. Showing the nearest
            spelling: <mark>{respelled.map((t) => t.term).join(", ")}</mark>.
          </p>
        )}
        {result && result.parsed.unknownKinds.length > 0 && (
          <p className="pb-3 text-[0.95rem] text-warn">
            There is no kind called {result.parsed.unknownKinds.join(", ")}. Try work, ebay, project, note, lab or skills.
          </p>
        )}

        {facets.length > 1 || activeKinds.length > 0 ? (
          <div className="flex flex-wrap gap-x-1 gap-y-1 pb-3" role="group" aria-label="Narrow by kind">
            <button type="button" onClick={() => setKind(null)} aria-pressed={activeKinds.length === 0} className="fact px-2 py-1 rounded-[var(--r-chip)] hover:text-fg aria-pressed:bg-fg aria-pressed:text-background">
              All {facetTotal}
            </button>
            {facets.map(([kind, count]) => (
              <button
                key={kind}
                type="button"
                onClick={() => setKind(kind)}
                aria-pressed={activeKinds.includes(kind)}
                className="fact px-2 py-1 rounded-[var(--r-chip)] hover:text-fg aria-pressed:bg-fg aria-pressed:text-background"
              >
                {kind} {count}
              </button>
            ))}
          </div>
        ) : null}

        {result && hits.length === 0 ? (
          <p className="border-t border-border py-6 max-w-[60ch]">
            No document matches <span className="font-semibold">“{text.trim()}”</span>. The index holds only what is on this site, and the site holds
            only what I have done, so that is the honest answer.
          </p>
        ) : (
          <ol id="hits" className="border-b border-border">
            {visible.map((hit, i) => (
              <ResultRow
                key={hit.doc.id}
                id={`hit-${i}`}
                hit={hit}
                top={top}
                i={i}
                query={text}
                selected={i === selected}
                open={openId === hit.doc.id}
                onToggle={() => setOpenId((id) => (id === hit.doc.id ? null : hit.doc.id))}
                collapsed={!all && i >= SHOWN_PHONE}
              />
            ))}
          </ol>
        )}

        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-sm">
          {hits.length > SHOWN_PHONE && !all ? (
            <button type="button" onClick={() => setAll(true)} className={`link ${hits.length > SHOWN ? "" : "sm:invisible"}`}>
              Show all {hits.length} results
            </button>
          ) : (
            <span />
          )}
          <p className="fact">
            {index.docs.length} documents, {index.terms.length.toLocaleString("en-US")} terms
            {buildMs !== null ? `, indexed in this tab in ${buildMs.toFixed(1)} ms` : ""}.{" "}
            <Link href="/engine/" className="underline decoration-fg/30 underline-offset-4 hover:text-fg">
              Open the engine room
            </Link>
          </p>
        </div>
      </div>
    </search>
  );
}
