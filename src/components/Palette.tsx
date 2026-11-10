"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { search, snippet, type SearchHit } from "@/lib/search";
import { useSearchIndex } from "@/lib/useSearchIndex";
import { setTheme, toggleTheme } from "@/lib/themeSwitch";
import { socialLinks } from "@/lib/data";
import { Marked, hrefFor } from "@/components/search/parts";

// Search on every page. Ctrl K or Cmd K opens it, as does the search button
// in the nav. With nothing typed it lists places to go and things to do; with
// a query it is the same engine as the home page, over the same index.

const OPEN_EVENT = "palette:open";

/** Open the palette from anywhere (the nav button uses this). */
export function openPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

interface Action {
  label: string;
  hint: string;
  run: () => void | Promise<void>;
}

const go = (href: string) => () => window.location.assign(href);

const ACTIONS: Action[] = [
  { label: "Work at eBay", hint: "Go to", run: go("/#work") },
  { label: "Projects", hint: "Go to", run: go("/#projects") },
  { label: "Check my fit against a job description", hint: "Go to", run: go("/#fit") },
  { label: "Notes", hint: "Go to", run: go("/notes/") },
  { label: "Resume", hint: "Go to", run: go(socialLinks.resume) },
  { label: "The engine room: how this search works", hint: "Go to", run: go("/engine/") },
  { label: "The design language", hint: "Go to", run: go("/design/") },
  { label: "Email me", hint: "Do", run: go(`mailto:${socialLinks.email}?subject=${encodeURIComponent("Hello from ritwickverma.dev")}`) },
  { label: "Copy my email address", hint: "Do", run: () => navigator.clipboard?.writeText(socialLinks.email) },
  { label: "Download the resume (PDF)", hint: "Do", run: go("/Ritwick_Verma_Resume.pdf") },
  { label: "Switch between light and dark", hint: "Do", run: () => void toggleTheme() },
  { label: "Follow my system's theme", hint: "Do", run: () => setTheme(null) },
];

const SHOWN = 8;

export default function Palette() {
  const { index } = useSearchIndex();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [selected, setSelected] = useState(0);

  const hits: SearchHit[] = useMemo(() => (text.trim() ? search(index, text).hits.slice(0, SHOWN) : []), [index, text]);
  const actions = useMemo(() => {
    const q = text.trim().toLowerCase();
    return q ? ACTIONS.filter((a) => a.label.toLowerCase().includes(q)) : ACTIONS;
  }, [text]);
  const count = hits.length + actions.length;

  const open = useCallback(() => {
    const d = dialogRef.current;
    if (!d || d.open) return;
    setText("");
    setSelected(0);
    d.showModal();
    inputRef.current?.focus();
  }, []);
  const close = useCallback(() => dialogRef.current?.close(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (dialogRef.current?.open) close();
        else open();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, open);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, open);
    };
  }, [open, close]);

  const choose = (i: number) => {
    if (i < hits.length) {
      close();
      window.location.assign(hrefFor(hits[i].doc, text));
    } else if (actions[i - hits.length]) {
      void actions[i - hits.length].run();
      close();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (count === 0) return;
      const next = (selected + (e.key === "ArrowDown" ? 1 : -1) + count) % count;
      setSelected(next);
      document.getElementById(`palette-${next}`)?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(selected);
    }
  };

  const row = "w-full text-left grid grid-cols-[5.5rem_1fr] gap-x-4 px-4 py-2.5 border-t border-border aria-selected:bg-fg aria-selected:text-background";

  return (
    <dialog
      ref={dialogRef}
      className="palette"
      aria-label="Search this site"
      onClick={(e) => {
        // A click on the backdrop lands on the dialog itself.
        if (e.target === dialogRef.current) close();
      }}
    >
      <div className="flex items-center gap-3 px-4 border-b-2 border-fg">
        <svg width="18" height="18" viewBox="0 0 22 22" fill="none" aria-hidden="true" className="shrink-0">
          <circle cx="9.5" cy="9.5" r="6.5" stroke="currentColor" strokeWidth="2" />
          <path d="M14.5 14.5 20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSelected(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search the record, the notes, or type a command"
          aria-label="Search the record, the notes, or type a command"
          aria-controls="palette-list"
          aria-activedescendant={count > 0 ? `palette-${selected}` : undefined}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          className="flex-1 min-w-0 bg-transparent py-3.5 text-lg outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
        />
        <kbd>Esc</kbd>
      </div>

      <ul id="palette-list" role="listbox" aria-label="Results" className="overflow-y-auto -mt-px">
        {hits.map((hit, i) => (
          <li key={hit.doc.id} role="option" id={`palette-${i}`} aria-selected={i === selected} className={`${row} group cursor-pointer`} onClick={() => choose(i)} onMouseMove={() => setSelected(i)}>
            <span className="fact group-aria-selected:text-background/70 pt-0.5">{hit.doc.kind}</span>
            <span className="min-w-0">
              <span className="block font-semibold leading-snug">
                <Marked text={hit.doc.title} stems={hit.matched} />
              </span>
              <span className="block text-[0.9rem] opacity-80 truncate">
                <Marked text={snippet(hit.doc.text, hit.matched, 110)} stems={hit.matched} />
              </span>
            </span>
          </li>
        ))}
        {actions.map((a, n) => {
          const i = hits.length + n;
          return (
            <li key={a.label} role="option" id={`palette-${i}`} aria-selected={i === selected} className={`${row} group cursor-pointer`} onClick={() => choose(i)} onMouseMove={() => setSelected(i)}>
              <span className="fact group-aria-selected:text-background/70">{a.hint}</span>
              <span>{a.label}</span>
            </li>
          );
        })}
        {count === 0 && <li className="px-4 py-6 border-t border-border">Nothing on this site matches “{text.trim()}”.</li>}
      </ul>

      <p className="fact !text-xs px-4 py-2 border-t border-border flex flex-wrap gap-x-4 gap-y-1 mt-auto">
        <span>
          <kbd>↑</kbd> <kbd>↓</kbd> move
        </span>
        <span>
          <kbd>Enter</kbd> open
        </span>
        <span>&quot;phrase&quot; -not kind:note tech:kotlin</span>
      </p>
    </dialog>
  );
}
