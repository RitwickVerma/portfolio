"use client";

import { useEffect, useState } from "react";

/**
 * False on the server and during hydration, true once the browser is idle
 * (or `timeoutMs` has passed). Gate heavy lazy chunks on this so first paint
 * ships text and CSS only.
 */
export function useIdleReady(timeoutMs = 1000): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const go = () => setReady(true);
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(go, { timeout: timeoutMs });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(go, Math.min(timeoutMs, 300));
    return () => window.clearTimeout(id);
  }, [timeoutMs]);

  return ready;
}
