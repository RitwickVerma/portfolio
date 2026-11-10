"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { buildCorpus, EXAMPLE_QUERIES, STARTING_POINTS } from "@/lib/corpus";
import { buildIndex, search, highlight, snippet, tokenize, type SearchHit, type SearchResult, type PlanTerm } from "@/lib/search";

// The hero. A working search engine over everything on this site: type, and
// lib/search.ts tokenizes, rewrites, retrieves and ranks in the browser.
// Before any JavaScript runs the box shows a fixed list of starting points,
// so the server HTML is already a complete page.

const SHOWN = 6;
/** Phones show fewer before "Show all": the record itself starts right below. */
const SHOWN_PHONE = 3;
/** Typed into the box once, on first load, unless the visitor gets there first. */
const DEMO_QUERY = "fitment";
const DEMO_START_MS = 1500;
const DEMO_KEY_MS = 95;
/** A single run is below the clock's resolution; time a batch and divide. */
const TIMING_RUNS = 20;

type Run = { query: string; result: SearchResult; ms: number } | null;

function Marked({ text, stems }: { text: string; stems: string[] }) {
  return (
    <>
      {highlight(text, stems).map((seg, i) => (seg.hit ? <mark key={i}>{seg.text}</mark> : seg.text))}
    </>
  );
}

