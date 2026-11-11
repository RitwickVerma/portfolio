import { snippet } from "@/lib/search";
import type { SimilarResult } from "@/lib/similar";
import { Marked, ResultLink, hrefFor } from "@/components/search/parts";

/**
 * The foot of a note: what else the site holds that is about the same things. Drawn from a
 * SimilarResult (lib/similar.ts, computed at build by the page); this only lays it out, so it is
 * server HTML and needs no JavaScript. The score is the one the search box gives the same query,
 * and "Why?" opens the box with that query so the arithmetic can be seen there.
 */
export default function Related({ result }: { result: SimilarResult }) {
  const { query, hits } = result;
  const why = `/?q=${encodeURIComponent(query)}`;
  return (
    <section aria-labelledby="related-title" data-related className="mt-16 pt-6 border-t-2 border-fg max-w-[44rem]">
      <h2 id="related-title" className="wd-semi text-[clamp(1.4rem,3vw,1.9rem)] font-extrabold leading-[1.1]">
        What else here is about the same things, by the engine&apos;s reckoning.
      </h2>
      <p className="fact mt-3 max-w-[60ch]">
        The engine used this note as the query: <span className="font-mono text-[0.8em] break-words">{query}</span>.
      </p>
      <ol className="mt-6 border-b border-border">
        {hits.map(({ doc, score, matched }) => (
          <li key={doc.id} data-related-row className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-[6rem_minmax(0,1fr)_auto] gap-x-5 gap-y-1 py-4 border-t border-border">
            <p className="fact sm:pt-1.5">{doc.kind}</p>
            <div className="min-w-0">
              <h3>
                <ResultLink href={hrefFor(doc, query)} className="link text-lg font-semibold leading-snug">
                  <Marked text={doc.title} stems={matched} />
                </ResultLink>
              </h3>
              <p className="fact mt-0.5">{doc.context}</p>
              <p className="mt-1.5 text-fg/85">
                <Marked text={snippet(doc.text, matched)} stems={matched} />
              </p>
            </div>
            <p className="fact sm:pt-1.5 sm:text-right">
              Score <span data-related-score>{score.toFixed(2)}</span>
              <span aria-hidden="true">, </span>
              <a href={why} className="link">
                Why?
                <span className="sr-only"> Open the search box with this query to see how {doc.title} scored</span>
              </a>
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
