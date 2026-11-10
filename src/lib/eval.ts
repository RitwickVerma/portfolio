import { search, type RankerConfig, type SearchIndex } from "./search";

// A judged query set: for each query a hiring manager might type, the
// documents that ought to come back and how good an answer each is. It is the
// site's own small relevance benchmark. The engine-room page replays it
// against a control and a treatment ranker, and eval.test.ts fails if the
// treatment's numbers drop.
//
// Grade 2 is the answer I would give in person; grade 1 is a fair answer.
// A key ending in * judges every document whose id starts with it.
//
// Every query here is spelt correctly. A misspelt one would score zero in the
// control by construction (it has no spelling fallback) and flatter the
// treatment; spelling is tested on its own in search.test.ts.

export interface Judgment {
  query: string;
  relevant: Record<string, 1 | 2>;
}

export const JUDGMENTS: Judgment[] = [
  { query: "fitment", relevant: { "work-0-0": 2, "work-1-0": 2, "work-*": 1 } },
  { query: "c++", relevant: { "work-*": 2, "project-rpg-engine": 2, "skills-languages": 1, "skills-tools": 1 } },
  { query: "caching", relevant: { "work-0-3": 2, "skills-domains": 1, "page-resume": 1 } },
  { query: "traffic replay", relevant: { "work-0-2": 2, "skills-domains": 1, "work-1-2": 1 } },
  { query: "tests", relevant: { "work-1-0": 2, "work-0-1": 2, "work-0-5": 2, "work-0-2": 1, "project-kwin-canvas": 1, "project-sudostamp": 1, "note-tizen-video-plane-ambilight--tests": 1 } },
  { query: "testing", relevant: { "work-1-0": 2, "work-0-1": 2, "work-0-5": 2, "work-0-2": 2, "work-1-2": 2, "skills-domains": 1, "skills-tools": 1 } },
  { query: "reverse engineering", relevant: { "note-crush80-open-firmware": 2, "note-tizen-video-plane-ambilight": 2, "project-crush80-firmware": 2, "skills-domains": 1, "note-crush80-open-firmware--*": 1 } },
  { query: "android", relevant: { "project-shutup": 2, "earlier-0": 2, "project-sudostamp": 1, "project-kaeru": 1, "skills-domains": 1 } },
  { query: "homelab", relevant: { "project-homelab": 2, "note-homelab-git-is-the-truth": 2, "note-homelab-git-is-the-truth--*": 1 } },
  { query: "infrastructure", relevant: { "project-homelab": 2, "note-homelab-git-is-the-truth": 2, "skills-tools": 1, "note-homelab-git-is-the-truth--*": 1 } },
  { query: "kotlin", relevant: { "project-sudostamp": 2, "project-kaeru": 2, "project-shutup": 1, "skills-languages": 1 } },
  { query: "python", relevant: { "project-plutus": 2, "skills-languages": 1, "project-gesture-manager-x": 1, "earlier-1": 1, "note-plutus-what-the-backtest-cannot-tell-you*": 1 } },
  { query: "resume", relevant: { "page-resume": 2 } },
  { query: "email", relevant: { "page-contact": 2 } },
  { query: "hdr", relevant: { "project-tizen-ambilight": 2, "note-tizen-video-plane-ambilight": 2, "note-tizen-video-plane-ambilight--colour-the-plane-is-pq-the-leds-are-not": 2, "note-tizen-video-plane-ambilight--*": 1 } },
  { query: "backtest", relevant: { "note-plutus-what-the-backtest-cannot-tell-you": 2, "project-plutus": 2, "note-plutus-what-the-backtest-cannot-tell-you--*": 1 } },
  { query: "firmware", relevant: { "project-crush80-firmware": 2, "note-crush80-open-firmware": 2, "note-crush80-open-firmware--*": 1 } },
  { query: "tokenizer", relevant: { "work-0-5": 2, "work-1-2": 1 } },
  { query: "a/b testing", relevant: { "work-1-2": 2, "skills-domains": 1 } },
  { query: "allocators", relevant: { "work-1-2": 2 } },
  { query: "opentofu", relevant: { "project-homelab": 2, "note-homelab-git-is-the-truth": 2, "note-homelab-git-is-the-truth--declared-then-imported": 2, "skills-tools": 1, "note-homelab-git-is-the-truth--*": 1 } },
  { query: "education", relevant: { "education-0": 2, "education-1": 2 } },
  { query: "leadership", relevant: { "work-0-0": 2, "work-0-1": 2, "work-1-0": 1 } },
  { query: "performance", relevant: { "work-0-3": 2, "work-1-1": 2, "work-1-2": 1 } },
  { query: "keyboard", relevant: { "project-crush80-firmware": 2, "note-crush80-open-firmware": 2, "note-crush80-open-firmware--*": 1 } },
  { query: "survivorship bias", relevant: { "project-plutus": 2, "note-plutus-what-the-backtest-cannot-tell-you--what-the-number-cannot-say": 2, "note-plutus-what-the-backtest-cannot-tell-you": 1 } },
  { query: "sudo", relevant: { "project-sudostamp": 2 } },
  { query: "samsung tv", relevant: { "project-tizen-ambilight": 2, "note-tizen-video-plane-ambilight": 2, "note-tizen-video-plane-ambilight--*": 1 } },
  { query: "paging", relevant: { "note-homelab-git-is-the-truth--paging-without-noise": 2, "project-homelab": 1 } },
  { query: "query transforms", relevant: { "work-0-4": 2, "work-0-1": 2, "work-0-5": 1 } },
  { query: "latency", relevant: { "work-1-1": 2, "work-0-3": 1 } },
  { query: "backups", relevant: { "note-homelab-git-is-the-truth--backups-both-kinds": 2, "lab-CT108": 2 } },
  { query: "internship", relevant: { "earlier-*": 2, "page-resume": 1 } },
  { query: "mobile", relevant: { "project-shutup": 2, "earlier-0": 2, "project-sudostamp": 1, "project-kaeru": 1 } },
  { query: "ai", relevant: { "note-colophon--how-it-was-made": 2, "project-shutup": 1, "project-tizen-ambilight": 1, "project-kwin-canvas": 1, "lab-CT101": 1, "note-colophon": 1 } },
];

