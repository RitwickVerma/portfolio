// The two universes the same strategy code was run on, as recorded in the
// private Plutus repository's results/full/survivorship.md, "Battery 19"
// (point-in-time S&P 500 membership from the fja05680 components list, Alpaca
// prices, 2016-07 to 2026-10, stocks only, the live config). Public prices only.
// SPY's Sharpe and drawdown are from the README's second table; the markdown
// gives its CAGR over the same window as 15.2%.

export interface UniverseRow {
  id: "then" | "ever" | "today";
  label: string;
  note: string;
  cagr: number;
  sharpe: number;
  maxDrawdown: number;
}

export const WINDOW = "July 2016 to October 2026";

/** Ordered from the honest universe to the flattering one. */
export const UNIVERSES: UniverseRow[] = [
  { id: "then", label: "Members as they stood each month", note: "S&P 500 point in time, 244 of the 747 names later left or were delisted", cagr: 3.1, sharpe: 0.25, maxDrawdown: -38.5 },
  { id: "ever", label: "Every name that was ever a member", note: "no monthly mask: a stock may be picked before it joined", cagr: 18.0, sharpe: 0.77, maxDrawdown: -35.6 },
  { id: "today", label: "Today's members, traded back", note: "the 503 still in the index at the last snapshot", cagr: 21.3, sharpe: 0.87, maxDrawdown: -33.6 },
];

export const SPY = { cagr: 15.2, sharpe: 0.89, maxDrawdown: -34 };

/** Points of CAGR between two rows. */
export function gap(a: UniverseRow, b: UniverseRow): number {
  return Math.round((a.cagr - b.cagr) * 10) / 10;
}

/** "+3.1%" with a true minus sign; `x` is already in percent. */
export function pctText(x: number, digits = 1, signed = false): string {
  const s = Math.abs(x).toFixed(digits);
  if (x < 0 && Number(s) !== 0) return `−${s}%`;
  return `${signed && Number(s) !== 0 ? "+" : ""}${s}%`;
}
