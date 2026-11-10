import { experiences, education, BUILD_DATE } from "@/lib/data";
import { parsePeriod, decimalYear } from "@/lib/timeline";

// Eleven years on one strip, drawn to scale from the periods lib/data prints.
// Two lanes: where I studied, where I worked. Nothing here is typed twice.

const W = 1000;
const PAD = 8;
const LANE = 34;
const GAP = 14;
const TOP = 6;
const AXIS_Y = TOP + LANE * 2 + GAP + 8;
const H = AXIS_Y + 26;

export default function Timeline() {
  const now = decimalYear(BUILD_DATE);
  const from = 2015;
  const to = Math.ceil(now);
  const x = (year: number) => PAD + ((year - from) / (to - from)) * (W - PAD * 2);

  const study = education.map((e) => ({ label: e.school.split(",")[0].replace("University of California", "UC Irvine").replace(" Institute of Science and Technology", ""), detail: e.degree, ...parsePeriod(e.period, now) }));
  const work = experiences.map((e) => ({ label: e.company === "eBay" ? e.role.replace("Software Engineer", "eBay, SE") : e.company, detail: e.role, company: e.company, ...parsePeriod(e.period, now) }));
  const years = Array.from({ length: to - from + 1 }, (_, i) => from + i);

  return (
    <figure className="mb-14 overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[640px] h-auto" role="img" aria-labelledby="timeline-title">
        <title id="timeline-title">
          {`Timeline, ${from} to ${to}. ${[...study, ...work].map((s) => `${s.label}: ${Math.floor(s.start)} to ${Math.floor(s.end)}`).join(". ")}.`}
        </title>

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
          return (
            <g key={`${s.label}${s.start}`}>
              <rect x={x(s.start)} y={y} width={w} height={LANE} fill="var(--fg)" fillOpacity={ebay ? 1 : 0.45} stroke="var(--bg)" strokeWidth={2}>
                <title>{`${s.company}: ${s.detail}`}</title>
              </rect>
              {ebay && (
                <text x={x(s.start) + 8} y={y + 21} fontSize={13} fill="var(--bg)" fontWeight={700}>
                  {s.label}
                </text>
              )}
            </g>
          );
        })}
        {/* Today: the right edge of the last bar. */}
        <line x1={x(now)} x2={x(now)} y1={TOP + LANE + GAP - 5} y2={AXIS_Y} stroke="var(--accent)" strokeWidth={2} />
      </svg>
      <figcaption className="fact mt-2">
        To scale, from the dates on this page. Outlined: study. Solid: eBay. Grey: the three internships.
      </figcaption>
    </figure>
  );
}
