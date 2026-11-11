import { experiences, education, BUILD_DATE } from "@/lib/data";
import { parsePeriod, decimalYear } from "@/lib/timeline";

// Eleven years on one strip, drawn to scale from the periods lib/data prints.
// Two lanes: where I studied, where I worked. Nothing here is typed twice.
//
// Two drawings of the same numbers. From 1024 px up it is the two-lane strip
// (SVG, scaled to the column). Below that the strip would be 7 to 9 px type and,
// held at a readable size, would hide the eBay years off the right edge, so it
// becomes rows: one entry per line with its bar on the shared axis.

const W = 1000;
const PAD = 1; // the axis starts on the column edge, level with the rules and the caption
const LANE = 34;
const GAP = 14;
const TOP = 6;
const AXIS_Y = TOP + LANE * 2 + GAP + 8;
const H = AXIS_Y + 26;

interface Entry {
  label: string;
  /** The longer name the row layout prints. */
  full: string;
  detail: string;
  period: string;
  company?: string;
  /** Where pressing the bar goes: the Work section's heading for this eBay role. Only the eBay roles have one. */
  href?: string;
  start: number;
  end: number;
}

export default function Timeline() {
  const now = decimalYear(BUILD_DATE);
  const from = 2015;
  const to = Math.ceil(now);
  const x = (year: number) => PAD + ((year - from) / (to - from)) * (W - PAD * 2);
  const pct = (year: number) => ((year - from) / (to - from)) * 100;

  const study: Entry[] = education.map((e) => {
    const label = e.school.split(",")[0].replace("University of California", "UC Irvine").replace(" Institute of Science and Technology", "");
    return { label, full: label, detail: e.degree, period: e.period, ...parsePeriod(e.period, now) };
  });
  // experiences lists the eBay roles first, newest first, in the order lib/corpus's workRoles are rendered.
  const ebayRoles = experiences.filter((e) => e.company === "eBay");
  const work: Entry[] = experiences.map((e) => ({
    label: e.company === "eBay" ? e.role.replace("Software Engineer", "eBay, SE") : e.company,
    full: e.company === "eBay" ? `eBay, ${e.role}` : e.company,
    detail: e.role,
    period: e.period,
    company: e.company,
    href: e.company === "eBay" ? `#work-role-${ebayRoles.indexOf(e)}` : undefined,
    ...parsePeriod(e.period, now),
  }));
  const years = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const title = `Timeline, ${from} to ${to}. ${[...study, ...work].map((s) => `${s.label}: ${Math.floor(s.start)} to ${Math.floor(s.end)}`).join(". ")}.`;

  return (
    <figure className="mb-14">
      {/* Rows: phones and tablets */}
      <div className="lg:hidden">
        <div className="relative">
          {/* Year rules and the day of the build, behind the bars */}
          <div aria-hidden="true" className="absolute inset-x-0 top-0 bottom-6 pointer-events-none">
            {years.slice(0, -1).map((y) => (
              <span key={y} className="absolute inset-y-0 border-l border-fg/10" style={{ left: `${pct(y)}%` }} />
            ))}
            <span className="absolute inset-y-0 border-l-2 border-dashed border-fg" style={{ left: `${pct(now)}%` }} />
          </div>
          {[work, study].map((lane, li) => (
            <ol key={li} className={`relative ${li ? "mt-3 pt-3 border-t border-border" : ""}`}>
              {lane.map((s) => {
                const bar = li ? "border-[1.5px] border-fg" : s.company === "eBay" ? "bg-fg" : "bg-fg/45";
                const inner = (
                  <>
                    <p className="flex items-baseline justify-between gap-3 leading-tight">
                      <span className="text-[0.95rem] font-semibold bg-background pr-1">{s.full}</span>
                      <span className="fact whitespace-nowrap bg-background pl-1">{s.period}</span>
                    </p>
                    <span className="relative block h-3 mt-1.5">
                      <span className={`absolute inset-y-0 min-w-[5px] ${bar} ${s.href ? "group-hover:bg-accent" : ""}`} style={{ left: `${pct(s.start)}%`, width: `${pct(s.end) - pct(s.start)}%` }} />
                    </span>
                  </>
                );
                return (
                  <li key={`${s.label}${s.start}`} className="py-1.5" title={s.detail}>
                    {s.href ? (
                      <a href={s.href} aria-label={`${s.full}, ${s.period}: go to its rows`} className="group block min-h-11 -my-1 py-1">
                        {inner}
                      </a>
                    ) : (
                      inner
                    )}
                  </li>
                );
              })}
            </ol>
          ))}
          <div aria-hidden="true" className="relative h-6 mt-1 border-t border-fg">
            {years.slice(0, -1).map((y, i) =>
              i % 2 === 0 ? (
                <span key={y} className="absolute top-1 wd-narrow text-xs text-muted -translate-x-1/2" style={{ left: `${pct(y)}%` }}>
                  {y}
                </span>
              ) : null,
            )}
          </div>
        </div>
      </div>

      {/* Strip: desktop */}
      <svg viewBox={`0 0 ${W} ${H}`} className="hidden lg:block w-full h-auto" role="group" aria-labelledby="timeline-title">
        <title id="timeline-title">{title}</title>

        {years.map((y) => (
          <g key={y}>
            <line x1={x(y)} x2={x(y)} y1={TOP} y2={AXIS_Y} stroke="var(--fg)" strokeOpacity={0.1} />
            <text display={y === to ? "none" : undefined} x={x(y) + 3} y={AXIS_Y + 16} fontSize={11} fill="var(--muted)" style={{ fontStretch: "78%" }}>
              {y}
            </text>
          </g>
        ))}
        <line x1={PAD} x2={W - PAD} y1={AXIS_Y} y2={AXIS_Y} stroke="var(--fg)" />

        {study.map((s) => (
          <g key={s.label}>
            <rect x={x(s.start)} y={TOP} width={x(s.end) - x(s.start) - 2} height={LANE} fill="none" stroke="var(--fg)" strokeWidth={1.5} />
            <text x={x(s.start) + 8} y={TOP + 21} fontSize={13} fill="var(--fg)" fontWeight={600}>
              {s.label}
            </text>
          </g>
        ))}

        {work.map((s) => {
          const y = TOP + LANE + GAP;
          const w = Math.max(x(s.end) - x(s.start) - 2, 5);
          const ebay = s.company === "eBay";
          const bar = (
            <>
              <rect
                x={x(s.start)}
                y={y}
                width={w}
                height={LANE}
                fill="var(--fg)"
                fillOpacity={ebay ? 1 : 0.45}
                stroke="var(--bg)"
                strokeWidth={2}
                className={s.href ? "group-hover:fill-accent" : undefined}
              >
                <title>{`${s.company}: ${s.detail}`}</title>
              </rect>
              {ebay && (
                <text x={x(s.start) + 8} y={y + 21} fontSize={13} fill="var(--bg)" fontWeight={700} textDecoration={s.href ? "underline" : undefined}>
                  {s.label}
                </text>
              )}
            </>
          );
          return s.href ? (
            <a key={`${s.label}${s.start}`} href={s.href} aria-label={`${s.label}. ${s.detail}, ${s.period}. Go to its rows.`} className="group cursor-pointer">
              {bar}
            </a>
          ) : (
            <g key={`${s.label}${s.start}`}>{bar}</g>
          );
        })}
        {/* The day of the build: the right edge of the last bar. Ink and dashed, not blue: blue is somewhere you can go. */}
        <line x1={x(now)} x2={x(now)} y1={TOP + LANE + GAP - 5} y2={AXIS_Y} stroke="var(--bg)" strokeWidth={5} />
        <line x1={x(now)} x2={x(now)} y1={TOP + LANE + GAP - 5} y2={AXIS_Y} stroke="var(--fg)" strokeWidth={2} strokeDasharray="3 3" />
      </svg>
      <figcaption className="fact mt-2">
        To scale, from the dates on this page. Outlined: study. Solid: eBay (press a bar to go to its rows). Grey: the three internships. Dashed: the day this page was built.
      </figcaption>
    </figure>
  );
}
