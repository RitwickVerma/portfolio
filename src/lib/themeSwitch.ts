// The theme switch, without React: the palette and the nav button both call it.
// The choice lives in localStorage and on <html data-theme>; with neither, the
// page follows the OS. The inline script in app/layout.tsx applies it before
// first paint.

export type Theme = "light" | "dark";

export function effectiveTheme(): Theme {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function setTheme(theme: Theme | null) {
  try {
    if (theme) localStorage.setItem("theme", theme);
    else localStorage.removeItem("theme");
  } catch {
    // Private mode: the choice lasts for this page only.
  }
  if (theme) document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
}

export function toggleTheme(): Theme {
  const next: Theme = effectiveTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}
