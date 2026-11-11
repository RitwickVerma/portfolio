// The site's search engine. Pure functions, no DOM, no dependencies.
//
//   parse     "exact phrase"  -excluded  kind:note  tech:kotlin  free terms
//   rewrite   a visitor's word -> the words this site uses, at a lower weight
//   expand    the word being typed matches as a prefix; a word the corpus
//             lacks falls back to its nearest spelling
//   retrieve  inverted index, per-field term frequencies
//   rank      prior(doc) x sum over terms of weight x idf x BM25(tf across fields)
//   explain   every hit carries the arithmetic that put it where it is
//
// The corpus (lib/corpus.ts) is a few hundred passages, so the index is built
// in the browser and a query costs well under a millisecond. Every stage can
// be switched off through RankerConfig, which is how the engine-room page
// replays the same queries against a control and a treatment.
// search.test.ts pins the behaviour.

export type DocKind = "eBay" | "Earlier work" | "Project" | "Note" | "Homelab" | "Skills" | "Education" | "Page";

export interface SearchDoc {
  id: string;
  /** What kind of record this is; shown as the result's label and filterable with kind: */
  kind: DocKind;
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
// The C must start a word: "abc++" and "pc#" are not languages. (A captured lead, not a lookbehind.)
const LITERALS: [RegExp, string][] = [
  [/(^|[^a-z0-9])c\+\+/g, "$1 cpp "],
  [/(^|[^a-z0-9])c#/g, "$1 csharp "],
  [/\.net\b/g, " dotnet "],
];

/**
 * The English (Porter2) stemmer, written from Martin Porter's published Snowball description
 * ("The English (Porter2) stemming algorithm"). It is not the 1980 Porter stemmer, whose
 * inconsistencies it fixes; it is what Lucene's and Elasticsearch's "english" analyzers run.
 *
 *   prelude   a y that starts the word or follows a vowel is a consonant (written Y while stemming)
 *   regions   R1 is what follows the first non-vowel after a vowel, R2 the same again inside R1
 *   step 1    plurals (sses, ies, s), then -ed and -ing with the repair of what is left (hop|ping -> hop,
 *             hop|ing -> hope), then a final y -> i
 *   steps 2-4 derivational endings (-ization, -ational, -ful, -ness, -ment, -ive ...), each removed only
 *             where it lies inside R1 or R2, so a short stem is never eaten
 *   step 5    a final e or ll
 *
 * Literal: a token with a digit in it (years, "50000", "k8s", "ct101") and the three tokens the tokenizer
 * builds out of punctuation (cpp, csharp, dotnet) are returned as they are.
 *
 * Two exception tables sit in front of the algorithm. Snowball's own (skis, dying, news ...) are words
 * its authors know it gets wrong. SITE_STEMS is this site's: every word of the corpus vocabulary was
 * stemmed with the old rules and with these, and the pairs that met only under Porter2 were judged by
 * hand. The ones that are different words (engine/engineer, intern/internal, universe/university,
 * position/positive, product/production, access/accessibility, spy/SPI, page/paging) are pinned apart; a few inflections the
 * algorithm leaves split (add/added, tv/tvs, build/built, do/does) are pinned together. Earlier stemmers
 * here were reverted for merging "note" with "not" and splitting "settings" from "setting"; stem.test.ts
 * keeps both pairs, and a vocabulary-wide check lives in search.test.ts.
 */
const SNOWBALL_EXCEPTIONS: Record<string, string> = {
  skis: "ski", skies: "sky", dying: "die", lying: "lie", tying: "tie",
  idly: "idl", gently: "gentl", ugly: "ugli", early: "earli", only: "onli", singly: "singl",
  sky: "sky", news: "news", howe: "howe", atlas: "atlas", cosmos: "cosmos", bias: "bias", andes: "andes",
};
/**
 * Pinned by measurement over the corpus vocabulary (see the comment above `stem`). Each pattern covers
 * the word and its regular inflections, so a later note that says "engineers" lands with "engineering".
 * First: words Porter2 would merge with a different word. Then: inflections it leaves apart.
 */
const SITE_STEMS: [RegExp, string][] = [
  [/^engineer(?:s|ed|ing|ings)?$/, "engineer"], // not "engine": a search engine is not an engineer
  [/^internal(?:s|ly)?$/, "internal"], // not "intern": the internship query must not find "internal"
  [/^universit(?:y|ies)$/, "university"], // not "universe"
  [/^positive(?:s|ly)?$/, "positive"], // not "position"
  [/^accessib(?:ility|le|ly)$/, "accessib"], // accessibility is not the chip that "accesses" memory
  [/^productions?$/, "production"], // production traffic is not the eBay product
  [/^(?:spy|spies)$/, "spy"], // the ticker SPY is not the SPI bus ("spi")
  [/^paging$/, "paging"], // paging an on-call phone is not a web page
  [/^add(?:ed|ing)$/, "add"], // Porter2 leaves "added" at "ad"
  [/^does$/, "do"],
  [/^goes$/, "go"],
  [/^tvs$/, "tv"], // no vowel before the s, so rule 1a keeps it
  [/^built$/, "build"],
];

/** After step 1a these are returned as they are. */
const AFTER_1A = new Set(["inning", "outing", "canning", "herring", "earring", "proceed", "exceed", "succeed"]);

const isVowel = (c: string | undefined) => c !== undefined && "aeiouy".includes(c);
const DOUBLES = ["bb", "dd", "ff", "gg", "mm", "nn", "pp", "rr", "tt"];
const LI_ENDING = "cdeghkmnrt";

/** Start index of the region that follows the first non-vowel after a vowel, searching from `from`. */
function regionAfter(w: string, from: number): number {
  for (let i = from + 1; i < w.length; i++) if (!isVowel(w[i]) && isVowel(w[i - 1])) return i + 1;
  return w.length;
}

/** The word ends in a short syllable: non-vowel, vowel, non-vowel that is not w, x or Y; or a vowel and a non-vowel alone. */
function endsShort(w: string): boolean {
  const n = w.length;
  if (n === 2) return isVowel(w[0]) && !isVowel(w[1]);
  return n >= 3 && !isVowel(w[n - 3]) && isVowel(w[n - 2]) && !isVowel(w[n - 1]) && !"wxY".includes(w[n - 1]);
}

/** The longest of `list` that `w` ends with, or "". */
function longest(w: string, list: readonly string[]): string {
  let best = "";
  for (const s of list) if (s.length > best.length && w.endsWith(s)) best = s;
  return best;
}

const STEP2: Record<string, string> = {
  tional: "tion", enci: "ence", anci: "ance", abli: "able", entli: "ent", izer: "ize", ization: "ize",
  ational: "ate", ation: "ate", ator: "ate", alism: "al", aliti: "al", alli: "al", fulness: "ful",
  ousli: "ous", ousness: "ous", iveness: "ive", iviti: "ive", biliti: "ble", bli: "ble", ogi: "og",
  fulli: "ful", lessli: "less", li: "",
};
const STEP2_KEYS = Object.keys(STEP2);
const STEP3: Record<string, string> = {
  tional: "tion", ational: "ate", alize: "al", icate: "ic", iciti: "ic", ical: "ic", ful: "", ness: "", ative: "",
};
const STEP3_KEYS = Object.keys(STEP3);
const STEP4 = ["al", "ance", "ence", "er", "ic", "able", "ible", "ant", "ement", "ment", "ent", "ism", "ate", "iti", "ous", "ive", "ize", "ion"];
const STEP1B = ["eed", "eedly", "ed", "edly", "ing", "ingly"];

export function stem(word: string): string {
  if (/\d/.test(word) || word === "cpp" || word === "csharp" || word === "dotnet") return word;
  if (word.length <= 2) return word;
  const exception = SNOWBALL_EXCEPTIONS[word];
  if (exception !== undefined) return exception;
  for (const [pattern, pinned] of SITE_STEMS) if (pattern.test(word)) return pinned;

  // Prelude.
  let w = word[0] === "y" ? "Y" : word[0];
  for (let i = 1; i < word.length; i++) w += word[i] === "y" && isVowel(word[i - 1]) ? "Y" : word[i];

  let r1 = regionAfter(w, 0);
  if (/^(gener|commun|arsen)/.test(w)) r1 = /^commun/.test(w) ? 6 : 5;
  const r2 = regionAfter(w, r1);
  const inR1 = (suffix: string) => w.length - suffix.length >= r1;
  const inR2 = (suffix: string) => w.length - suffix.length >= r2;
  const cut = (suffix: string, to = "") => (w = w.slice(0, w.length - suffix.length) + to);

  // Step 1a.
  const s1a = longest(w, ["sses", "ied", "ies", "us", "ss", "s"]);
  if (s1a === "sses") cut(s1a, "ss");
  else if (s1a === "ied" || s1a === "ies") cut(s1a, w.length > 4 ? "i" : "ie");
  else if (s1a === "s" && [...w.slice(0, -2)].some((c) => isVowel(c))) cut(s1a);
  if (AFTER_1A.has(w)) return w;

  // Step 1b.
  const s1b = longest(w, STEP1B);
  if (s1b === "eed" || s1b === "eedly") {
    if (inR1(s1b)) cut(s1b, "ee");
  } else if (s1b && [...w.slice(0, w.length - s1b.length)].some((c) => isVowel(c))) {
    cut(s1b);
    if (/(at|bl|iz)$/.test(w)) w += "e";
    else if (DOUBLES.some((d) => w.endsWith(d))) w = w.slice(0, -1);
    else if (r1 >= w.length && endsShort(w)) w += "e";
  }

  // Step 1c.
  if (w.length > 2 && (w.endsWith("y") || w.endsWith("Y")) && !isVowel(w[w.length - 2])) cut("y", "i");

  // Step 2.
  const s2 = longest(w, STEP2_KEYS);
  if (s2 && inR1(s2)) {
    if (s2 === "ogi") {
      if (w[w.length - 4] === "l") cut(s2, "og");
    } else if (s2 === "li") {
      if (LI_ENDING.includes(w[w.length - 3] ?? "")) cut(s2);
    } else cut(s2, STEP2[s2]);
  }

  // Step 3.
  const s3 = longest(w, STEP3_KEYS);
  if (s3 && inR1(s3) && (s3 !== "ative" || inR2(s3))) cut(s3, STEP3[s3]);

  // Step 4.
  const s4 = longest(w, STEP4);
  if (s4 && inR2(s4) && (s4 !== "ion" || "st".includes(w[w.length - 4] ?? ""))) cut(s4);

  // Step 5.
  if (w.endsWith("e")) {
    if (inR2("e") || (inR1("e") && !endsShort(w.slice(0, -1)))) cut("e");
  } else if (w.endsWith("ll") && inR2("l")) cut("l");

  return w.replace(/Y/g, "y");
}

/**
 * Strip accents: "résumé" -> "resume", "naïve" -> "naive". NFD turns each accented letter into the
 * letter and a combining mark (U+0300 to U+036F), and the marks go. Letters with no decomposition
 * (ø, ß) are left alone.
 */
export function fold(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Lowercase, fold accents, keep C++/C#/.NET whole, drop thousands separators, split, drop stopwords, stem.
 * A comma is a thousands separator only before exactly three digits: "50,000" is one number,
 * "2020,2021" is two.
 */
export function tokenize(text: string): string[] {
  return analyze(text).map((t) => t.term);
}

/** A word as the page spells it (accents folded, lowercased) and the term it indexes as. */
export interface Analyzed {
  word: string;
  term: string;
}

/** `tokenize`, keeping each term's surface word: what the index needs to offer a completion as a word, not a stem. */
export function analyze(text: string): Analyzed[] {
  let s = fold(text).toLowerCase().replace(/(\d),(?=\d{3}(?:\D|$))/g, "$1");
  for (const [re, to] of LITERALS) s = s.replace(re, to);
  const out: Analyzed[] = [];
  for (const raw of s.split(/[^a-z0-9]+/)) {
    if (!raw || STOPWORDS.has(raw)) continue;
    out.push({ word: raw, term: stem(raw) });
  }
  return out;
}

// ─── Query language ─────────────────────────────────────────────────────────

/** What a visitor may type after kind: and the kinds it selects. */
export const KIND_ALIASES: Record<string, DocKind[]> = {
  work: ["eBay", "Earlier work"],
  earlier: ["Earlier work"],
  ebay: ["eBay"],
  project: ["Project"],
  projects: ["Project"],
  note: ["Note"],
  notes: ["Note"],
  lab: ["Homelab"],
  homelab: ["Homelab"],
  skills: ["Skills"],
  education: ["Education"],
  page: ["Page"],
};

export interface ParsedQuery {
  /** Free terms, stemmed, in order, without duplicates. */
  terms: string[];
  /** Each quoted phrase as its stems. A document must contain them adjacent and in order. */
  phrases: string[][];
  /** Stems a document must not contain. */
  excluded: string[];
  /** Quoted phrases after a minus: a document must not contain them adjacent and in order. */
  excludedPhrases: string[][];
  /** kind: filters, resolved to kinds. Empty means no filter. */
  kinds: DocKind[];
  /** tech: filters, stemmed. A document's keywords must contain each. */
  tech: string[];
  /** kind: values that named nothing, so the UI can say so. */
  unknownKinds: string[];
  /** True while the last free term may still be growing. */
  stillTyping: boolean;
}

export function parseQuery(query: string): ParsedQuery {
  const parsed: ParsedQuery = { terms: [], phrases: [], excluded: [], excludedPhrases: [], kinds: [], tech: [], unknownKinds: [], stillTyping: false };
  let rest = query;

  // -"a phrase" excludes the phrase. It is read before the plain quotes, or the minus would be left behind
  // and the phrase would be required instead of removed.
  rest = rest.replace(/(^|\s)-"([^"]*)"?/g, (_, lead: string, phrase: string) => {
    const stems = tokenize(phrase);
    if (stems.length === 1) parsed.excluded.push(stems[0]);
    else if (stems.length > 1) parsed.excludedPhrases.push(stems);
    return `${lead} `;
  });

