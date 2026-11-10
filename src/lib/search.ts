// The site's search engine. Pure functions, no DOM, no dependencies: a
// tokenizer, a small query rewriter, an inverted index and BM25 ranking with
// field boosts. The corpus (lib/corpus.ts) is a few dozen documents, so the
// whole index is built in the browser on first use and a query costs well
// under a millisecond. search.test.ts pins the behaviour.
//
// score(doc, query) = prior(doc) x sum over terms of weight x idf x BM25 tf.

export interface SearchDoc {
  id: string;
  /** What kind of record this is; shown as the result's label. */
  kind: "eBay" | "Earlier work" | "Project" | "Note" | "Homelab" | "Skills" | "Education" | "Page";
  title: string;
  /** Where and when: "Software Engineer 3, 2023 to now". Shown, not indexed. */
  context: string;
  /** The body a snippet is cut from. */
  text: string;
  /** Indexed, and shown only when nothing in the visible text matched: tech stacks, tags, roles. */
  keywords?: string[];
  /** Static rank: a query-independent multiplier on the score. 1 when absent. */
  prior?: number;
  href: string;
}

// ─── Tokenizer ──────────────────────────────────────────────────────────────

const STOPWORDS = new Set(
  "a an and are as at be but by for from has have i in is it its me my of on or so that the their then this to was were what which who with you your".split(" "),
);

/** Terms whose punctuation is the whole point. Rewritten before splitting. */
const LITERALS: [RegExp, string][] = [
  [/c\+\+/g, " cpp "],
  [/c#/g, " csharp "],
  [/\.net\b/g, " dotnet "],
];

/** A deliberately small suffix stripper: plurals, -ing, -ed, a trailing e. */
export function stem(word: string): string {
  let w = word;
  if (/^\d/.test(w)) return w;
  if (w.length > 4 && w.endsWith("ies")) w = `${w.slice(0, -3)}y`;
  else if (w.length > 4 && /(ss|x|z|ch|sh)es$/.test(w)) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("s") && !/(ss|us|is)$/.test(w)) w = w.slice(0, -1);

  const before = w;
  if (w.length > 5 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2);
  // "running" -> "runn" -> "run"; keep ll/ss/zz ("install", "pass").
  if (w !== before && /([^aeiouylsz])\1$/.test(w)) w = w.slice(0, -1);

  if (w.length > 4 && w.endsWith("e")) w = w.slice(0, -1);
  return w;
}

/** Lowercase, keep C++/C#/.NET whole, drop thousands separators, split, drop stopwords, stem. */
export function tokenize(text: string): string[] {
  let s = text.toLowerCase().replace(/(\d),(?=\d{3})/g, "$1");
  for (const [re, to] of LITERALS) s = s.replace(re, to);
  const out: string[] = [];
  for (const raw of s.split(/[^a-z0-9]+/)) {
    if (!raw || STOPWORDS.has(raw)) continue;
    out.push(stem(raw));
  }
  return out;
}

// ─── Query rewriting ────────────────────────────────────────────────────────

// What a visitor types on the left, the words this site actually uses on the
// right. Rewrites score at REWRITE_WEIGHT, so an exact match always wins.
const REWRITES_RAW: Record<string, string> = {
  infra: "homelab proxmox opentofu docker ci",
  infrastructure: "homelab proxmox opentofu docker ci",
  devops: "homelab opentofu ci docker gitops",
  leadership: "led owned owner took",
  lead: "led owned owner",
  ownership: "owned owner took",
  performance: "cache latency allocators",
  perf: "cache latency allocators",
  latency: "cache",
  memory: "pmr allocators asan",
  testing: "regression replay googletest scenarios checks",
  quality: "tests regression replay",
  mobile: "android kotlin",
  embedded: "firmware zmk risc keyboard",
  hardware: "firmware keyboard pcb",
  hacking: "reverse engineering ghidra",
  ai: "claude",
  llm: "claude",
  ir: "search retrieval ranking query tokenizer",
  retrieval: "search ranking embedding",
  backend: "engine search cpp",
  school: "university master btech",
  degree: "master btech university",
  cv: "resume",
  hire: "email resume contact",
  contact: "email",
  trading: "plutus momentum backtest",
  finance: "plutus momentum backtest",
  security: "sudo keystore fingerprint sops authelia",
  linux: "kwin plasma libinput debian",
};

const REWRITES = new Map<string, string[]>(
  Object.entries(REWRITES_RAW).map(([k, v]) => [stem(k), [...new Set(tokenize(v))]]),
);

export const REWRITE_WEIGHT = 0.45;
export const PREFIX_WEIGHT = 0.5;
const MAX_PREFIX_EXPANSIONS = 8;

// ─── Index ──────────────────────────────────────────────────────────────────

/** A title hit says more than a body hit; keywords sit between. */
export const FIELD_BOOST = { title: 2.2, keywords: 1.4, text: 1 } as const;
const K1 = 1.2;
const B = 0.75;

export interface SearchIndex {
  docs: SearchDoc[];
  /** term -> (doc position -> boosted term frequency) */
  postings: Map<string, Map<number, number>>;
  lengths: number[];
  avgLength: number;
  /** Sorted vocabulary, for prefix expansion. */
  terms: string[];
}

