"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { EXAMPLE_QUERIES, STARTING_POINTS } from "@/lib/corpus";
import { completions, applyCompletion, type Completion } from "@/lib/complete";
import { search, type DocKind, type SearchHit, type SearchResult } from "@/lib/search";
import { answers } from "@/lib/answers";
import { understand } from "@/lib/understanding";
import { BUILD_DATE } from "@/lib/data";
import { useSearchIndex, timed } from "@/lib/useSearchIndex";
import { CorpusMap, PlanChips, ResultRow, hrefFor } from "@/components/search/parts";
import { AnswerRow } from "@/components/search/AnswerRow";
import { UnderstandingLine } from "@/components/search/Understanding";
import { SHOWN, SHOWN_PHONE, rowsInView, nextSelection, firstRevealed, reselect, takesCompletion } from "@/lib/searchUi";

// The hero. A working search engine over everything on this site: type, and
// lib/search.ts parses, rewrites, retrieves and ranks in the browser. Before
// any JavaScript runs the box shows a fixed list of starting points, so the
// server HTML is already a complete page.

/** Tailwind's `sm`: from here up the rows list SHOWN before "Show all", below it SHOWN_PHONE. */
const WIDE = "(min-width: 40rem)";
const subscribeWide = (notify: () => void) => {
  const m = window.matchMedia(WIDE);
  m.addEventListener("change", notify);
  return () => m.removeEventListener("change", notify);
};
const isWide = () => window.matchMedia(WIDE).matches;
/** Typed into the box once, on first load, unless the visitor gets there first. */
const DEMO_QUERY = "fitment";
const DEMO_START_MS = 1500;
const DEMO_KEY_MS = 95;

