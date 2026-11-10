import { experiences, education, skills } from "@/lib/data";
import { workRoles } from "@/lib/corpus";
import Section from "@/components/Section";

// The replay bullet's two numbers, drawn to scale. They are read out of the
// bullet itself so the figure cannot disagree with the sentence beside it.
function ReplayFigure({ text }: { text: string }) {
  const m = text.match(/from (\d+) to (\d+)/);
  if (!m) return null;
  const [before, after] = [Number(m[1]), Number(m[2])];
  const rows = [
    { label: "New errors, first replay", value: before },
    { label: "After the root-cause fix", value: after },
  ];
  return (
    <figure className="mt-4 max-w-md" aria-label={`New errors in the replay: ${before} before the fix, ${after} after`}>
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[11.5rem_1fr] items-center gap-3 py-1">
          <span className="wd-narrow text-sm text-muted">{r.label}</span>
          <span className="flex items-center gap-2">
            <span className="h-3 bg-fg" style={{ width: `${Math.max(1.5, (r.value / before) * 100)}%` }} />
            <span className="font-mono text-xs">{r.value}</span>
          </span>
        </div>
      ))}
    </figure>
  );
}

const meta = "wd-narrow text-[0.95rem] text-muted";

export default function Work() {
  const earlier = experiences.filter((e) => e.company !== "eBay");
  return (
    <Section
      id="work"
      title="Five and a half years on one search engine."
      lede={
        <p>
          Cassini is the distributed C++ engine behind every search on ebay.com. In 2022 I took over fitment, the part of it
          that decides which parts fit a buyer&apos;s vehicle, and I have owned it since.
        </p>
      }
    >
      <div className="space-y-14">
        {workRoles.map((r) => (
          <div key={r.role} className="grid lg:grid-cols-12 gap-x-8 gap-y-4">
            <header className="lg:col-span-3">
              <div className="lg:sticky lg:top-20">
                <h3 className="wd-semi text-xl font-bold leading-tight">{r.role.split(", ")[0]}</h3>
                <p className={`${meta} mt-1`}>{[r.role.split(", ")[1], "eBay", r.location].filter(Boolean).join(", ")}</p>
                <p className={meta}>{r.period}</p>
              </div>
            </header>
            <ol className="lg:col-span-9 border-b border-border">
              {r.items.map((item) => (
                <li key={item.id} id={item.id} className="landing border-t border-border py-5 grid md:grid-cols-[minmax(0,17rem)_1fr] gap-x-8 gap-y-1.5">
                  <h4 className="text-lg font-semibold leading-snug">{item.headline}</h4>
                  <div>
                    <p className="text-fg/85 max-w-[64ch]">{item.text}</p>
                    {/replayed/.test(item.text) ? <ReplayFigure text={item.text} /> : null}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-12 gap-x-8 gap-y-10">
        <div id="earlier" className="landing lg:col-span-4">
          <h3 className="wd-semi text-xl font-bold mb-3">Before eBay</h3>
          <ul className="space-y-3">
            {earlier.map((e) => (
              <li key={e.company}>
                <p className="font-semibold leading-snug">
                  {e.company} <span className={`${meta} font-normal`}>{e.period}</span>
                </p>
                <p className="text-[0.95rem] text-fg/80">{e.description.join(" ")}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-3">
          <h3 className="wd-semi text-xl font-bold mb-3">Education</h3>
          <ul className="space-y-3">
            {education.map((ed) => (
              <li key={ed.school}>
                <p className="font-semibold leading-snug">{ed.degree}</p>
                <p className="text-[0.95rem] text-fg/80">{ed.school}</p>
                <p className={meta}>{ed.period}</p>
              </li>
            ))}
          </ul>
        </div>

        <div id="skills" className="landing md:col-span-2 lg:col-span-5">
          <h3 className="wd-semi text-xl font-bold mb-3">What I work in</h3>
          <dl className="space-y-3">
            {[
              { label: "Languages I write myself", items: skills.languages },
              { label: "Domains", items: skills.domains },
              { label: "Tools and platforms", items: skills.tools },
            ].map((g) => (
              <div key={g.label}>
                <dt className={meta}>{g.label}</dt>
                <dd className="text-fg/90">{g.items.join(", ")}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Section>
  );
}
