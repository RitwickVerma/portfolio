"use client";

import { useEffect, useSyncExternalStore } from "react";
import { buildCorpus, type NoteText } from "./corpus";
import { buildIndex, type SearchIndex } from "./search";

// One index per tab, shared by the hero box, the command palette, the fit
// check and the engine room. It starts as the record alone, which is what the
// server rendered against, then fetches the notes' full text once the browser
// is idle and rebuilds. A failed fetch changes nothing: the record still works.

export interface IndexState {
  index: SearchIndex;
  /** True once the notes' sections are in. */
  full: boolean;
  /** How long the last build took in this tab, in ms. Null on the server and before the first client build. */
  buildMs: number | null;
}

const SERVER: IndexState = { index: buildIndex(buildCorpus()), full: false, buildMs: null };
let state: IndexState = SERVER;
let started = false;
const listeners = new Set<() => void>();

function load() {
  if (started) return;
  started = true;
  fetch("/search-index.json")
    .then((r) => (r.ok ? (r.json() as Promise<NoteText[]>) : Promise.reject(new Error(String(r.status)))))
    .then((texts) => {
      const t0 = performance.now();
      const index = buildIndex(buildCorpus(texts));
      state = { index, full: true, buildMs: performance.now() - t0 };
      for (const l of listeners) l();
    })
    .catch(() => {
      // Stay on the record-only index, and let the next mount try again.
      started = false;
    });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSearchIndex(): IndexState {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER,
  );
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
    idle(load);
  }, []);
  return snapshot;
}

/** Time `fn` by running it `runs` times: one run is below the clock's resolution. Call from an event handler or effect, never during render. */
export function timed<T>(fn: () => T, runs = 20): { value: T; ms: number } {
  const t0 = performance.now();
  let value = fn();
  for (let i = 1; i < runs; i++) value = fn();
  return { value, ms: (performance.now() - t0) / runs };
}