/** The grade a document earns for a judgment: an exact key first, then the longest matching prefix key. */
export function gradeOf(judgment: Judgment, id: string): number {
  const exact = judgment.relevant[id];
  if (exact !== undefined) return exact;
  let best = 0;
  let bestLength = -1;
  for (const [key, grade] of Object.entries(judgment.relevant)) {
    if (!key.endsWith("*")) continue;
    const prefix = key.slice(0, -1);
    if (id.startsWith(prefix) && prefix.length > bestLength) {
      best = grade;
      bestLength = prefix.length;
    }
  }
  return best;
}

export interface QueryEval {
  query: string;
  /** Ids of the top results, best first. */
  top: string[];
  /** 1-based rank of the first relevant result; 0 when none came back. */
  firstRelevant: number;
  ndcg: number;
}

export interface EvalSummary {
  queries: QueryEval[];
  /** Share of queries whose first result is relevant. */
  p1: number;
  /** Mean reciprocal rank of the first relevant result. */
  mrr: number;
  /** Mean nDCG at 5. */
  ndcg: number;
}

const K = 5;
const dcg = (grades: number[]) => grades.reduce((sum, g, i) => sum + (2 ** g - 1) / Math.log2(i + 2), 0);

export function evaluateQuery(index: SearchIndex, judgment: Judgment, config: RankerConfig): QueryEval {
  // A trailing space marks the query as finished, so prefix matching does not flatter it.
  const hits = search(index, `${judgment.query} `, config).hits;
  const grades = hits.map((h) => gradeOf(judgment, h.doc.id));
  const ideal = index.docs
    .map((d) => gradeOf(judgment, d.id))
    .filter((g) => g > 0)
    .sort((a, b) => b - a)
    .slice(0, K);
  const idealDcg = dcg(ideal);
  return {
    query: judgment.query,
    top: hits.slice(0, K).map((h) => h.doc.id),
    firstRelevant: grades.findIndex((g) => g > 0) + 1,
    ndcg: idealDcg === 0 ? 0 : dcg(grades.slice(0, K)) / idealDcg,
  };
}

export function evaluate(index: SearchIndex, config: RankerConfig, judgments: Judgment[] = JUDGMENTS): EvalSummary {
  const queries = judgments.map((j) => evaluateQuery(index, j, config));
  const mean = (f: (q: QueryEval) => number) => queries.reduce((sum, q) => sum + f(q), 0) / Math.max(1, queries.length);
  return {
    queries,
    p1: mean((q) => (q.firstRelevant === 1 ? 1 : 0)),
    mrr: mean((q) => (q.firstRelevant > 0 ? 1 / q.firstRelevant : 0)),
    ndcg: mean((q) => q.ndcg),
  };
}
