// The rules of the hero box that do not touch the DOM, so they can be tested as plain functions.

/** Rows listed before "Show all" on a wide screen. */
export const SHOWN = 6;
/** Phones show fewer before "Show all": the record itself starts right below. */
export const SHOWN_PHONE = 3;

/** How many result rows a visitor can see: Show all reveals every hit, otherwise it depends on the width. */
export function rowsInView(hits: number, all: boolean, wide: boolean): number {
  if (all) return hits;
  return Math.min(hits, wide ? SHOWN : SHOWN_PHONE);
}

/** Where an arrow key takes the selection (-1 is the box itself), never past the rows that can be seen. */
export function nextSelection(selected: number, key: "ArrowDown" | "ArrowUp", rows: number): number {
  if (rows <= 0) return -1;
  const at = Math.min(selected, rows - 1);
  return key === "ArrowDown" ? Math.min(at + 1, rows - 1) : Math.max(at - 1, -1);
}

/** The first row that "Show all" reveals at this width: where focus goes once the button is gone. */
export function firstRevealed(wide: boolean): number {
  return wide ? SHOWN : SHOWN_PHONE;
}

/** After the same query is ranked again, the selected document's new row, or -1 when it is gone or out of sight. */
export function reselect(ids: string[], selectedId: string | null, rows: number): number {
  if (selectedId === null) return -1;
  const at = ids.indexOf(selectedId);
  return at >= 0 && at < rows ? at : -1;
}

/**
 * Whether a key in the box takes the first completion: Tab or ArrowRight with the caret at the very end
 * (nothing selected, no modifier, no result row chosen), and a completion on offer. Anything else keeps
 * its usual job, so Tab still leaves the box when there is nothing to complete and Shift+Tab always does.
 */
export function takesCompletion(
  key: string,
  caret: { start: number | null; end: number | null; length: number },
  offered: number,
  mods: { shift?: boolean; ctrl?: boolean; meta?: boolean; alt?: boolean; composing?: boolean } = {},
  selectedRow = -1,
): boolean {
  if (key !== "Tab" && key !== "ArrowRight") return false;
  if (offered <= 0 || selectedRow >= 0) return false;
  if (mods.shift || mods.ctrl || mods.meta || mods.alt || mods.composing) return false;
  return caret.start === caret.length && caret.end === caret.length;
}

/** The tokenizer builds these out of punctuation; a visitor reads what they typed. */
export const AS_TYPED: Record<string, string> = { cpp: "C++", csharp: "C#", dotnet: ".NET" };

/**
 * The word a term is shown as: the form the corpus uses most (index.forms, commonest first), never the stem
 * ("mani", "queri"). The three terms built from punctuation are spelled as typed. Falls back to the term
 * itself only when no indexed word produced it (a respelling nothing matched, a filter on an unknown stack).
 */
export function surfaceWord(forms: ReadonlyMap<string, string[]>, term: string): string {
  return AS_TYPED[term] ?? forms.get(term)?.[0] ?? term;
}
