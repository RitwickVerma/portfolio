import type { Metadata } from "next";
import { cardMetadata, OG_CARDS } from "@/lib/seo";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import XRay from "@/components/engine/XRay";
import Benchmark from "@/components/engine/Benchmark";
import ReplayLink from "@/components/engine/ReplayLink";
import Section from "@/components/Section";
import { buildCorpus } from "@/lib/corpus";
import { notes } from "@/lib/notes";
import { noteText } from "@/lib/notes.server";
import { buildIndex, CONTROL, TREATMENT } from "@/lib/search";
import { evaluate, JUDGMENTS, type QueryEval } from "@/lib/eval";

const DESCRIPTION =
  "How the search on ritwickverma.dev works: a query taken apart stage by stage, a control-against-treatment replay of judged queries, and a latency benchmark.";

export const metadata: Metadata = {
  title: "The engine room",
  description: DESCRIPTION,
  ...cardMetadata(OG_CARDS.engine, { socialTitle: "The engine room · Ritwick Verma", description: DESCRIPTION }),
};

const SOURCE = "https://gitlab.com/ritwick7/portfolio/-/blob/master/src/lib";
const pct = (n: number) => `${Math.round(n * 100)}%`;
const rank = (n: number) => (n === 0 ? "not found" : n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`);

type Pair = { t: QueryEval; c: QueryEval };

function ReplayTable({ rows }: { rows: Pair[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-[0.95rem]">
        <thead>
          <tr className="fact text-left border-b border-fg">
            <th className="font-normal py-2 pr-4">Query</th>
            <th className="font-normal py-2 pr-4">First relevant result, control</th>
            <th className="font-normal py-2 pr-4">Treatment</th>
            <th className="font-normal py-2 w-[34%]">nDCG at 5: control, then treatment</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ t, c }) => {
            const better = (c.firstRelevant === 0 && t.firstRelevant > 0) || (t.firstRelevant > 0 && t.firstRelevant < c.firstRelevant);
            return (
              <tr key={t.query} className="border-b border-border">
                <td className="py-1.5 pr-4">
                  <ReplayLink query={t.query} />
                </td>
                <td className={`py-1.5 pr-4 ${c.firstRelevant === 0 ? "text-warn" : ""}`}>{rank(c.firstRelevant)}</td>
                <td className={`py-1.5 pr-4 ${better ? "text-ok font-semibold" : ""}`}>{rank(t.firstRelevant)}</td>
                <td className="py-1.5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 space-y-0.5" aria-hidden="true">
                      <div className="h-1.5 bg-fg/30" style={{ width: `${Math.max(1, c.ndcg * 100)}%` }} />
                      <div className="h-1.5 bg-fg" style={{ width: `${Math.max(1, t.ndcg * 100)}%` }} />
                    </div>
                    <span className="font-mono text-[0.7rem] text-muted whitespace-nowrap">
                      {c.ndcg.toFixed(2)}, {t.ndcg.toFixed(2)}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function EnginePage() {
  // Computed at build, from the same corpus the browser builds.
  const index = buildIndex(buildCorpus(notes.map((n) => noteText(n.slug))));
  const control = evaluate(index, CONTROL);
  const treatment = evaluate(index, TREATMENT);
  const lines = Math.round(readFileSync(join(process.cwd(), "src/lib/search.ts"), "utf8").split("\n").length / 50) * 50;
  // Every judged query, paired; the ones the two rankers answer differently come first.
  const pairs = treatment.queries.map((t, i) => ({ t, c: control.queries[i] }));
  const differs = ({ t, c }: (typeof pairs)[number]) => t.firstRelevant !== c.firstRelevant || Math.abs(t.ndcg - c.ndcg) > 0.005;
  const differing = pairs.filter(differs);
  const agreeing = pairs.filter((p) => !differs(p));
  const changed = differing.length;

  const metrics = [
    { label: "First result is relevant", control: pct(control.p1), treatment: pct(treatment.p1) },
    { label: "Mean reciprocal rank", control: control.mrr.toFixed(2), treatment: treatment.mrr.toFixed(2) },
    { label: "nDCG at 5", control: control.ndcg.toFixed(2), treatment: treatment.ndcg.toFixed(2) },
  ];

  return (
    <>
      <header className="max-w-[var(--page)] mx-auto px-5 sm:px-8 pt-12 sm:pt-16 pb-14">
        <h1 className="wd-wide text-[clamp(2.75rem,8vw,6.5rem)] font-black leading-[0.9] -ml-[0.04em]">The engine room</h1>
        <p className="mt-6 text-lede leading-[1.3] max-w-[44ch]">
          The search box on this site is a small search engine: {index.docs.length} documents, {index.terms.length.toLocaleString("en-US")} terms, about {lines} lines
          of TypeScript and no dependencies. This page opens it up.
        </p>
        <p className="mt-4 text-fg/80 max-w-[60ch]">
          It is not Cassini and has nothing of eBay&apos;s in it. It is the textbook version of the things I worked on there, built so that every step can be
          seen, and held to the same habits: a judged query set, a control to compare against, and a replay before any change to the ranking.
        </p>
      </header>

      <Section
        id="xray"
        title="One query, taken apart."
        lede={<p>Type anything. Each stage shows what the engine holds at that point, down to the posting lists and the arithmetic behind every score.</p>}
      >
        <XRay />
      </Section>

      <Section
        id="replay"
        title={`${JUDGMENTS.length} judged queries, replayed against a control.`}
        lede={
          <>
            <p>
              For each query I wrote down which documents ought to come back and how good an answer each is. The table replays all of them through plain
              BM25 and through what the site runs. {changed} of {JUDGMENTS.length} come out differently.
            </p>
            <p className="fact">
              I wrote the engine and the judgments both, so read this as a regression guard and not a benchmark. The same numbers run as a unit test, and a
              change that costs relevance fails the build.
            </p>
          </>
        }
      >
        <dl className="grid sm:grid-cols-3 gap-x-8 gap-y-6 mb-12">
          {metrics.map((m) => (
            <div key={m.label} className="border-t-2 border-fg pt-3">
              <dt className="fact">{m.label}</dt>
              <dd className="mt-1 flex items-baseline gap-3">
                <span className="wd-narrow font-black text-5xl leading-none">{m.treatment}</span>
                <span className="fact">from {m.control} in the control</span>
              </dd>
            </div>
          ))}
        </dl>

        <div data-replay-differ>
          <ReplayTable rows={differing} />
        </div>
        {agreeing.length > 0 && (
          <details className="mt-6" data-replay-agree>
            <summary className="link cursor-pointer inline-flex items-center min-h-11">
              Show the other {agreeing.length} {agreeing.length === 1 ? "query" : "queries"}, where both rankers agree
            </summary>
            <div className="mt-2">
              <ReplayTable rows={agreeing} />
            </div>
          </details>
        )}
        <p className="fact mt-4 max-w-[72ch]">
          The control is BM25 over title, tags and text with equal weight and nothing else. The treatment adds field weights, the query rewriter, a nearest
          spelling for a word nothing matched, and a static rank per document. Click a query to take it apart above.
        </p>
      </Section>

      <Section
        id="latency"
        title="How fast, measured on your machine."
        lede={<p>A number I measured on mine would tell you about my laptop. This one runs here.</p>}
      >
        <Benchmark />
      </Section>

      <Section id="source" title="All of it is a short read." lede={<p>Pure functions, no DOM, every behaviour above pinned by a test.</p>}>
        <ul className="border-b border-border">
          {[
            ["search.ts", "Tokenizer, query language, rewriter, spelling, inverted index, BM25, the score breakdown."],
            ["corpus.ts", "The documents: built from the same data that renders the pages, plus every section of every note."],
            ["eval.ts", "The judged queries and the metrics: first-result relevance, reciprocal rank, nDCG."],
            ["search.test.ts", "What the engine must do. The other two have tests beside them too."],
          ].map(([file, what]) => (
            <li key={file} className="border-t border-border py-3 grid sm:grid-cols-[14rem_1fr] gap-x-8">
              <a href={`${SOURCE}/${file}`} target="_blank" rel="noopener noreferrer" className="font-mono text-sm link justify-self-start">
                src/lib/{file}
              </a>
              <span className="text-fg/85">{what}</span>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
