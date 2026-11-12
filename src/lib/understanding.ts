import { isQuestionWord, type Answer } from "./answers";
import { KIND_ALIASES, analyze, type PlanTerm, type SearchIndex, type SearchResult, tokenize } from "./search";

// The one line under the box that says what the engine did with the words, and says nothing when it did
// nothing. It reads the plan search() already made (rewrites, respellings) and the parsed query (filters,
// phrases, exclusions), and knows whether an answer row is showing; it ranks nothing and changes nothing. Pure: Search.tsx
// draws the list this returns.

export type UnderstandingKind = "respell" | "rewrite" | "filter" | "phrase" | "exclude";

export interface Understanding {
  label: string;
  kind: UnderstandingKind;
  /** For a respelling: the words the engine searched for instead, so the line can mark them as the match. */
  found?: string;
}

/** The tokenizer builds these out of punctuation; a visitor reads what they typed. */
const AS_TYPED: Record<string, string> = { cpp: "C++", csharp: "C#", dotnet: ".NET" };

/** Most terms a rewrite may name before the line says "and N more": it is one line. */
export const MAX_NAMED = 3;

/** The kind: value that selects exactly these kinds, as a visitor would type it ("project", "work"). */
function filterValue(kinds: string[]): string {
  const want = [...kinds].sort().join("|");
  for (const [alias, set] of Object.entries(KIND_ALIASES)) if ([...set].sort().join("|") === want) return alias;
  return kinds.join("+").toLowerCase();
}

/** Each quoted phrase as typed, leaving out the ones after a minus. */
function typedPhrases(query: string): string[] {
  const rest = query.replace(/(^|\s)-"[^"]*"?/g, "$1 ");
  const out: string[] = [];
  for (const m of rest.matchAll(/"([^"]*)"?/g)) if (tokenize(m[1]).length > 0) out.push(m[1].trim().replace(/\s+/g, " "));
  return out;
}

/**
 * What the engine did with this query, in the order a reader would want it: how it read the question, then
 * each respelling, rewrite, filter, phrase and exclusion. Empty when it did none of them.
 */
export function understand(index: SearchIndex, result: SearchResult, answer: Answer | null): Understanding[] {
  const out: Understanding[] = [];
  // The word as the visitor typed it, for each term it became.
  const typed = new Map<string, string>();
  for (const a of analyze(result.query)) if (!typed.has(a.term)) typed.set(a.term, AS_TYPED[a.term] ?? a.word);
  const typedWord = (term: string) => typed.get(term) ?? AS_TYPED[term] ?? index.forms.get(term)?.[0] ?? term;
  // The word a term is shown as: the form the corpus uses, never the stem.
  const shown = (term: string) => AS_TYPED[term] ?? index.forms.get(term)?.[0] ?? term;

  // An answer row above the results already says how the question was read (its question, its headline), so
  // the line leaves the subject and intent out and keeps only what the engine did to the words.

  const group = (source: PlanTerm["source"]) => {
    const by = new Map<string, PlanTerm[]>();
    for (const t of result.plan) if (t.source === source && t.from !== undefined) by.set(t.from, [...(by.get(t.from) ?? []), t]);
    return by;
  };

  for (const [from, terms] of group("fuzzy")) {
    // A question's own words ("many") are read as the question, not respelled for the visitor.
    if (answer && isQuestionWord(from)) continue;
    const found = [...new Set(terms.map((t) => shown(t.term)))].join(", ");
    out.push({ label: `${found}, spelled from ${typedWord(from)}`, kind: "respell", found });
  }
  for (const [from, terms] of group("rewrite")) {
    const words = [...new Set(terms.map((t) => shown(t.term)))];
    const named = words.slice(0, MAX_NAMED).join(", ");
    const more = words.length > MAX_NAMED ? ` and ${words.length - MAX_NAMED} more` : "";
    out.push({ label: `added: ${named}${more} (rewrite of ${typedWord(from)})`, kind: "rewrite" });
  }

  const { parsed } = result;
  if (parsed.kinds.length > 0) out.push({ label: `filter kind:${filterValue(parsed.kinds)}`, kind: "filter" });
  for (const t of parsed.tech) out.push({ label: `filter tech:${typedWord(t)}`, kind: "filter" });
  for (const p of typedPhrases(result.query)) out.push({ label: `phrase "${p}"`, kind: "phrase" });
  const left = [...parsed.excluded.map(typedWord), ...parsed.excludedPhrases.map((p) => p.map(typedWord).join(" "))];
  if (left.length > 0) out.push({ label: `leaving out: ${left.join(", ")}`, kind: "exclude" });
  return out;
}

/** The engine room opened on this query: what "Take it apart" links to. */
export function takeApartHref(query: string): string {
  return `/engine/?q=${encodeURIComponent(query.trim())}#xray`;
}
