// Periods as lib/data writes them ("Mar 2021 – Jun 2023", "Jun – Sep 2020",
// "2015 – 2019", "Jun 2023 – Present"), turned into decimal years so the
// career strip can be drawn to scale from the same strings the page prints.

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export interface Span {
  /** Decimal year the period starts: 2021.17 is March 2021. */
  start: number;
  /** Decimal year it ends, at the end of the named month. */
  end: number;
}

/** `now` is the decimal year "Present" resolves to. */
export function parsePeriod(period: string, now: number): Span {
  const [rawStart, rawEnd = rawStart] = period.split(/\s+[–-]\s+/);
  const part = (text: string) => {
    const month = MONTHS.indexOf(text.trim().slice(0, 3).toLowerCase());
    const year = Number(text.match(/\d{4}/)?.[0]);
    return { month, year };
  };
  const a = part(rawStart);
  const b = part(rawEnd);
  // "Jun – Sep 2020": the year is written once, on the end.
  const startYear = Number.isNaN(a.year) ? b.year : a.year;
  // A bare year is an academic year boundary: treat it as mid-year.
  const start = startYear + (a.month >= 0 ? a.month / 12 : 0.5);
  const end = /present/i.test(rawEnd) ? now : b.year + (b.month >= 0 ? (b.month + 1) / 12 : 0.5);
  return { start, end };
}

/** "2026-11-10" -> 2026.86 */
export function decimalYear(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return y + (m - 1) / 12 + (d - 1) / 365;
}