export function buildIndex(docs: SearchDoc[]): SearchIndex {
  const postings = new Map<string, Map<number, number>>();
  const lengths: number[] = [];
  docs.forEach((doc, i) => {
    let length = 0;
    const add = (text: string, boost: number) => {
      for (const term of tokenize(text)) {
        let p = postings.get(term);
        if (!p) postings.set(term, (p = new Map()));
        p.set(i, (p.get(i) ?? 0) + boost);
        length += boost;
      }
    };
    // `context` is display only: every eBay bullet says "Software Engineer",
    // and that must not answer a query for "reverse engineering".
    add(doc.title, FIELD_BOOST.title);
    add((doc.keywords ?? []).join(" "), FIELD_BOOST.keywords);
    add(doc.text, FIELD_BOOST.text);
    lengths.push(length);
  });
  const avgLength = lengths.reduce((a, b) => a + b, 0) / Math.max(1, lengths.length);
  return { docs, postings, lengths, avgLength, terms: [...postings.keys()].sort() };
}

// ─── Query ──────────────────────────────────────────────────────────────────

export interface PlanTerm {
  term: string;
  /** typed: from the query. rewrite: added by the rewriter. prefix: completes the word being typed. */
  source: "typed" | "rewrite" | "prefix";
  /** For rewrites and prefixes: the typed term this came from. */
  from?: string;
  weight: number;
  /** Documents containing the term. */
  df: number;
}

export interface SearchHit {
  doc: SearchDoc;
  score: number;
  /** Stems that matched in this document, for highlighting. */
  matched: string[];
}

export interface SearchResult {
  query: string;
  plan: PlanTerm[];
  hits: SearchHit[];
  total: number;
}

export function planQuery(index: SearchIndex, query: string): PlanTerm[] {
  const typed = [...new Set(tokenize(query))];
  const stillTyping = query.length > 0 && !/\s$/.test(query);
  const plan = new Map<string, PlanTerm>();
  const df = (t: string) => index.postings.get(t)?.size ?? 0;
  const put = (p: PlanTerm) => {
    const have = plan.get(p.term);
    if (!have || have.weight < p.weight) plan.set(p.term, p);
  };

  typed.forEach((term) => put({ term, source: "typed", weight: 1, df: df(term) }));
  for (const term of typed) {
    for (const to of REWRITES.get(term) ?? []) {
      if (df(to) > 0) put({ term: to, source: "rewrite", from: term, weight: REWRITE_WEIGHT, df: df(to) });
    }
  }
  const last = typed[typed.length - 1];
  if (stillTyping && last && last.length >= 2) {
    index.terms
      .filter((t) => t !== last && t.startsWith(last))
      .slice(0, MAX_PREFIX_EXPANSIONS)
      .forEach((t) => put({ term: t, source: "prefix", from: last, weight: PREFIX_WEIGHT, df: df(t) }));
  }
  return [...plan.values()];
}

export function search(index: SearchIndex, query: string): SearchResult {
  const plan = planQuery(index, query);
  const n = index.docs.length;
  const scores = new Map<number, { score: number; matched: Set<string> }>();

  for (const { term, weight } of plan) {
    const posting = index.postings.get(term);
    if (!posting) continue;
    const idf = Math.log(1 + (n - posting.size + 0.5) / (posting.size + 0.5));
    for (const [i, tf] of posting) {
      const norm = 1 - B + B * (index.lengths[i] / index.avgLength);
      const s = (index.docs[i].prior ?? 1) * weight * idf * ((tf * (K1 + 1)) / (tf + K1 * norm));
      let entry = scores.get(i);
      if (!entry) scores.set(i, (entry = { score: 0, matched: new Set() }));
      entry.score += s;
      entry.matched.add(term);
    }
  }

  const hits = [...scores.entries()]
    .map(([i, e]) => ({ doc: index.docs[i], score: e.score, matched: [...e.matched] }))
    // Ties break on corpus order, which is the order I would present things in.
    .sort((a, b) => b.score - a.score || index.docs.indexOf(a.doc) - index.docs.indexOf(b.doc));

  return { query, plan, hits, total: n };
}

// ─── Presentation helpers ───────────────────────────────────────────────────

export interface Segment {
  text: string;
  hit: boolean;
}

// A word, with C++/C# kept whole and thousands separators kept inside numbers.
const WORD = /[A-Za-z0-9]+(?:,\d{3})*(?:\+\+|#)?/g;

/** Split text into runs, marking the words whose stem is in `stems`. */
export function highlight(text: string, stems: Iterable<string>): Segment[] {
  const set = new Set(stems);
  const out: Segment[] = [];
  const push = (t: string, hit: boolean) => {
    if (!t) return;
    const prev = out[out.length - 1];
    if (prev && prev.hit === hit) prev.text += t;
    else out.push({ text: t, hit });
  };
  let at = 0;
  for (const m of text.matchAll(WORD)) {
    const i = m.index ?? 0;
    push(text.slice(at, i), false);
    push(m[0], tokenize(m[0]).some((t) => set.has(t)));
    at = i + m[0].length;
  }
  push(text.slice(at), false);
  return out;
}

/** The part of `text` to show: all of it when short, otherwise from the first sentence that matches. */
export function snippet(text: string, stems: Iterable<string>, max = 230): string {
  if (text.length <= max) return text;
  const set = new Set(stems);
  const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [text];
  const first = Math.max(0, sentences.findIndex((s) => tokenize(s).some((t) => set.has(t))));
  let out = "";
  for (const s of sentences.slice(first)) {
    if (out && out.length + s.length > max) break;
    out += s;
  }
  out = out.trim();
  if (out.length > max) out = `${out.slice(0, out.lastIndexOf(" ", max)).replace(/[,;:]$/, "")}…`;
  return first > 0 ? `… ${out}` : out;
}
