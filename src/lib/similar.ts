// More-like-this over the site's own index. Pure, deterministic, no DOM.
//
// A search engine's answer to "what else is like this" is to use the document as the query:
//
//   terms   the document's own terms, weighted by tf x idf over the index (idf is the engine's
//           own formula), the top TERMS_USED of them. A term that no document outside the source
//           can contain is skipped, so no slot is spent on a word that cannot find anything.
//   query   those terms as the words the page spells them (index.forms), joined by spaces. It
//           is an ordinary query: the hero box given the same string ranks the same documents
//           with the same scores, which is what the "Why?" link on a note shows.
//   rank    the real search() over the whole index, TREATMENT config, nothing special-cased.
//   drop    the source's own documents, kinds that are not "documents" (skills lists, guests,
//           pages), and every later document of a note already listed: one link per note.
//
// similar.test.ts pins it, including the leave-one-out check that chose TERMS_USED.

import {
  analyze, search, TREATMENT,
  type DocKind, type RankerConfig, type SearchDoc, type SearchHit, type SearchIndex,
} from "./search";

/**
 * Query terms taken from the source. Chosen by leave-one-out over the notes' own sections
 * (`leaveOneOut` below; similar.test.ts prints the table and fails if another N beats it):
 * for every section, use it as the query and see whether a section of the same note ranks first.
 */
export const TERMS_USED = 16;

/** The hero box keeps the first 120 characters of a ?q= query (Search.tsx); a longer query would be cut mid-word. */
export const MAX_QUERY_CHARS = 120;

/** The kinds of document a note offers as "more like this": a note, a project, a line of work. */
export const RELATED_KINDS: readonly DocKind[] = ["Note", "Project", "eBay", "Earlier work"];

/**
 * A document must score at least this against the note-as-query to be listed. Over the nine notes
 * (16-term queries) the nearest other document is the note's own project at 15 to 43, then comes a
 * long tail: 7 to 10 is a real shared subject (SudoStamp's note to Crush80's, KWin's to ShutUp's,
 * Crush80's to the Tizen app), and 3 to 6.5 is shared vocabulary ("row", "year", "file")
 * with no shared subject. 7 is the line between them. The section is omitted when fewer than
 * MIN_ROWS rows clear it: one weak link is worse than none, and a lone strong one gets no
 * company it did not earn.
 */
export const MIN_SCORE = 7;
export const MIN_ROWS = 2;
export const MAX_ROWS = 4;

/** Where the more-like-this query comes from: documents of the index (by id) or free text. */
export type SimilarSource = { docIds: string[] } | { text: string };

export interface SimilarOptions {
  /** Most documents returned. Default MAX_ROWS. */
  limit?: number;
  /** More documents to leave out, beyond the source's own. */
  exclude?: (doc: SearchDoc) => boolean;
  /** Query terms. Default TERMS_USED. */
  terms?: number;
  /** Fewest score a returned document may have. Default 0. */
  minScore?: number;
  /** Kinds that may be returned. Default RELATED_KINDS. */
  kinds?: readonly DocKind[];
  /** List only the best document of each note. Default true. */
  onePerNote?: boolean;
  /** Longest query, in characters. Default MAX_QUERY_CHARS. */
  maxChars?: number;
  config?: RankerConfig;
}

export interface QueryTerm {
  /** The index term (a stem). */
  term: string;
  /** The word a reader sees: the commonest spelling of the stem in the corpus. */
  word: string;
  /** tf x idf. */
  weight: number;
}

export interface SimilarHit {
  doc: SearchDoc;
  score: number;
  /** Stems of the query that matched this document. */
  matched: string[];
  hit: SearchHit;
}

export interface SimilarResult {
  /** The query as a visitor could type it. */
  query: string;
  terms: QueryTerm[];
  hits: SimilarHit[];
}

/** The note a document belongs to, or the document itself: sections of one note share a key. */
export function parentKey(doc: SearchDoc): string {
  return doc.id.startsWith("note-") ? doc.id.split("--")[0] : doc.id;
}

/** Every document id of one note: the note and each of its sections. */
export function noteDocIds(index: SearchIndex, slug: string): string[] {
  return index.docs.filter((d) => d.id === `note-${slug}` || d.id.startsWith(`note-${slug}--`)).map((d) => d.id);
}

const idfOf = (index: SearchIndex, df: number) => Math.log(1 + (index.docs.length - df + 0.5) / (df + 0.5));

/**
 * The source's terms by tf x idf, heaviest first, ties alphabetically. tf is the raw count over
 * the source's documents. Number-only tokens ("2026") are skipped: a year or a count finds the
 * documents that happen to share it, not the ones about the same thing.
 */
