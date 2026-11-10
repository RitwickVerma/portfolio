// Stationary block bootstrap of a return series, ported from plutus/metrics.py
// (stationary_bootstrap, Politis and Romano 1994): walk the series; at each step
// continue to the next observation with probability 1 - 1/meanBlock, otherwise
// jump to a random one; wrap around at the end. The repo does it on daily
// returns with a mean block of 21 days; the figure does it on weekly points.
// Statistics are the repo's too: Sharpe from the sample mean and standard
// deviation (ddof 1, rf 0), CAGR from the compounded total, drawdown from the
// running peak.

import { mulberry32 } from "./rng";

export function returnsOf(values: ReadonlyArray<number>): number[] {
  const r: number[] = [];
  for (let i = 1; i < values.length; i++) r.push(values[i] / values[i - 1] - 1);
  return r;
}

/** Linear interpolation between order statistics, as numpy's default. `sorted` ascending, q in [0, 100]. */
export function percentile(sorted: ArrayLike<number>, q: number): number {
  const pos = (q / 100) * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export interface PathStats {
  cagr: number;
  maxDrawdown: number;
  sharpe: number;
}

/** Statistics of one path of periodic returns spanning `years`. */
export function pathStats(returns: ArrayLike<number>, years: number): PathStats {
  const n = returns.length;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += returns[i];
  const mean = sum / n;
  let ss = 0;
  for (let i = 0; i < n; i++) ss += (returns[i] - mean) * (returns[i] - mean);
  const sd = Math.sqrt(ss / (n - 1));
  let eq = 1;
  let peak = 1;
  let mdd = 0;
  for (let i = 0; i < n; i++) {
    eq *= 1 + returns[i];
    if (eq > peak) peak = eq;
    const dd = eq / peak - 1;
    if (dd < mdd) mdd = dd;
  }
  return {
    cagr: Math.pow(eq, 1 / years) - 1,
    maxDrawdown: mdd,
    sharpe: sd > 0 ? (mean / sd) * Math.sqrt(n / years) : 0,
  };
}

export interface BootstrapOptions {
  samples: number;
  /** Mean block length in periods; 1 is the plain iid bootstrap. */
  meanBlock: number;
  seed: number;
  /** How many resampled equity paths to keep for drawing, each thinned to every `pathStep` periods. */
  paths?: number;
  pathStep?: number;
}

export interface Bootstrap {
  cagr: number[];
  maxDrawdown: number[];
  sharpe: number[];
  paths: number[][];
}

export function stationaryBootstrap(returns: ReadonlyArray<number>, years: number, o: BootstrapOptions): Bootstrap {
  const n = returns.length;
  const rng = mulberry32(o.seed);
  const p = 1 / Math.max(1, o.meanBlock);
  const keep = o.paths ?? 0;
  const step = o.pathStep ?? 5;
  const out: Bootstrap = { cagr: [], maxDrawdown: [], sharpe: [], paths: [] };
  const sample = new Float64Array(n);
  for (let k = 0; k < o.samples; k++) {
    let i = Math.floor(rng() * n);
    for (let j = 0; j < n; j++) {
      if (j > 0 && rng() < p) i = Math.floor(rng() * n);
      sample[j] = returns[i];
      i = (i + 1) % n;
    }
    const s = pathStats(sample, years);
    out.cagr.push(s.cagr);
    out.maxDrawdown.push(s.maxDrawdown);
    out.sharpe.push(s.sharpe);
    if (k < keep) {
      const path = [1];
      let eq = 1;
      for (let j = 0; j < n; j++) {
        eq *= 1 + sample[j];
        if ((j + 1) % step === 0 || j === n - 1) path.push(eq);
      }
      out.paths.push(path);
    }
  }
  return out;
}

export interface Summary {
  median: number;
  lo: number;
  hi: number;
  /** Share of resamples at or below the actual value, 0 to 1. */
  rank: number;
}

export function summarize(values: ReadonlyArray<number>, actual: number): Summary {
  const s = Float64Array.from(values).sort();
  let below = 0;
  for (const v of values) if (v <= actual) below++;
  return { median: percentile(s, 50), lo: percentile(s, 2.5), hi: percentile(s, 97.5), rank: below / values.length };
}

export function histogram(values: ReadonlyArray<number>, bins: number, lo: number, hi: number): number[] {
  const c = new Array<number>(bins).fill(0);
  const w = (hi - lo) / bins || 1;
  for (const v of values) c[Math.min(bins - 1, Math.max(0, Math.floor((v - lo) / w)))]++;
  return c;
}
