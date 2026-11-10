"use client";

import { useEffect, useState } from "react";
import { parseQuery, tokenize, WORD } from "@/lib/search";

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
    // The section whose heading is the last one at or above a line just under
    // the sticky nav, so a link that lands a heading there marks that heading.
    // (An observer band marked the wrong one when two short sections sat in it.)
    // At the very end of the page the last headings cannot reach the line, so
    // the line drops to mid-window and the final section can be the current one.
    let frame = 0;
    const update = () => {
      frame = 0;
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      const line = atEnd ? window.innerHeight * 0.5 : 120;
      let current: string | null = null;
      for (const t of targets) {
        if (t.getBoundingClientRect().top > line) break;
        current = t.id;
      }
      setActive(current);
    };
    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
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