export function topTerms(index: SearchIndex, source: SimilarSource, count: number, maxChars: number, outside?: Set<number>): QueryTerm[] {
  const counts = new Map<string, number>();
  const own = new Set<number>();
  if ("text" in source) {
    for (const { term } of analyze(source.text)) counts.set(term, (counts.get(term) ?? 0) + 1);
  } else {
    const wanted = new Set(source.docIds);
    index.docs.forEach((d, i) => {
      if (wanted.has(d.id)) own.add(i);
    });
    for (const [term, posting] of index.postings) {
      let n = 0;
      for (const i of own) {
        const tf = posting.get(i);
        if (tf) n += tf[0] + tf[1] + tf[2];
      }
      if (n > 0) counts.set(term, n);
    }
  }
  const skip = outside ?? own;
  const scored: QueryTerm[] = [];
  for (const [term, n] of counts) {
    if (/^\d+$/.test(term)) continue;
    const posting = index.postings.get(term);
    const df = posting?.size ?? 0;
    // Nothing outside the source holds it: it cannot find anything.
    let elsewhere = 0;
    if (posting) for (const i of posting.keys()) if (!skip.has(i)) elsewhere++;
    if (elsewhere === 0) continue;
    scored.push({ term, word: index.forms.get(term)?.[0] ?? term, weight: n * idfOf(index, df) });
  }
  scored.sort((a, b) => b.weight - a.weight || a.term.localeCompare(b.term));
  const out: QueryTerm[] = [];
  let length = 0;
  for (const t of scored.slice(0, count)) {
    const next = length + (out.length > 0 ? 1 : 0) + t.word.length;
    if (next > maxChars) break;
    out.push(t);
    length = next;
  }
  return out;
}

/**
 * Documents like the source, by the engine's own ranking of the source's top terms.
 * Pure: the same index and source always give the same result.
 */
export function similar(index: SearchIndex, source: SimilarSource, options: SimilarOptions = {}): SimilarResult {
  const {
    limit = MAX_ROWS, exclude, terms: count = TERMS_USED, minScore = 0,
    kinds = RELATED_KINDS, onePerNote = true, maxChars = MAX_QUERY_CHARS, config = TREATMENT,
  } = options;
  const ownIds = new Set("docIds" in source ? source.docIds : []);
  const outside = new Set<number>();
  index.docs.forEach((d, i) => {
    if (ownIds.has(d.id) || exclude?.(d)) outside.add(i);
  });
  const queryTerms = topTerms(index, source, count, maxChars, outside);
  const query = queryTerms.map((t) => t.word).join(" ");
  if (!query) return { query, terms: queryTerms, hits: [] };

  const found = search(index, query, config);
  const hits: SimilarHit[] = [];
  const listed = new Set<string>();
  for (const hit of found.hits) {
    const { doc } = hit;
    if (hit.score < minScore) break; // hits are sorted: nothing later clears it either
    if (ownIds.has(doc.id) || exclude?.(doc) || !kinds.includes(doc.kind)) continue;
    const key = parentKey(doc);
    if (onePerNote) {
      if (listed.has(key)) continue;
      listed.add(key);
    }
    hits.push({ doc, score: hit.score, matched: hit.matched, hit });
    if (hits.length >= limit) break;
  }
  return { query, terms: queryTerms, hits };
}

/**
 * What a note shows at its foot: the documents like the whole note (its summary, intro and every
 * section as one source), leaving out the note itself, only those that clear MIN_SCORE, and
 * nothing at all (null) when fewer than MIN_ROWS do.
 */
export function relatedToNote(index: SearchIndex, slug: string, options: SimilarOptions = {}): SimilarResult | null {
  const ids = noteDocIds(index, slug);
  if (ids.length === 0) return null;
  const result = similar(index, { docIds: ids }, { minScore: MIN_SCORE, ...options });
  return result.hits.length >= MIN_ROWS ? result : null;
}

// ─── The leave-one-out check that chose TERMS_USED ──────────────────────────

export interface LeaveOneOut {
  terms: number;
  /** Sources tried: every document of a note that has at least one other document. */
  sources: number;
  /** Share whose top result (itself removed) is a document of the same note. */
  p1: number;
  /** Mean reciprocal rank of the first document of the same note. */
  mrr: number;
  /** Mean number of query terms actually used (the length cap can cut a long query). */
  used: number;
}

/**
 * For each document of each note (the note's own entry and each section), use it as the query,
 * take it out of the ranking, and ask whether another document of the same note ranks first.
 * Every kind of document may be returned and none is merged, so a miss is a real miss.
 */
export function leaveOneOut(index: SearchIndex, slugs: string[], terms: number, maxChars = MAX_QUERY_CHARS): LeaveOneOut {
  let sources = 0;
  let first = 0;
  let rr = 0;
  let used = 0;
  const everything: DocKind[] = ["eBay", "Earlier work", "Project", "Note", "Homelab", "Skills", "Education", "Page"];
  for (const slug of slugs) {
    const ids = noteDocIds(index, slug);
    if (ids.length < 2) continue;
    for (const id of ids) {
      const r = similar(index, { docIds: [id] }, { limit: 50, terms, maxChars, kinds: everything, onePerNote: false });
      sources++;
      used += r.terms.length;
      const rank = r.hits.findIndex((h) => parentKey(h.doc) === `note-${slug}`);
      if (rank === 0) first++;
      if (rank >= 0) rr += 1 / (rank + 1);
    }
  }
  return { terms, sources, p1: sources ? first / sources : 0, mrr: sources ? rr / sources : 0, used: sources ? used / sources : 0 };
}