  rest = rest.replace(/"([^"]*)"?/g, (_, phrase: string) => {
    const stems = tokenize(phrase);
    if (stems.length > 0) parsed.phrases.push(stems);
    return " ";
  });
  rest = rest.replace(/(^|\s)(kind|in|tech|stack):(\S*)/gi, (_, lead: string, key: string, value: string) => {
    const k = key.toLowerCase();
    const v = value.toLowerCase();
    if (!v) return lead;
    if (k === "kind" || k === "in") {
      const kinds = KIND_ALIASES[v];
      if (kinds) parsed.kinds.push(...kinds);
      else parsed.unknownKinds.push(v);
    } else {
      parsed.tech.push(...tokenize(v));
    }
    return `${lead} `;
  });
  rest = rest.replace(/(^|\s)-(\S+)/g, (_, lead: string, word: string) => {
    parsed.excluded.push(...tokenize(word));
    return `${lead} `;
  });

  parsed.terms = [...new Set(tokenize(rest))];
  parsed.excluded = [...new Set(parsed.excluded)];
  parsed.tech = [...new Set(parsed.tech)];
  // A query that ends inside a quote, a filter or an exclusion is not growing a free term.
  parsed.stillTyping = /[a-z0-9+#]$/i.test(fold(rest));
  parsed.kinds = [...new Set(parsed.kinds)];
  return parsed;
}

