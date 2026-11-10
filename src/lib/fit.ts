import { search, tokenize, TREATMENT, REWRITE_SURFACE, type RankerConfig, type SearchHit, type SearchIndex } from "./search";
import { LEXICON, LEXICON_ALIASES, CASE_SENSITIVE, NEAREST_ON_SITE } from "./lexicon";
import { isAboutThisSite } from "./corpus";

// The fit check: paste a job description, and for each skill it names the
// search index says whether my record covers it, with the evidence.
//
// It is the same engine as the search box, run once per requirement. A
// multi-word skill is looked up as a phrase, so "distributed systems" is not
// satisfied by a library management system. A skill found only through the
// query rewriter (Terraform -> OpenTofu) is reported as adjacent, not as a
// match. A skill the index lacks is reported as missing. Nothing is sent
// anywhere: the text never leaves the page.

export type FitStatus = "direct" | "adjacent" | "missing";

export interface FitTerm {
  /** The skill, as the lexicon spells it. */
  label: string;
  status: FitStatus;
  /** For an adjacent match: the words on this site that stood in for it. */
  via: string[];
  /** Best evidence first. Empty when missing. */
  evidence: SearchHit[];
}

export interface FitReport {
  terms: FitTerm[];
  counts: Record<FitStatus, number>;
  /** "5+ years" in the text, against the years I have. Absent when the text names none. */
  years?: { asked: number; have: number };
}

const key = (text: string) => tokenize(text).join(" ");

/** Lexicon lookup: stemmed key -> label. Aliases point at the same labels. */
const LOOKUP: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const label of LEXICON) map.set(key(label), label);
  for (const [alias, label] of Object.entries(LEXICON_ALIASES)) map.set(key(alias), label);
  map.delete("");
  return map;
})();
const LONGEST = Math.max(...[...LOOKUP.keys()].map((k) => k.split(" ").length));

/** The skills a text names, in the order it names them, longest phrase first at each position. */
export function extractSkills(text: string): string[] {
  const found: { label: string; at: number }[] = [];
  const seen = new Set<string>();
  const add = (label: string, at: number) => {
    if (seen.has(label)) return;
    seen.add(label);
    found.push({ label, at });
  };

  for (const { label, pattern } of CASE_SENSITIVE) {
    const m = text.match(pattern);
    if (m) add(label, 0);
  }

  // Sentence by sentence, so a phrase cannot span a full stop.
  let position = 1;
  for (const sentence of text.split(/[.;:!?\n]+/)) {
    const tokens = tokenize(sentence);
    for (let i = 0; i < tokens.length; ) {
      let step = 1;
      for (let n = Math.min(LONGEST, tokens.length - i); n >= 1; n--) {
        const label = LOOKUP.get(tokens.slice(i, i + n).join(" "));
        if (label) {
          add(label, position + i);
          step = n;
          break;
        }
      }
      i += step;
    }
    position += tokens.length + 1;
  }
  return found.sort((a, b) => a.at - b.at).map((f) => f.label);
}

const LOOKUP_CONFIG: RankerConfig = { ...TREATMENT, prefix: false, fuzzy: false };
const EVIDENCE = 2;

/** Ask the index about one skill. */
export function checkSkill(index: SearchIndex, label: string): FitTerm {
  const words = tokenize(label);
  const query = words.length > 1 ? `"${label}" ` : `${label} `;
  // The colophon describes this site's own search box; it is not evidence of anything else.
  // Nor is a lab guest: Vaultwarden being written in Rust does not mean I write Rust.
  // Nor is a note: "ranking" in an essay about a momentum strategy is not ranking experience.
  // Evidence is the record: work, projects, skills, education.
  const lookup = (q: string) =>
    search(index, q, LOOKUP_CONFIG).hits.filter((h) => !isAboutThisSite(h.doc.id) && h.doc.kind !== "Homelab" && h.doc.kind !== "Note" && h.doc.kind !== "Page");
  const hits = lookup(query);
  if (hits.length === 0) {
    // A phrase the site never writes may still have a plain-words neighbour: "CI/CD" -> "CI".
    const near = NEAREST_ON_SITE[label];
    const nearHits = near ? lookup(`${near} `) : [];
    if (nearHits.length === 0) return { label, status: "missing", via: [], evidence: [] };
    return { label, status: "adjacent", via: near.split(" "), evidence: nearHits.slice(0, EVIDENCE) };
  }

  // Direct when some document holds the skill's own words; adjacent when only a rewrite reached it.
  const own = new Set(words);
  const directHits = hits.filter((h) => h.explain.terms.some((t) => own.has(t.term)));
  if (directHits.length > 0) return { label, status: "direct", via: [], evidence: directHits.slice(0, EVIDENCE) };

  // Shown to a reader, so as the words were written, not as their stems.
  const via = [...new Set(hits.slice(0, EVIDENCE).flatMap((h) => h.explain.terms.map((t) => REWRITE_SURFACE.get(t.term) ?? t.term)))];
  return { label, status: "adjacent", via, evidence: hits.slice(0, EVIDENCE) };
}

/**
 * The years of experience a posting asks for, or null. A number of years only
 * counts when the text ties it to experience ("5+ years of experience", "at
 * least 5 years"), so "must be 18 years or older" and "founded 12 years ago"
 * are not read as requirements.
 */
export function yearsAsked(text: string): number | null {
  const patterns = [
    /(\d{1,2})\s*\+?\s*(?:or more\s+)?years?['’]?\s+(?:of\s+)?(?:[\w+#./-]+\s+){0,4}?experience/i,
    /(?:at least|minimum(?: of)?|a minimum of|more than|over)\s+(\d{1,2})\s*\+?\s*years?\b(?!\s+(?:old|of age|ago))/i,
    /experience\s*(?:of|:)?\s*(\d{1,2})\s*\+?\s*years?/i,
  ];
  for (const re of patterns) {
    const n = Number(text.match(re)?.[1]);
    if (n > 0 && n <= 30) return n;
  }
  return null;
}

export function fitReport(index: SearchIndex, text: string, yearsHave: number): FitReport {
  const terms = extractSkills(text).map((label) => checkSkill(index, label));
  const counts: Record<FitStatus, number> = { direct: 0, adjacent: 0, missing: 0 };
  for (const t of terms) counts[t.status] += 1;
  const asked = yearsAsked(text);
  return { terms, counts, ...(asked !== null ? { years: { asked, have: yearsHave } } : {}) };
}

/** A made-up posting for the "try a sample" button. No real company. */
export const SAMPLE_JD = `Senior Backend Engineer, Search Infrastructure

We are looking for an engineer with 5+ years of experience building large-scale distributed systems in C++ or Java. You will own the query understanding and ranking components of our search engine, reduce latency with caching, and design A/B testing for relevance changes.

You write unit tests and regression tests, debug production issues on Linux, and work closely with machine learning teams. Experience with information retrieval, Elasticsearch or Lucene, Kubernetes and gRPC is a plus. Familiarity with Python, Docker and CI/CD is expected.`;
