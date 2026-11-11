import { fold, parseQuery, stem, type SearchIndex } from "./search";

// Completions for the word being typed: the index's own vocabulary, shown as words. The index holds
// stems ("fitment", "queri", "cach"); a visitor reads words, so each stem is shown as the form the
// corpus uses most (index.forms), never the stem itself. Pure: Search.tsx only draws what this returns.

export interface Completion {
  /** The word to show and to put in the box: "fitment", "query", "C++". */
  word: string;
  /** The index term it stands for. */
  term: string;
  /** Documents containing the term: what the chips are ordered by. */
  df: number;
}

/** How many chips are offered. */
export const MAX_COMPLETIONS = 5;

/** The tokenizer builds these from punctuation; the box should offer what a visitor types. */
const AS_TYPED: Record<string, string> = { cpp: "C++", csharp: "C#", dotnet: ".NET" };

/** The trailing run of letters and digits: the word under the caret when the query ends in one. */
const TAIL = /[A-Za-z0-9\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F\u0300-\u036F\u1E00-\u1EFF]+$/;

/**
 * Up to `limit` words that complete the last word of `query`, commonest (by document frequency) first.
 * None unless that word is still being typed (not closed by a space, a quote or a filter), is at least two
 * letters and does not start with a digit. The typed word's own term is left out, and so is a completion
 * that is the typed word itself; stopwords never reach the index, so they are never offered.
 */
export function completions(index: SearchIndex, query: string, limit = MAX_COMPLETIONS): Completion[] {
  if (!parseQuery(query).stillTyping) return [];
  const tail = TAIL.exec(query)?.[0];
  if (!tail) return [];
  const typed = fold(tail).toLowerCase();
  if (typed.length < 2 || /^\d/.test(typed)) return [];
  const own = stem(typed);
  const df = (t: string) => index.postings.get(t)?.size ?? 0;

  const out: Completion[] = [];
  const seen = new Set<string>();
  for (const term of index.terms) {
    if (term === own || !term.startsWith(own)) continue;
    const literal = AS_TYPED[term];
    // The commonest form that extends what was typed; the stem may be shorter than the word ("queri" is "query").
    const form = literal ? (literal.toLowerCase().startsWith(typed) || term.startsWith(typed) ? literal : undefined) : index.forms.get(term)?.find((w) => w.startsWith(typed) && w !== typed);
    if (!form || seen.has(form)) continue;
    seen.add(form);
    out.push({ word: form, term, df: df(term) });
  }
  out.sort((a, b) => b.df - a.df || a.word.localeCompare(b.word));
  return out.slice(0, limit);
}

/** The query with its last word replaced, and a space after it: a finished word, so the box stops completing it. */
export function applyCompletion(query: string, word: string): string {
  return `${query.replace(TAIL, "")}${word} `;
}