// ─── Query rewriting ────────────────────────────────────────────────────────

// What a visitor types on the left, the words this site actually uses on the
// right. Rewrites score at REWRITE_WEIGHT, so an exact match always wins.
export const REWRITES_RAW: Record<string, string> = {
  infra: "homelab proxmox opentofu docker ci",
  infrastructure: "homelab proxmox opentofu docker ci",
  devops: "homelab opentofu ci docker gitops",
  iac: "opentofu",
  terraform: "opentofu",
  leadership: "led owned owner took",
  lead: "led owned owner",
  ownership: "owned owner took",
  performance: "cache latency allocators",
  perf: "cache latency allocators",
  latency: "cache",
  optimization: "cache latency allocators",
  memory: "pmr allocators asan",
  testing: "regression replay googletest scenarios checks",
  quality: "tests regression replay",
  experimentation: "replay treatment control",
  mobile: "android kotlin",
  embedded: "firmware zmk risc keyboard",
  hardware: "firmware keyboard pcb",
  hacking: "reverse engineering ghidra",
  ai: "claude",
  llm: "claude",
  ir: "search retrieval ranking query tokenizer",
  retrieval: "search ranking embedding",
  relevance: "ranking search query",
  backend: "engine search cpp",
  school: "university master btech",
  degree: "master btech university",
  cv: "resume",
  internship: "intern",
  intern: "intern",
  hire: "email resume contact",
  contact: "email",
  trading: "plutus momentum backtest",
  finance: "plutus momentum backtest",
  security: "sudo keystore fingerprint sops authelia",
  linux: "kwin plasma libinput debian",
  monitoring: "gatus health",
  debugging: "traced root cause",
  debug: "traced root cause",
  troubleshooting: "traced root cause",
  observability: "gatus dozzle health",

  // Added after auditing the table against the corpus (see rewrites.test.ts, which keeps each target alive).
  // Each key is a word a hiring manager types that no document uses; each target is a word a document does use.
  // None of them claims experience: they send the visitor to the nearest thing the record says.
  reliability: "backup recovery gatus paging", // the homelab note's backups, restores and paging; the gatus health checks
  sre: "backup recovery gatus paging", // same documents, for the job title
  oncall: "paging alert gatus", // "Paging without noise" in the homelab note
  frontend: "react typescript tailwind html css", // the colophon's stack sections; typescript is also in the languages list
  web: "html javascript typescript browser", // what this site and the notes' figures are written in and run on
  algorithm: "greedy alignment classifier limiter", // the ported algorithms: Chordist's greedy alignment, kwin-canvas's classifier, SudoStamp's limiter
  marketplace: "ebay motors fitment buyer", // eBay Motors fitment is the marketplace work
  ecommerce: "ebay motors fitment buyer",
  auth: "sso authelia", // Authelia single sign-on in front of the homelab
  authentication: "sso authelia",
  elasticsearch: "search engine cassini retrieval", // the engine I worked on is eBay's own (Cassini), not Lucene; these are its words
  lucene: "search engine cassini retrieval",
  solr: "search engine cassini retrieval",
};

