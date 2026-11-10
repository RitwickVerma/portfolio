"use client";

import { useEffect, useRef, useState } from "react";
import { search } from "@/lib/search";
import { JUDGMENTS } from "@/lib/eval";
import { useSearchIndex } from "@/lib/useSearchIndex";

// A latency benchmark that runs in the reader's own tab. The judged queries
// are run in batches; each batch is timed as a whole and divided, because one
// query is shorter than the browser clock's resolution. What is plotted is
// the distribution of those per-batch means. One batch runs first and is
// thrown away: the first calls are the engine being compiled, not searching.

const BATCH = 100;
const BATCHES = 60;
const BINS = 24;

interface Outcome {
  samples: number[]; // microseconds per query, one per batch
  /** Time spent inside search(), summed over the timed batches. */
  searchMs: number;
}

const percentile = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];

export default function Benchmark() {
  const { index, buildMs } = useSearchIndex();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const cancelled = useRef(false);

  // Leaving the page stops a run in progress instead of letting it finish unseen.
  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
    };
  }, []);

  const run = () => {
    setOutcome(null);
    setProgress(0);
    const queries = JUDGMENTS.map((j) => `${j.query} `);
    const samples: number[] = [];
    let q = 0;
    let warmed = false;

    const step = () => {
      if (cancelled.current) return;
      if (!warmed) {
        for (let i = 0; i < BATCH; i++) search(index, queries[q++ % queries.length]);
        warmed = true;
      }
      // A few batches per turn, then yield so the page stays responsive.
      for (let n = 0; n < 6 && samples.length < BATCHES; n++) {
        const t0 = performance.now();
        for (let i = 0; i < BATCH; i++) search(index, queries[q++ % queries.length]);
        samples.push(((performance.now() - t0) / BATCH) * 1000);
      }
      setProgress(samples.length / BATCHES);
      if (samples.length < BATCHES) window.setTimeout(step, 0);
      else {
        setOutcome({ samples, searchMs: (samples.reduce((a, b) => a + b, 0) * BATCH) / 1000 });
        setProgress(null);
      }
    };
    window.setTimeout(step, 0);
  };

  const sorted = outcome ? [...outcome.samples].sort((a, b) => a - b) : [];
  const lo = sorted[0] ?? 0;
  const hi = sorted[sorted.length - 1] ?? 1;
  const span = Math.max(hi - lo, 1e-6);
  const bins = Array.from({ length: BINS }, () => 0);
  for (const s of sorted) bins[Math.min(BINS - 1, Math.floor(((s - lo) / span) * BINS))] += 1;
  const tallest = Math.max(1, ...bins);

  const stats = outcome
    ? [
        { label: "Median", value: percentile(sorted, 50) },
        { label: "95th percentile", value: percentile(sorted, 95) },
        { label: "Slowest batch", value: hi },
      ]
    : [];

  return (
    <div className="grid lg:grid-cols-12 gap-x-8 gap-y-6">
      <div className="lg:col-span-4">
        <button type="button" className="btn" onClick={run} disabled={progress !== null}>
          {progress !== null ? `Running, ${Math.round(progress * 100)}%` : outcome ? "Run it again" : `Run ${(BATCH * BATCHES).toLocaleString("en-US")} queries`}
        </button>
        <p className="fact mt-3 max-w-[38ch]">
          The {JUDGMENTS.length} judged queries, over and over, against the {index.docs.length} documents in this tab
          {buildMs !== null ? ` (indexed in ${buildMs.toFixed(1)} ms)` : ""}. Your machine, your browser, your numbers.
        </p>
      </div>

      <div className="lg:col-span-8" aria-live="polite">
        {!outcome ? (
          <div className="border border-dashed border-border rounded-[var(--r-box)] p-6 min-h-40 flex items-center">
            <p className="text-fg/80 max-w-[52ch]">
              {progress !== null ? "Measuring." : "Nothing measured yet. The result is a histogram of time per query, with the median and the tail."}
            </p>
          </div>
        ) : (
          <>
            <dl className="grid grid-cols-3 gap-x-6 mb-5">
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="fact">{s.label}</dt>
                  <dd className="wd-narrow font-black text-3xl sm:text-4xl leading-none mt-1">
                    {s.value < 10 ? s.value.toFixed(1) : Math.round(s.value)}
                    <span className="text-base font-semibold ml-1">µs</span>
                  </dd>
                </div>
              ))}
            </dl>
            <svg viewBox={`0 0 ${BINS * 10} 60`} preserveAspectRatio="none" className="w-full h-28 border-b border-fg" role="img" aria-label={`Histogram of time per query across ${BATCHES} batches, from ${lo.toFixed(1)} to ${hi.toFixed(1)} microseconds`}>
              {bins.map((count, i) => (
                <rect key={i} x={i * 10 + 0.5} width={9} y={60 - (count / tallest) * 58} height={(count / tallest) * 58} fill="var(--fg)" />
              ))}
            </svg>
            <p className="fact flex justify-between mt-1.5">
              <span>{lo.toFixed(1)} µs</span>
              <span>time per query, one sample per batch of {BATCH}</span>
              <span>{hi.toFixed(1)} µs</span>
            </p>
            <p className="mt-4 text-fg/85 max-w-[60ch]">
              {(BATCH * BATCHES).toLocaleString("en-US")} queries in {outcome.searchMs.toFixed(0)} ms of search time
              {outcome.searchMs > 0 ? `: about ${(Math.round((BATCH * BATCHES) / (outcome.searchMs / 1000) / 100) * 100).toLocaleString("en-US")} a second on one thread` : ", too quick for this browser's clock to resolve"}
              . Each sample is a mean over a batch, so
              a single slow query hides inside it; this shows the shape, not the worst case. The queries run as finished words, so completing a half-typed word is not in
              these numbers.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
