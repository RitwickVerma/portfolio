import { parseReplay, parseSuite, parseScope, figureFor, decadesFor, decadeTicks, logShare, shares, group, tickLabel } from "@/lib/workFigures";

// The three numbers-in-a-sentence figures of the Work section. Each reads its
// numbers out of the bullet it sits under (lib/workFigures.ts), so it cannot
// disagree with the sentence, and each is plain HTML: the server page already
// holds its first and only state, and nothing here needs JavaScript.

const caption = "fact mt-2 max-w-[52ch]";

/** 50,000 queries replayed, 167 new errors, 6 after the fix: one bar each on a log axis. */
function ReplayFunnel({ text }: { text: string }) {
  const r = parseReplay(text);
  if (!r) return null;
  const decades = decadesFor(r.queries);
  const rows = [
    { label: "Queries replayed", value: r.queries, bar: "bg-fg/45" },
    { label: "New errors, first replay", value: r.before, bar: "bg-fg" },
    { label: "After the root-cause fix", value: r.after, bar: "bg-ok" },
  ];
  const ticks = decadeTicks(decades);
  return (
    <figure
      className="mt-4 max-w-lg"
      aria-label={`Replay funnel on a log axis: ${group(r.queries)} queries replayed, ${group(r.before)} new errors on the first replay, ${group(r.after)} after the root-cause fix`}
    >
      {rows.map((row) => (
        <div key={row.label} className="grid sm:grid-cols-[11rem_1fr] items-center gap-x-3 gap-y-0.5 py-1.5">
          <span className="wd-narrow text-sm text-muted">{row.label}</span>
          {/* The bar sits in its own cell, so its width is exactly its share of the track. */}
          <span className="grid grid-cols-[minmax(0,1fr)_3.75rem] items-center gap-2">
            <span className="block h-3 border-l border-fg">
              <span data-share={logShare(row.value, decades).toFixed(4)} className={`block h-full ${row.bar}`} style={{ width: `${(logShare(row.value, decades) * 100).toFixed(2)}%`, minWidth: "2px" }} />
            </span>
            <span className="font-mono text-xs tabular-nums">{group(row.value)}</span>
          </span>
        </div>
      ))}
      {/* The axis, under the track column. */}
      <div aria-hidden="true" className="grid sm:grid-cols-[11rem_1fr] gap-x-3">
        <span className="hidden sm:block" />
        <span className="grid grid-cols-[minmax(0,1fr)_3.75rem] gap-2">
          <span className="relative block h-5 border-t border-fg">
            {ticks.map((t, i) => {
              const left = `${(logShare(t, decades) * 100).toFixed(2)}%`;
              const align = i === 0 ? "" : i === ticks.length - 1 ? "-translate-x-full" : "-translate-x-1/2";
              return (
                <span key={t}>
                  <span className="absolute top-0 h-1.5 border-l border-fg" style={{ left }} />
                  <span className={`absolute top-1.5 wd-narrow text-xs leading-none text-muted ${align}`} style={{ left }}>
                    {tickLabel(t)}
                  </span>
                </span>
              );
            })}
          </span>
          <span />
        </span>
      </div>
      <figcaption className={caption}>
        Log axis: each tick is ten times the last. Three numbers from the sentence, not the replay.
      </figcaption>
    </figure>
  );
}

/** 2,549 unit and 511 regression tests: one bar, split in proportion. */
function SuiteBar({ text }: { text: string }) {
  const s = parseSuite(text);
  if (!s) return null;
  const [unit, regression] = shares([s.unit, s.regression]);
  const total = s.unit + s.regression;
  return (
    <figure className="mt-4 max-w-lg" aria-label={`Test suite: ${group(s.unit)} unit tests and ${group(s.regression)} regression tests, ${group(total)} together`}>
      <div className="flex h-4 border border-fg">
        <span data-share={unit.toFixed(4)} className="block h-full bg-fg" style={{ width: `${(unit * 100).toFixed(2)}%` }} />
        <span data-share={regression.toFixed(4)} className="block h-full bg-fg/35" style={{ width: `${(regression * 100).toFixed(2)}%` }} />
      </div>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-5 gap-y-1">
        <span className="inline-flex items-baseline gap-2">
          <span aria-hidden="true" className="inline-block size-2.5 bg-fg" />
          <span className="font-mono text-xs tabular-nums">{group(s.unit)}</span>
          <span className="wd-narrow text-sm text-muted">unit</span>
        </span>
        <span className="inline-flex items-baseline gap-2">
          <span aria-hidden="true" className="inline-block size-2.5 bg-fg/35" />
          <span className="font-mono text-xs tabular-nums">{group(s.regression)}</span>
          <span className="wd-narrow text-sm text-muted">regression</span>
        </span>
        <span className="wd-narrow text-sm text-muted">{group(total)} together</span>
      </p>
      <figcaption className={caption}>Linear. Test counts, not coverage.</figcaption>
    </figure>
  );
}

/** 16 sites and 19 catalogs: a numeral and one square per unit, at one scale. */
function ScopeCounters({ text }: { text: string }) {
  const s = parseScope(text);
  if (!s) return null;
  const rows = [
    { n: s.sites, label: "sites" },
    { n: s.catalogs, label: "catalogs" },
  ];
  return (
    <figure className="mt-4 max-w-lg" aria-label={`Fitment scope: ${s.sites} sites and ${s.catalogs} catalogs`}>
      <dl className="space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[5.5rem_1fr] items-center gap-x-3">
            <dt className="flex items-baseline gap-1.5">
              <span className="wd-narrow text-4xl font-black leading-none tabular-nums">{r.n}</span>
              <span className="wd-narrow text-sm text-muted">{r.label}</span>
            </dt>
            <dd aria-hidden="true" className="flex flex-wrap gap-1">
              {Array.from({ length: r.n }, (_, i) => (
                <span key={i} className="block size-2.5 bg-fg" />
              ))}
            </dd>
          </div>
        ))}
      </dl>
      <figcaption className={caption}>One square each. The counts, not which ones.</figcaption>
    </figure>
  );
}

/** The figure for a bullet, or nothing: a bullet without these numbers stays prose. */
export default function WorkFigure({ text }: { text: string }) {
  switch (figureFor(text)) {
    case "replay":
      return <ReplayFunnel text={text} />;
    case "suite":
      return <SuiteBar text={text} />;
    case "scope":
      return <ScopeCounters text={text} />;
    default:
      return null;
  }
}
