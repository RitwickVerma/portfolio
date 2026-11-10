"use client";

import { useEffect, useState } from "react";
import { parseQuery, tokenize } from "@/lib/search";

// Two things a note gains in the browser. The contents rail follows the
// section you are reading. And when you arrive from a search result, the
// words that matched are highlighted in the text, with the CSS Custom
// Highlight API, so the note's markup is never touched.

export interface Heading {
  id: string;
  text: string;
  depth: 2 | 3;
}

export function NoteContents({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const targets = headings.map((h) => document.getElementById(h.id)).filter((el) => el !== null);
    if (targets.length === 0) return;
    // The section whose heading most recently crossed the top third of the window.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-10% 0px -65% 0px" },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, [headings]);

  return (
    <nav aria-label="In this note" className="text-[0.95rem]">
      <p className="fact mb-2">In this note</p>
      <ul className="border-l border-border">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              aria-current={active === h.id ? "location" : undefined}
              className={`block py-1 -ml-px border-l-2 border-transparent text-fg/70 hover:text-fg aria-[current]:border-fg aria-[current]:text-fg aria-[current]:font-semibold ${h.depth === 3 ? "pl-7" : "pl-4"}`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

const WORD = /[A-Za-z0-9]+(?:,\d{3})*(?:\+\+|#)?/g;

export function NoteHighlights() {
  const [words, setWords] = useState("");
  const [count, setCount] = useState(0);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    const root = document.querySelector(".note");
    if (!q || !root || typeof Highlight === "undefined" || !CSS.highlights) return;
    const parsed = parseQuery(`${q} `);
    const stems = new Set([...parsed.terms, ...parsed.phrases.flat()]);
    if (stems.size === 0) return;

    const ranges: Range[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent ?? "";
      for (const m of text.matchAll(WORD)) {
        if (!tokenize(m[0]).some((t) => stems.has(t))) continue;
        const range = new Range();
        range.setStart(node, m.index);
        range.setEnd(node, m.index + m[0].length);
        ranges.push(range);
      }
    }
    if (ranges.length === 0) return;
    CSS.highlights.set("search-hit", new Highlight(...ranges));
    const t = window.setTimeout(() => {
      // Shown as typed, without the operators.
      setWords(q.replace(/(^|\s)(kind|in|tech|stack):\S*/gi, " ").replace(/(^|\s)-\S+/g, " ").replace(/"/g, "").replace(/\s+/g, " ").trim());
      setCount(ranges.length);
      // With no section in the link, go to the first match.
      if (!window.location.hash) ranges[0].startContainer.parentElement?.scrollIntoView({ block: "center" });
    }, 0);
    return () => {
      window.clearTimeout(t);
      CSS.highlights.delete("search-hit");
    };
  }, []);

  if (count === 0) return null;
  return (
    <p className="sticky top-14 z-10 -mx-3 mb-6 px-3 py-2 bg-hit text-ink rounded-[var(--r-chip)] text-[0.95rem] flex flex-wrap items-baseline justify-between gap-x-4" role="status">
      <span>
        {count} match{count === 1 ? "" : "es"} for <span className="font-semibold">{words}</span> highlighted in this note.
      </span>
      <button
        type="button"
        className="underline underline-offset-4"
        onClick={() => {
          CSS.highlights.delete("search-hit");
          setCount(0);
        }}
      >
        Clear
      </button>
    </p>
  );
}