const REWRITES = new Map<string, string[]>(
  Object.entries(REWRITES_RAW).map(([k, v]) => [stem(k), [...new Set(tokenize(v))]]),
);

/** The rewriter's table, for display: typed stem -> added stems. */
export function rewritesFor(term: string): string[] {
  return REWRITES.get(term) ?? [];
}


// ─── Ranker configuration ───────────────────────────────────────────────────

export interface RankerConfig {
  /** Add the site's vocabulary for the visitor's word. */
  rewrites: boolean;
  /** Match the word being typed as a prefix. */
  prefix: boolean;
  /** Fall back to the nearest spelling when a word matches nothing. */
  fuzzy: boolean;
  /** Apply each document's static rank. */
  priors: boolean;
  /** Weight per field. All 1 is plain BM25 over the concatenated text. */
  boost: { title: number; keywords: number; text: number };
  k1: number;
  b: number;
}

/** What the site runs. */
export const TREATMENT: RankerConfig = {
  rewrites: true,
  prefix: true,
  fuzzy: true,
  priors: true,
  // A title hit says more than a body hit; keywords sit between.
  boost: { title: 2.2, keywords: 1.4, text: 1 },
  k1: 1.2,
  b: 0.75,
};

/** The textbook baseline: BM25 over the text, nothing else. */
export const CONTROL: RankerConfig = {
  rewrites: false,
  prefix: false,
  fuzzy: false,
  priors: false,
  boost: { title: 1, keywords: 1, text: 1 },
  k1: 1.2,
  b: 0.75,
};

