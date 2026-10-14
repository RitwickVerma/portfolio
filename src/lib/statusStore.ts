"use client";

import { useSyncExternalStore } from "react";
import { parseStatus, freshness, STATUS_URL, type Status, type Freshness } from "./status";

// One fetch of /status.json per page load, shared by every reader through
// useSyncExternalStore. "none" is the normal state on a build that has no
// producer behind it: every reader then shows the static inventory.

export type StatusSnapshot =
  | { phase: "idle" | "loading" | "none"; status: null }
  | { phase: Freshness; status: Status };

let snapshot: StatusSnapshot = { phase: "idle", status: null };
const listeners = new Set<() => void>();
let started = false;

function set(next: StatusSnapshot) {
  snapshot = next;
  for (const l of listeners) l();
}

export function getStatusSnapshot(): StatusSnapshot {
  return snapshot;
}

const SERVER_SNAPSHOT: StatusSnapshot = { phase: "idle", status: null };

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Kick the fetch once; safe to call from several mounts. */
export function loadStatus(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  set({ phase: "loading", status: null });
  fetch(STATUS_URL, { cache: "no-store", headers: { Accept: "application/json" } })
    .then((r) => (r.ok ? r.json() : null))
    .then((json) => {
      const status = parseStatus(json);
      if (!status) {
        set({ phase: "none", status: null });
        return;
      }
      set({ phase: freshness(status), status });
    })
    .catch(() => set({ phase: "none", status: null }));
}

/** Test seam: reset the store between cases. */
export function _resetStatusStore(): void {
  started = false;
  set({ phase: "idle", status: null });
}

export function useStatus(): StatusSnapshot {
  return useSyncExternalStore(subscribe, getStatusSnapshot, () => SERVER_SNAPSHOT);
}
