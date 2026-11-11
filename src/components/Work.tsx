import { experiences, education } from "@/lib/data";
import { workRoles } from "@/lib/corpus";
import Section from "@/components/Section";
import Timeline from "@/components/Timeline";
import WorkFigure from "@/components/figures/WorkFigures";
import SkillEvidence from "@/components/figures/SkillEvidence";
import { Fold } from "@/components/figures/kit";

const meta = "fact";

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
      <Timeline />
      <div className="space-y-14">
        {workRoles.map((r) => (
          <div key={r.role} className="grid lg:grid-cols-12 gap-x-8 gap-y-4">
            {/* The timeline's eBay bars link here: the role's heading, then its rows. */}
            <header id={`work-role-${workRoles.indexOf(r)}`} className="landing lg:col-span-3">
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
                    <WorkFigure text={item.text} />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      <div className="mt-16 grid lg:grid-cols-12 gap-x-8 gap-y-12">
        <div id="earlier" className="landing lg:col-span-7">
          <h3 className="wd-semi text-xl font-bold mb-3">Before eBay</h3>
          <ol className="border-b border-border">
            {earlier.map((e) => (
              <li key={e.company} className="border-t border-border py-3 grid sm:grid-cols-[8.5rem_1fr] gap-x-6 gap-y-1">
                <p className={meta}>{e.period}</p>
                <div>
                  <p className="font-semibold leading-snug">{e.company}</p>
                  <p className={meta}>{e.role}</p>
                  <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label={`${e.company}: stack`}>
                    {e.tech.map((t) => (
                      <li key={t} className="rounded-[var(--r-chip)] border border-border px-2 py-0.5 wd-narrow text-sm text-fg/85">
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
          <Fold summary="What I built at each">
            <ul className="space-y-3 pt-2">
              {earlier.map((e) => (
                <li key={e.company}>
                  <p className="font-semibold leading-snug">{e.company}</p>
                  <p className="text-[0.95rem] text-fg/80 max-w-[64ch]">{e.description.join(" ")}</p>
                </li>
              ))}
            </ul>
          </Fold>
        </div>

        <div className="lg:col-span-5">
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

        <SkillEvidence />
      </div>
    </Section>
  );
}