export const REWRITE_WEIGHT = 0.45;
export const PREFIX_WEIGHT = 0.5;
export const FUZZY_WEIGHT = 0.7;
/** Score multiplier for each quoted phrase a document contains. */
export const PHRASE_BONUS = 1.5;
const MAX_PREFIX_EXPANSIONS = 8;
const MAX_FUZZY_EXPANSIONS = 2;

// ─── Index ──────────────────────────────────────────────────────────────────

/** Term frequency per field: [title, keywords, text]. */
export type FieldTf = [number, number, number];

export interface SearchIndex {
  docs: SearchDoc[];
  /** term -> (doc position -> per-field term frequency) */
  postings: Map<string, Map<number, FieldTf>>;
  /** Per document, token count per field. */
  lengths: FieldTf[];
  /** Per document, every token in order with a null between fields, for phrase matching. */
  sequences: (string | null)[][];
  /** Per document, the stems of its keywords, for tech: filters. */
  keywordStems: Set<string>[];
  /** Sorted vocabulary, for prefix and fuzzy expansion. */
  terms: string[];
  /** term -> the words that were indexed as it, commonest first (ties alphabetically): the surface of a stem. */
  forms: Map<string, string[]>;
}

export function buildIndex(docs: SearchDoc[]): SearchIndex {
  const postings = new Map<string, Map<number, FieldTf>>();
  const lengths: FieldTf[] = [];
  const sequences: (string | null)[][] = [];
  const keywordStems: Set<string>[] = [];
  const spelt = new Map<string, Map<string, number>>();

  docs.forEach((doc, i) => {
    const length: FieldTf = [0, 0, 0];
    const sequence: (string | null)[] = [];
    const add = (text: string, field: 0 | 1 | 2) => {
      const analysed = analyze(text);
      const tokens = analysed.map((t) => t.term);
      for (const { word, term } of analysed) {
        let seen = spelt.get(term);
        if (!seen) spelt.set(term, (seen = new Map()));
        seen.set(word, (seen.get(word) ?? 0) + 1);
        let p = postings.get(term);
        if (!p) postings.set(term, (p = new Map()));
        let tf = p.get(i);
        if (!tf) p.set(i, (tf = [0, 0, 0]));
        tf[field] += 1;
      }
      length[field] += tokens.length;
      sequence.push(...tokens, null);
      return tokens;
    };
    // `context` is display only: every eBay bullet says "Software Engineer",
    // and that must not answer a query for "reverse engineering".
    add(doc.title, 0);
    // Each keyword is its own run, so a phrase cannot straddle two of them.
    const kw = new Set<string>();
    for (const k of doc.keywords ?? []) for (const t of add(k, 1)) kw.add(t);
    add(doc.text, 2);
    lengths.push(length);
    sequences.push(sequence);
    keywordStems.push(kw);
  });

  const forms = new Map<string, string[]>();
  for (const [term, seen] of spelt) forms.set(term, [...seen].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).map(([word]) => word));

  return { docs, postings, lengths, sequences, keywordStems, terms: [...postings.keys()].sort(), forms };
}

// ─── Spelling ───────────────────────────────────────────────────────────────

/** Damerau-Levenshtein distance (adjacent transpositions count once), abandoned once it must exceed `max`. */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev2: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, prev2[j - 2] + 1);
      row.push(d);
      if (d < best) best = d;
    }
    if (best > max) return max + 1;
    prev2 = prev;
    prev = row;
  }
  return prev[b.length];
}

/** Vocabulary terms within one edit of `term` (two for long words), commonest first. */
export function nearestTerms(index: SearchIndex, term: string): string[] {
  if (term.length < 4 || /^\d/.test(term)) return [];
  const max = term.length >= 8 ? 2 : 1;
  return index.terms
    .filter((t) => t[0] === term[0] && !/^\d/.test(t))
    .map((t) => ({ t, d: editDistance(term, t, max), df: index.postings.get(t)?.size ?? 0 }))
    .filter((c) => c.d <= max)
    .sort((x, y) => x.d - y.d || y.df - x.df || x.t.localeCompare(y.t))
    .slice(0, MAX_FUZZY_EXPANSIONS)
    .map((c) => c.t);
}