/** kind: value that selects exactly this facet. */
const FACET_FILTER: Record<DocKind, string> = {
  eBay: "ebay",
  "Earlier work": "earlier",
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
  const [selectedRaw, setSelected] = useState(-1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  /** True while the demo has typed part of its word: completions would flash and move the page under it. */
  const [demoing, setDemoing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  /** True once the visitor has touched the box; the demo never types over them. */
  const touched = useRef(false);
  /** True while the demo has typed only part of its query. */
  const demoPartial = useRef(false);
  const textRef = useRef("");
  /** Which row has the arrow-key selection, by document, and how many rows can be seen: what a re-rank must keep. */
  const selectedId = useRef<string | null>(null);
  const rowsSeen = useRef(0);
  /** The row to focus once "Show all" has drawn the rest of the list. */
  const focusRow = useRef<number | null>(null);
  const wide = useSyncExternalStore(subscribeWide, isWide, () => true);

  const execute = useCallback(
    (query: string, { syncUrl = true, keep = false } = {}) => {
      textRef.current = query;
      setText(query);
      // A new query starts over; the same query ranked again (the full index arrived) keeps what the visitor did.
      if (!keep) {
        setAll(false);
        setSelected(-1);
        setOpenId(null);
      }
      if (!query.trim()) {
        setRun(null);
      } else {
        const { value, ms } = timed(() => search(index, query));
        setRun({ result: value, ms });
        if (keep) setSelected(reselect(value.hits.map((h) => h.doc.id), selectedId.current, rowsSeen.current));
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

  /**
   * The visitor takes the box. If the demo was part-way through its query, the
   * half-typed text and its results go (the URL was never touched), so what
   * they type is not appended to "fit". A finished demo query stays.
   */
  const take = useCallback(() => {
    touched.current = true;
    if (demoPartial.current) {
      demoPartial.current = false;
      setDemoing(false);
      executeRef.current("", { syncUrl: false });
    }
  }, []);

  // When the notes' full text arrives, the query on screen is run again against it.
  useEffect(() => {
    // Not while the demo is part-way through its word: the box holds "fit", and ranking that would
    // re-flow the list the demo is careful to rank only once. The demo's last key ranks on the full index.
    if (!full || !textRef.current.trim() || demoPartial.current) return;
    const t = window.setTimeout(() => execute(textRef.current, { syncUrl: false, keep: true }), 0);
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
      // The keys appear in the box one at a time, but the results are ranked once, on the
      // last key. Re-ranking on every key re-flowed the list, the facet row and the footer
      // eight times in the first screenful (CLS 0.21); the box still fills letter by letter.
      for (let i = 1; i <= DEMO_QUERY.length; i++) {
        timers.push(
          window.setTimeout(() => {
            if (touched.current) return;
            const typed = DEMO_QUERY.slice(0, i);
            demoPartial.current = i < DEMO_QUERY.length;
            setDemoing(demoPartial.current);
            if (demoPartial.current) {
              textRef.current = typed;
              setText(typed);
            } else {
              executeRef.current(typed, { syncUrl: false });
            }
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
  /** What can be seen at this width: the phone hides rows the list still holds. */
  const rows = rowsInView(hits.length, all, wide);
  // The selection, kept inside the rows on screen: rotating a phone or the full index arriving can leave fewer rows than the index held.
  const selected = Math.min(selectedRaw, rows - 1);
  // Computed as of the build, the date the rest of the page counts its own dates to; neither touches the ranking.
  const answer = useMemo(() => (result ? answers(result.query, BUILD_DATE) : null), [result]);
  const understood = useMemo(() => (result ? understand(index, result, answer) : []), [index, result, answer]);
  const facets = result ? (Object.entries(result.facets) as [DocKind, number][]).sort((a, b) => b[1] - a[1]) : [];
  const facetTotal = facets.reduce((n, [, c]) => n + c, 0);
  const activeKinds = result?.parsed.kinds ?? [];
  // Words that finish the one being typed, from the index's own vocabulary.
  const offered = useMemo(() => (demoing ? [] : completions(index, text)), [index, text, demoing]);
  const offeredNote = offered.length > 0 ? `${offered.length} ${offered.length === 1 ? "completion" : "completions"}: ${offered.map((c) => c.word).join(", ")}. Tab takes ${offered[0].word}.` : "";

  useEffect(() => {
    selectedId.current = selected >= 0 ? (visible[selected]?.doc.id ?? null) : null;
    rowsSeen.current = rows;
  });

  // "Show all" removes the button that had focus; the first row it reveals takes it.
  useEffect(() => {
    if (!all || focusRow.current === null) return;
    const row = focusRow.current;
    focusRow.current = null;
    document.querySelector<HTMLElement>(`#hit-${row} a`)?.focus();
  }, [all]);

  const setKind = (kind: DocKind | null) => {
    take();
    // Drop any kind filter already there, a negated one included ("-kind:note" would otherwise survive
    // and exclude the words "kind" and "note").
    let bare = textRef.current.replace(/(^|\s)-?(kind|in):\S*/gi, " ").replace(/\s+/g, " ").trim();
    // An unclosed quote would swallow the filter into the phrase: close it first.
    if ((bare.match(/"/g) ?? []).length % 2 === 1) bare += '"';
    execute(kind ? `${bare} kind:${FACET_FILTER[kind]} `.trimStart() : `${bare} `);
    inputRef.current?.focus();
  };

  const accept = (c: Completion) => {
    take();
    execute(applyCompletion(textRef.current, c.word));
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const box = e.currentTarget;
    const caret = { start: box.selectionStart, end: box.selectionEnd, length: box.value.length };
    const mods = { shift: e.shiftKey, ctrl: e.ctrlKey, meta: e.metaKey, alt: e.altKey, composing: e.nativeEvent.isComposing };
    if (takesCompletion(e.key, caret, offered.length, mods, selected)) {
      e.preventDefault();
      accept(offered[0]);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (rows === 0) return;
      e.preventDefault();
      const next = nextSelection(selected, e.key, rows);
      setSelected(next);
      if (next >= 0) document.getElementById(`hit-${next}`)?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" && selected >= 0 && visible[selected]) {
      e.preventDefault();
      window.location.assign(hrefFor(visible[selected].doc, text));
    } else if (e.key === "Escape" && text) {
      e.preventDefault();
      execute("");
    } else if (e.key === "Escape" && selected >= 0) {
      // Nothing typed, but a starting point is selected: Esc lets go of it.
      e.preventDefault();
      setSelected(-1);
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
            // Typing before focus is seen (assistive tech, autofill) must not append to the demo's partial text.
            const demoText = demoPartial.current ? textRef.current : "";
            take();
            const v = e.target.value;
            execute(demoText && v.startsWith(demoText) ? v.slice(demoText.length) : v);
          }}
          onFocus={take}
          onKeyDown={onKeyDown}
          placeholder="Search my record"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="search"
          maxLength={120}
          aria-controls="hits"
          className="flex-1 min-w-0 bg-transparent py-4 sm:py-5 text-xl sm:text-2xl font-medium placeholder:text-muted placeholder:font-normal outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {text ? (
          <button
            type="button"
            onClick={() => {
              take();
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

      {offered.length > 0 && (
        <div role="group" aria-label="Complete the word" className="mt-3 flex flex-wrap items-baseline gap-x-1 gap-y-1">
          <span className="fact mr-2" aria-hidden="true">
            Complete
          </span>
          {offered.map((c) => (
            <button
              key={c.term}
              type="button"
              onClick={() => accept(c)}
              className="text-sm px-2 py-1 rounded-[var(--r-chip)] text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
            >
              {c.word}
            </button>
          ))}
          <kbd className="hidden sm:inline ml-1" title="Tab or the right arrow at the end of the box takes the first">
            Tab
          </kbd>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-baseline gap-x-1 gap-y-1">
        <span className="fact mr-2">Try</span>
        {EXAMPLE_QUERIES.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => {
              take();
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
                    take();
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
            Arrow keys move through results, Enter opens one, Esc clears. <kbd>/</kbd> focuses this box and <kbd>Ctrl K</kbd> opens search on any page. Press Why? under a result to see how its score was computed.
          </p>
        </dl>
      )}

      {/* Not role=status: the results line below is the page's one status. */}
      <p className="sr-only" aria-live="polite" data-testid="completion-status">
        {offeredNote}
      </p>

      <p className="sr-only" role="status" aria-live="polite">
        {selected >= 0 && visible[selected]
          ? `Result ${selected + 1} of ${rows}: ${visible[selected].doc.title}. Enter opens it.`
          : result
            ? `${answer ? `Answer: ${answer.answer} ` : ""}${result.hits.length} of ${result.total} documents match`
            : ""}
      </p>

      {/* The line keeps its room when empty, so what the engine did with the words never moves the page. */}
      <UnderstandingLine items={understood} query={result?.query ?? ""} />
      {answer && <AnswerRow answer={answer} />}

      <div className="mt-3">
        <CorpusMap index={index} hits={result ? result.hits : []} />
        <p className="fact !text-xs mt-1 sm:hidden">One tick per document, grouped by kind. Lit ticks match.</p>
      </div>

      <div className="mt-5">
        {/* The height is reserved for the plan and stats line a result puts here (two lines on a phone), so the list does not move when the demo ranks. */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 pb-3 min-h-11 max-sm:min-h-[5.0625rem]">
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

        {result && result.parsed.unknownKinds.length > 0 && (
          <p className="pb-3 text-[0.95rem] text-warn">
            There is no kind called {result.parsed.unknownKinds.join(", ")}. Try work, ebay, earlier, project, note, lab, skills, education or page.
          </p>
        )}

        {facets.length > 1 || activeKinds.length > 0 ? (
          <div className="flex flex-wrap gap-x-1 gap-y-1 pb-3" role="group" aria-label="Narrow by kind">
            <button type="button" onClick={() => setKind(null)} aria-pressed={activeKinds.length === 0} className="fact px-2 py-1 rounded-[var(--r-chip)] hover:text-fg aria-pressed:bg-fg aria-pressed:!text-background">
              All {facetTotal}
            </button>
            {facets.map(([kind, count]) => (
              <button
                key={kind}
                type="button"
                onClick={() => setKind(kind)}
                aria-pressed={activeKinds.includes(kind)}
                className="fact px-2 py-1 rounded-[var(--r-chip)] hover:text-fg aria-pressed:bg-fg aria-pressed:!text-background"
              >
                {kind} {count}
              </button>
            ))}
          </div>
        ) : result ? null : (
          // Idle: the room the facet row takes once there is a result, kept empty so the list stays put.
          <div className="h-11" aria-hidden="true" />
        )}

        {result && hits.length === 0 && (
          <p className="border-t border-border py-6 max-w-[60ch]">
            No document matches <span className="font-semibold [overflow-wrap:anywhere]">“{text.trim()}”</span>. The index holds only what is on this site, and the site holds
            only what I have done, so that is the honest answer.
          </p>
        )}
        {/* Result titles are h3; this keeps the outline from jumping from h1 straight to them. */}
        {hits.length > 0 && <h2 className="sr-only">{result ? "Search results" : "Starting points"}</h2>}
        {/* Always in the page, so the box's aria-controls names something; empty, it takes no room. */}
        <ol id="hits" className="border-b border-border empty:hidden">
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

        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-sm">
          {hits.length > SHOWN_PHONE && !all ? (
            <button
              type="button"
              onClick={() => {
                focusRow.current = firstRevealed(wide);
                setAll(true);
              }}
              className={`link ${hits.length > SHOWN ? "" : "sm:invisible"}`}>
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
