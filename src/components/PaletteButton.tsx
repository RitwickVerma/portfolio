"use client";

import { openPalette } from "@/components/Palette";

/** The nav's way into search on pages that have no search box of their own. */
export default function PaletteButton() {
  return (
    <button type="button" onClick={openPalette} aria-label="Search this site" title="Search (Ctrl K)" className="flex items-center gap-2 p-2 text-fg/70 hover:text-fg">
      <svg width="18" height="18" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <circle cx="9.5" cy="9.5" r="6.5" stroke="currentColor" strokeWidth="2" />
        <path d="M14.5 14.5 20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
      </svg>
      <kbd className="hidden lg:block">Ctrl K</kbd>
    </button>
  );
}