// ─── Plan ───────────────────────────────────────────────────────────────────

export interface PlanTerm {
  term: string;
  /**
   * typed: from the query. phrase: inside a quoted phrase. rewrite: added by
   * the rewriter. prefix: completes the word being typed. fuzzy: the nearest
   * spelling of a word the corpus lacks.
   */
  source: "typed" | "phrase" | "rewrite" | "prefix" | "fuzzy";
  /** For rewrites, prefixes and fuzzy matches: the typed term this came from. */
  from?: string;
  weight: number;
  /** Documents containing the term. */
  df: number;
}

export function planQuery(index: SearchIndex, query: string | ParsedQuery, config: RankerConfig = TREATMENT): PlanTerm[] {
  const parsed = typeof query === "string" ? parseQuery(query) : query;
  const plan = new Map<string, PlanTerm>();
  const df = (t: string) => index.postings.get(t)?.size ?? 0;
  const put = (p: PlanTerm) => {
    const have = plan.get(p.term);
    if (!have || have.weight < p.weight) plan.set(p.term, p);
  };

  parsed.terms.forEach((term) => put({ term, source: "typed", weight: 1, df: df(term) }));
  for (const phrase of parsed.phrases) for (const term of phrase) put({ term, source: "phrase", weight: 1, df: df(term) });

  if (config.rewrites) {
    for (const term of parsed.terms) {
      for (const to of REWRITES.get(term) ?? []) {
        if (df(to) > 0) put({ term: to, source: "rewrite", from: term, weight: REWRITE_WEIGHT, df: df(to) });
      }
    }
  }

  const last = parsed.terms[parsed.terms.length - 1];
  let completed = false;
  if (config.prefix && parsed.stillTyping && last && last.length >= 2) {
    // Commonest completions first: a short prefix should reach the words the site uses most.
    index.terms
      .filter((t) => t !== last && t.startsWith(last))
      .sort((x, y) => df(y) - df(x) || x.localeCompare(y))
      .slice(0, MAX_PREFIX_EXPANSIONS)
      .forEach((t) => {
        completed = true;
        put({ term: t, source: "prefix", from: last, weight: PREFIX_WEIGHT, df: df(t) });
      });
  }

  if (config.fuzzy) {
    for (const term of parsed.terms) {
      // Only a word that found nothing by any other route gets respelled.
      const reached = df(term) > 0 || (term === last && completed) || (config.rewrites && (REWRITES.get(term) ?? []).some((t) => df(t) > 0));
      if (reached) continue;
      for (const t of nearestTerms(index, term)) put({ term: t, source: "fuzzy", from: term, weight: FUZZY_WEIGHT, df: df(t) });
    }
  }
  return [...plan.values()];
}

// ─── Search ─────────────────────────────────────────────────────────────────

/** One term's contribution to one document's score, with every factor shown. */
export interface TermScore {
  term: string;
  source: PlanTerm["source"];
  from?: string;
  /** Plan weight: 1 for a typed term, less for an expansion. */
  weight: number;
  idf: number;
  /** Raw counts per field: [title, keywords, text]. */
  tf: FieldTf;
  /** Boosted term frequency: sum of tf x field boost. */
  boostedTf: number;
  /** Length normalisation: 1 - b + b x (this length / average length). */
  norm: number;
  /** weight x idf x tf-saturation, before the prior and phrase bonus. */
  score: number;
}

export interface SearchHit {
  doc: SearchDoc;
  score: number;
  /** Stems that matched in this document, for highlighting. */
  matched: string[];
  /** The arithmetic: per-term scores, then the two multipliers. */
  explain: { terms: TermScore[]; prior: number; phrases: number };
}

export interface SearchResult {
  query: string;
  parsed: ParsedQuery;
  plan: PlanTerm[];
  hits: SearchHit[];
  /** Hits per kind before any kind: filter, for facets. */
  facets: Partial<Record<DocKind, number>>;
  /** Documents in the index. */
  total: number;
}

/** Mean boosted document length, remembered per index and set of field weights. */
const averages = new WeakMap<SearchIndex, Map<string, number>>();
function averageLength(index: SearchIndex, boost: RankerConfig["boost"]): number {
  let byBoost = averages.get(index);
  if (!byBoost) averages.set(index, (byBoost = new Map()));
  const key = `${boost.title}/${boost.keywords}/${boost.text}`;
  let avg = byBoost.get(key);
  if (avg === undefined) {
    const total = index.lengths.reduce((sum, l) => sum + l[0] * boost.title + l[1] * boost.keywords + l[2] * boost.text, 0);
    byBoost.set(key, (avg = total / Math.max(1, index.docs.length)));
  }
  return avg;
}

