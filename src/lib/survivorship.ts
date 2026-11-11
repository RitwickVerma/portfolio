// A toy market for the survivorship figure. Everything here is made up.
//
// Every stock has the same expected return and the same chance of being delisted
// each month, whatever it did before, so a rule that ranks stocks by past return
// has nothing to find. A delisting month is a flat -40%. Pick your stocks from the
// ones still listed at the end and you have used the future to choose the past:
// you never hold a stock in the month it is delisted.
//
// (An earlier version made a fallen stock four times as likely to be delisted.
// That gave past returns real information: the rule beat the market by about
// 1.4 points a year on the honest universe, which the figure's text denied.)
//
// The rule is the repo's idea in spirit, not its code: each month rank by the
// return from 12 months ago to one month ago (the repo skips the most recent
// 10 trading days and blends 6 and 12 months), hold the top K equal-weight for
// a month. No costs, no filters, no regime switch.

import { mulberry32, normal, mix } from "./rng";

export interface ToyParams {
  seed: number;
  stocks: number;
  /** Months simulated; the first 12 are history for the signal. */
  months: number;
  /** Chance per year that a healthy stock is delisted; a stock down over half from its high is 4x. */
  delistRate: number;
  picks: number;
}

export const TOY: ToyParams = { seed: 7, stocks: 300, months: 132, delistRate: 0.1, picks: 20 };

export const DRIFT = 0.006;
export const VOL = 0.11;
export const DELIST_RETURN = -0.4;
export const WARMUP = 12;

export type Universe = "survivors" | "then";

export interface World {
  params: ToyParams;
  /** prices[i][t] for t = 0 .. min(last[i], months); stocks start at 1. */
  prices: Float64Array[];
  /** The month a stock is delisted (its return that month is DELIST_RETURN), or months + 1 if it never is. */
  last: Int32Array;
}

/** The same seed gives the same price paths whatever the delisting rate; the rate only decides who disappears. */
export function makeWorld(p: ToyParams): World {
  const prices: Float64Array[] = [];
  const last = new Int32Array(p.stocks);
  for (let i = 0; i < p.stocks; i++) {
    const rz = mulberry32(mix(p.seed, i));
    const ru = mulberry32(mix(p.seed ^ 0x5bd1e995, i));
    const path = new Float64Array(p.months + 1);
    path[0] = 1;
    let gone = p.months + 1;
    for (let t = 1; t <= p.months; t++) {
      const r = Math.max(-0.9, DRIFT + VOL * normal(rz));
      const u = ru();
      const prev = path[t - 1];
      const hazard = p.delistRate / 12;
      if (u < hazard) {
        path[t] = prev * (1 + DELIST_RETURN);
        gone = t;
        break;
      }
      path[t] = prev * (1 + r);
    }
    prices.push(gone <= p.months ? path.subarray(0, gone + 1) : path);
    last[i] = gone;
  }
  return { params: p, prices, last };
}

export interface ToyRun {
  /** Growth of 1 at each rebalance, index 0 = 1. */
  strategy: number[];
  /** Equal-weight of every stock that existed that month, the honest yardstick. */
  market: number[];
  strategyCagr: number;
  marketCagr: number;
  /** Months in which a pick was delisted while held. */
  delistedPicks: number;
  /** Share of the stocks the rule could have picked from, averaged over months. */
  eligibleShare: number;
}

function cagr(growth: number, months: number): number {
  return Math.pow(growth, 12 / months) - 1;
}

export function runToy(world: World, universe: Universe): ToyRun {
  const { params: p, prices, last } = world;
  const strategy = [1];
  const market = [1];
  let delistedPicks = 0;
  let eligibleSum = 0;
  let steps = 0;
  const ids: number[] = [];
  const signal = new Float64Array(p.stocks);
  for (let t = WARMUP; t < p.months; t++) {
    ids.length = 0;
    let existed = 0;
    let marketSum = 0;
    for (let i = 0; i < p.stocks; i++) {
      if (t >= last[i]) continue; // not listed at the end of month t
      existed++;
      marketSum += prices[i][t + 1] / prices[i][t] - 1;
      if (universe === "survivors" && last[i] <= p.months) continue;
      signal[i] = prices[i][t - 1] / prices[i][t - WARMUP] - 1;
      ids.push(i);
    }
    ids.sort((a, b) => signal[b] - signal[a] || a - b);
    const top = ids.slice(0, p.picks);
    let sum = 0;
    for (const i of top) {
      sum += prices[i][t + 1] / prices[i][t] - 1;
      if (last[i] === t + 1) delistedPicks++;
    }
    strategy.push(strategy[strategy.length - 1] * (1 + (top.length ? sum / top.length : 0)));
    market.push(market[market.length - 1] * (1 + (existed ? marketSum / existed : 0)));
    eligibleSum += ids.length / Math.max(1, existed);
    steps++;
  }
  return {
    strategy,
    market,
    strategyCagr: cagr(strategy[steps], steps),
    marketCagr: cagr(market[steps], steps),
    delistedPicks,
    eligibleShare: eligibleSum / Math.max(1, steps),
  };
}

export interface Average {
  worlds: number;
  market: number;
  then: number;
  survivors: number;
}

/** Mean CAGR over `worlds` consecutive seeds, so one lucky draw cannot stand for the rule. */
export function averageOver(p: ToyParams, worlds: number): Average {
  let market = 0;
  let then = 0;
  let survivors = 0;
  for (let k = 0; k < worlds; k++) {
    const w = makeWorld({ ...p, seed: p.seed + k });
    const a = runToy(w, "then");
    market += a.marketCagr;
    then += a.strategyCagr;
    survivors += runToy(w, "survivors").strategyCagr;
  }
  return { worlds, market: market / worlds, then: then / worlds, survivors: survivors / worlds };
}
