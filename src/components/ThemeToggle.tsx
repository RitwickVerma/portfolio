"use client";

import { toggleTheme } from "@/lib/themeSwitch";

/** Light or dark. Follows the OS until pressed; the palette can hand it back. */
export default function ThemeToggle() {
  return (
    <button
      type="button"
      onClick={() => toggleTheme()}
      aria-label="Switch between light and dark"
      title="Switch between light and dark"
      className="p-2 text-fg/70 hover:text-fg"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <circle cx="9" cy="9" r="7.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 1.75a7.25 7.25 0 0 1 0 14.5z" fill="currentColor" />
      </svg>
    </button>
  );
}