function containsPhrase(sequence: (string | null)[], phrase: string[]): boolean {
  outer: for (let i = 0; i + phrase.length <= sequence.length; i++) {
    for (let j = 0; j < phrase.length; j++) if (sequence[i + j] !== phrase[j]) continue outer;
    return true;
  }
  return false;
}

export function search(index: SearchIndex, query: string, config: RankerConfig = TREATMENT): SearchResult {
  const parsed = parseQuery(query);
  const plan = planQuery(index, parsed, config);
  const n = index.docs.length;
  const { boost, k1, b } = config;
  const weighted = (tf: FieldTf) => tf[0] * boost.title + tf[1] * boost.keywords + tf[2] * boost.text;
  const avgLength = averageLength(index, boost);

  const candidates = new Map<number, TermScore[]>();
  for (const { term, source, from, weight } of plan) {
    const posting = index.postings.get(term);
    if (!posting) continue;
    const idf = Math.log(1 + (n - posting.size + 0.5) / (posting.size + 0.5));
    for (const [i, tf] of posting) {
      const boostedTf = weighted(tf);
      if (boostedTf === 0) continue;
      const norm = 1 - b + b * (weighted(index.lengths[i]) / avgLength);
      const score = weight * idf * ((boostedTf * (k1 + 1)) / (boostedTf + k1 * norm));
      let list = candidates.get(i);
      if (!list) candidates.set(i, (list = []));
      list.push({ term, source, from, weight, idf, tf, boostedTf, norm, score });
    }
  }

  // A query made only of filters ("kind:note") lists what the filters select.
  const filterOnly = plan.length === 0 && (parsed.kinds.length > 0 || parsed.tech.length > 0);
  if (filterOnly) index.docs.forEach((_, i) => candidates.set(i, []));

  const facets: Partial<Record<DocKind, number>> = {};
  const hits: (SearchHit & { order: number })[] = [];
  for (const [i, terms] of candidates) {
    const doc = index.docs[i];
    if (parsed.excluded.some((t) => index.postings.get(t)?.has(i))) continue;
    if (parsed.excludedPhrases.some((p) => containsPhrase(index.sequences[i], p))) continue;
    if (!parsed.tech.every((t) => index.keywordStems[i].has(t))) continue;
    const phrases = parsed.phrases.filter((p) => containsPhrase(index.sequences[i], p)).length;
    if (phrases < parsed.phrases.length) continue;

    facets[doc.kind] = (facets[doc.kind] ?? 0) + 1;
    if (parsed.kinds.length > 0 && !parsed.kinds.includes(doc.kind)) continue;

    const prior = config.priors ? (doc.prior ?? 1) : 1;
    const base = filterOnly ? 1 : terms.reduce((sum, t) => sum + t.score, 0);
    hits.push({
      doc,
      score: base * prior * PHRASE_BONUS ** phrases,
      matched: [...new Set(terms.map((t) => t.term))],
      explain: { terms: terms.sort((x, y) => y.score - x.score), prior, phrases },
      order: i,
    });
  }

  // Ties break on corpus order, which is the order I would present things in.
  hits.sort((x, y) => y.score - x.score || x.order - y.order);
  return { query, parsed, plan, hits, facets, total: n };
}

// ─── Presentation helpers ───────────────────────────────────────────────────

export interface Segment {
  text: string;
  hit: boolean;
}

/**
 * A word, with C++/C# kept whole and thousands separators kept inside numbers. Accented Latin
 * letters (and combining marks) belong to the word, so "résumé" is one run of text and the
 * highlight covers it; `tokenize` folds it when the run is compared with a stem.
 */