function ResultLink({ href, children }: { href: string; children: React.ReactNode }) {
  const cls = "link text-lg sm:text-xl font-semibold leading-snug";
  // Same-page anchors are plain links: only a native navigation updates :target,
  // which is what flashes the row you land on.
  if (href.startsWith("/#")) {
    return (
      <a href={href.slice(1)} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

function Row({ hit, top, i, collapsed }: { hit: SearchHit; top: number; i: number; collapsed: boolean }) {
  const { doc, score, matched } = hit;
  const shown = snippet(doc.text, matched);
  // A match on something the row does not print (the stack, a tag) is named, so no result looks unexplained.
  const visible = [doc.title, doc.context, shown].some((t) => highlight(t, matched).some((s) => s.hit));
  const unseen = visible ? [] : (doc.keywords ?? []).filter((k) => tokenize(k).some((t) => matched.includes(t)));
  return (
    <li
      className={`rank-in ${collapsed ? "max-sm:hidden" : ""} grid grid-cols-[1fr_auto] sm:grid-cols-[7.5rem_1fr_auto] gap-x-6 gap-y-1 py-4 border-t border-border`}
      style={{ "--i": i } as CSSProperties}
    >
      <p className="wd-narrow text-sm text-muted sm:pt-1.5 col-span-2 sm:col-span-1">{doc.kind}</p>
      <div className="min-w-0">
        <h3>
          <ResultLink href={doc.href}>
            <Marked text={doc.title} stems={matched} />
          </ResultLink>
        </h3>
        <p className="wd-narrow text-sm text-muted mt-0.5">
          <Marked text={doc.context} stems={matched} />
        </p>
        <p className="mt-1.5 text-fg/85 max-w-[68ch]">
          <Marked text={shown} stems={matched} />
        </p>
        {unseen.length > 0 && (
          <p className="wd-narrow text-sm text-muted mt-1.5">
            Matches on{" "}
            {unseen.map((k, n) => (
              <span key={k}>
                {n > 0 ? ", " : ""}
                <mark>{k}</mark>
              </span>
            ))}
          </p>
        )}
      </div>
      {top > 0 && (
        <div className="hidden sm:block w-16 pt-2" title={`BM25 score ${score.toFixed(3)}`}>
          <p className="font-mono text-xs text-muted text-right">{score.toFixed(2)}</p>
          <div className="mt-1.5 h-[3px] bg-fg/10">
            <div className="h-full bg-fg origin-left" style={{ width: `${Math.max(4, (score / top) * 100)}%` }} />
          </div>
        </div>
      )}
    </li>
  );
}

function Plan({ plan }: { plan: PlanTerm[] }) {
  const style: Record<PlanTerm["source"], string> = {
    typed: "border-fg text-fg",
    rewrite: "border-dashed border-fg/50 text-fg/80",
    prefix: "border-dotted border-fg/50 text-fg/80",
  };
  const how: Record<PlanTerm["source"], (t: PlanTerm) => string> = {
    typed: () => "from your query",
    rewrite: (t) => `added by the rewriter for “${t.from}”`,
    prefix: (t) => `completes “${t.from}”`,
  };
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Query plan: the terms searched for">
      {plan.map((t) => (
        <li
          key={t.term}
          title={`${t.term}: ${how[t.source](t)}, in ${t.df} document${t.df === 1 ? "" : "s"}, weight ${t.weight}`}
          className={`font-mono text-[0.7rem] leading-none px-1.5 py-1.5 border rounded-[3px] ${style[t.source]} ${t.df === 0 ? "line-through opacity-60" : ""}`}
        >
          {t.term}
          <span className="text-muted ml-1.5">{t.df}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Search() {
  const index = useMemo(() => buildIndex(buildCorpus()), []);
  const starting = useMemo(
    () =>
      STARTING_POINTS.map((id) => index.docs.find((d) => d.id === id))
        .filter((d) => d !== undefined)
        .map((doc) => ({ doc, score: 0, matched: [] as string[] })),
    [index],
  );

  const [text, setText] = useState("");
  const [run, setRun] = useState<Run>(null);
  const [all, setAll] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  /** True once the visitor has touched the box; the demo never types over them. */
  const touched = useRef(false);

  const execute = useCallback(
    (query: string, { syncUrl = true } = {}) => {
      setText(query);
      setAll(false);
      if (!query.trim()) {
        setRun(null);
      } else {
        const t0 = performance.now();
        let result = search(index, query);
        for (let i = 1; i < TIMING_RUNS; i++) result = search(index, query);
        setRun({ query, result, ms: (performance.now() - t0) / TIMING_RUNS });
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

  // On load: honour ?q=, otherwise type one query as a demonstration.
  useEffect(() => {
    const timers: number[] = [];
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) {
      touched.current = true;
      timers.push(window.setTimeout(() => execute(q.slice(0, 80), { syncUrl: false }), 0));
    } else if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      for (let i = 1; i <= DEMO_QUERY.length; i++) {
        timers.push(
          window.setTimeout(() => {
            if (!touched.current) execute(DEMO_QUERY.slice(0, i), { syncUrl: false });
          }, DEMO_START_MS + i * DEMO_KEY_MS),
        );
      }
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [execute]);

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

  const hits = run ? run.result.hits : starting;
  const top = run?.result.hits[0]?.score ?? 0;
  const visible = all ? hits : hits.slice(0, SHOWN);
  const live = run
    ? `${run.result.hits.length} of ${run.result.total} documents match ${run.query}`
    : "";

  return (
    <search className="block">
      <form
        role="search"
        onSubmit={(e) => e.preventDefault()}
        className="flex items-center gap-3 border-2 border-fg bg-background focus-within:border-accent transition-colors rounded-md px-4 sm:px-5"
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
          placeholder="Search my record"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="search"
          maxLength={80}
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
            className="wd-narrow text-sm text-muted hover:text-fg px-2 py-2 -mr-2"
          >
            Clear
          </button>
        ) : (
          <kbd className="hidden sm:block font-mono text-xs text-muted border border-border rounded-[3px] px-1.5 py-1" title="Press / to search">
            /
          </kbd>
        )}
      </form>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-1 gap-y-1">
        <span className="wd-narrow text-sm text-muted mr-2">Try</span>
        {EXAMPLE_QUERIES.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => {
              touched.current = true;
              execute(q);
            }}
            aria-pressed={text.trim().toLowerCase() === q}
            className="text-sm px-2 py-1 rounded-[3px] text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent aria-pressed:bg-hit aria-pressed:text-ink aria-pressed:no-underline"
          >
            {q}
          </button>
        ))}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {live}
      </p>

      <div className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 pb-3 min-h-11">
          {run ? (
            <>
              <Plan plan={run.result.plan} />
              <p className="font-mono text-[0.7rem] text-muted">
                {run.result.hits.length} of {run.result.total} documents, {run.ms < 0.01 ? "under 0.01" : run.ms.toFixed(2)} ms, ranked by BM25 in
                your browser
              </p>
            </>
          ) : (
            <p className="wd-narrow text-sm text-muted">Nothing typed yet. This is where I would start you:</p>
          )}
        </div>

        {run && hits.length === 0 ? (
          <p className="border-t border-border py-6 max-w-[60ch]">
            No document matches <span className="font-semibold">“{run.query.trim()}”</span>. The index holds only what is on this
            site, and the site holds only what I have done, so that is the honest answer.
          </p>
        ) : (
          <ol className="border-b border-border">
            {visible.map((hit, i) => (
              <Row key={hit.doc.id} hit={hit} top={top} i={i} collapsed={!all && i >= SHOWN_PHONE} />
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
          <Link href="/notes/colophon/#the-search-box" className="wd-narrow text-muted hover:text-fg underline decoration-fg/30 underline-offset-4">
            How this search works
          </Link>
        </div>
      </div>
    </search>
  );
}
