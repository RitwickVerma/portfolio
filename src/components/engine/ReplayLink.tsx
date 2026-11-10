"use client";

import { XRAY_EVENT } from "@/components/engine/XRay";

/**
 * A query in the replay table. The X-ray is on the same page, so a plain click
 * hands it the query and scrolls there; a new tab or a copied link still opens
 * /engine/?q=... on its own. The query goes in as the replay ran it: finished,
 * with a trailing space, so completing a half-typed word does not change the
 * ranking the table is reporting.
 */
export default function ReplayLink({ query }: { query: string }) {
  const finished = `${query} `;
  return (
    <a
      href={`/engine/?q=${encodeURIComponent(finished)}#xray`}
      className="font-mono text-xs link"
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        window.dispatchEvent(new CustomEvent(XRAY_EVENT, { detail: finished }));
        document.getElementById("xray")?.scrollIntoView();
      }}
    >
      {query}
    </a>
  );
}