export const WORD = /[A-Za-z0-9\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F\u0300-\u036F\u1E00-\u1EFF]+(?:,\d{3}(?!\d))*(?:\+\+|#)?/g;

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

/** The part of `text` to show: all of it when short, otherwise the densest run of sentences that fits. */
export function snippet(text: string, stems: Iterable<string>, max = 230): string {
  if (text.length <= max) return text;
  const set = new Set(stems);
  // A sentence ends at punctuation followed by a space, so "ebay.com" and "1.04" stay whole.
  // No lookbehind: Safari before 16.4 rejects one at parse time and takes the whole script with it.
  const sentences = text.match(/[\s\S]+?(?:[.!?]+(?=\s|$)|$)\s*/g) ?? [text];
  const hitsIn = sentences.map((s) => new Set(tokenize(s).filter((t) => set.has(t))).size);
  // Start at the sentence with the most distinct matched terms; earliest wins a tie.
  let first = 0;
  hitsIn.forEach((h, i) => {
    if (h > hitsIn[first]) first = i;
  });
  let out = "";
  for (const s of sentences.slice(first)) {
    if (out && out.length + s.length > max) break;
    out += s;
  }
  out = out.trim();
  let lead = first > 0;
  if (out.length > max) {
    // One sentence longer than the window: start a little before its first matched word, so the
    // match is in what is shown. Without this a match 300 characters in was cut off and the row
    // showed no reason for being there.
    let from = 0;
    for (const m of out.matchAll(WORD)) {
      if (tokenize(m[0]).some((t) => set.has(t))) {
        const at = m.index ?? 0;
        if (at + m[0].length > max) {
          const start = Math.max(0, at - Math.floor(max / 3));
          const back = out.lastIndexOf(" ", start);
          // No space to step back to (one very long token before the match): start mid-token.
          from = back > 0 ? back + 1 : start;
        }
        break;
      }
    }
    if (from > 0) {
      out = out.slice(from);
      lead = true;
    }
    if (out.length > max) {
      const cut = out.lastIndexOf(" ", max);
      out = `${out.slice(0, cut > 0 ? cut : max).replace(/[,;:]$/, "")}…`;
    }
  }
  return lead ? `… ${out}` : out;
}

// ─── The score, as shown ────────────────────────────────────────────────────

/** A multiplier as a reader would write it: 1.625, not 1.63, so the line multiplies back. */
export const factor = (n: number) => String(+n.toFixed(3));

/**
 * `n` printed with the fewest decimals, from `min` up, at which `holds` is true of the printed
 * number. This is how a displayed line is made to multiply back by hand. A base of 2.971 times a
 * static rank of 0.85 is 2.52535, which a reader rounds to 2.53 while the score shown is 2.52; the
 * loop prints one more decimal of the base until the reader's product rounds to the score.
 */
/**
 * True when `product`, rounded by hand to two decimals, is `total`. A product that ends exactly on a
 * five (0.425) does not count: a reader rounds it up, the machine's binary 0.425 rounds down.
 */
function roundsTo(product: number, total: string): boolean {
  const cents = product * 100;
  if (Math.abs(cents - Math.floor(cents) - 0.5) < 1e-6) return false;
  return product.toFixed(2) === total;
}

function fewestDecimals(n: number, min: number, holds: (printed: number) => boolean): string {
  for (let d = min; d <= 10; d++) {
    const printed = n.toFixed(d);
    if (holds(Number(printed))) return printed;
  }
  return n.toFixed(10);
}

export interface ScoreLine {
  /** The sum over terms, to three decimals or as many more as the line needs; "1" for a hit listed by a filter alone. */
  base: string;
  /** True when no term scored and the filters alone listed the document: its base is 1. */
  listedByFilter: boolean;
  /** The multipliers shown after the base, in order. */
  factors: { label: string; value: string }[];
  /** The score, to two decimals. */
  total: string;
  /** False only for a filter-only hit whose exact multipliers cannot land on the rounded score (0.425 is 0.42 or 0.43). */
  exact: boolean;
}

/**
 * The line under a result: base x factors = score, every number as it is printed, so the line can be
 * multiplied by hand and rounds to the score shown. (A filter-only hit has no terms; its base is 1,
 * as `search` computes it.)
 */
export function scoreLine(hit: SearchHit): ScoreLine {
  const { terms, prior, phrases } = hit.explain;
  const listedByFilter = terms.length === 0;
  const sum = terms.reduce((s, t) => s + t.score, 0);
  const factors: ScoreLine["factors"] = [];
  if (prior !== 1) factors.push({ label: "static rank", value: factor(prior) });
  if (phrases > 0) factors.push({ label: "phrase", value: factor(PHRASE_BONUS ** phrases) });
  const total = hit.score.toFixed(2);
  const rest = factors.reduce((p, f) => p * Number(f.value), 1);
  const lands = (base: number) => roundsTo(base * rest, total);
  const base = listedByFilter ? "1" : fewestDecimals(sum, 3, lands);
  return { base, listedByFilter, factors, total, exact: lands(Number(base)) };
}

export interface TermLine {
  weight: string;
  idf: string;
  /** How much the term's count adds once damped: score / (weight x idf), from the numbers as printed. */
  saturation: string;
  score: string;
}

/** One term's row as printed: weight x idf x saturation = score, and the three printed factors round to the printed score. */
export function termLine(t: TermScore): TermLine {
  const weight = t.weight.toFixed(2);
  const idf = t.idf.toFixed(2);
  const score = t.score.toFixed(2);
  const shown = Number(weight) * Number(idf);
  // A term in every document has an idf that prints as 0.00: its score is 0.00 too, and there is nothing to divide by.
  const saturation = shown > 0 ? fewestDecimals(t.score / shown, 2, (sat) => roundsTo(shown * sat, score)) : "0.00";
  return { weight, idf, saturation, score };
}
