import { buildCorpus } from "@/lib/corpus";
import { skills } from "@/lib/data";
import { notes } from "@/lib/notes";
import { noteText } from "@/lib/notes.server";
import { buildIndex } from "@/lib/search";
import { skillEvidence, skillHref, type SkillGroup } from "@/lib/skillEvidence";

// Skills, each with the number of results the search box gives for it.
// Counted at build by running the real engine over the index the site builds
// (the record plus every section of every note), so the number on a chip is
// the number of results its own link shows, and the page needs no JS for it.
// A skill that returns nothing is still listed, and marked.

const GROUPS = [
  { label: "Languages I write myself", items: skills.languages },
  { label: "Domains", items: skills.domains },
  { label: "Tools and platforms", items: skills.tools },
];

const chip =
  "inline-flex items-center gap-1.5 min-h-11 sm:min-h-9 px-3 rounded-[var(--r-chip)] border text-[0.95rem] leading-tight transition-colors duration-[var(--dur-tap)]";

export function SkillChips({ groups, documents }: { groups: SkillGroup[]; documents: number }) {
  // The legend names the dashed chip only when there is one on the page.
  const unseen = groups.some((g) => g.skills.some((s) => s.count === 0));
  return (
    <div id="skills" className="landing lg:col-span-12">
      <h3 className="wd-semi text-xl font-bold mb-1">What I work in, and what searching for it finds.</h3>
      <p className="fact mb-4 max-w-[70ch]">
        The number is the results when searched: what the search box returns for that skill over all {documents} documents, the notes included, run when the site
        was built. A chip runs that search.
        {unseen ? " Dashed: listed, not found in the record." : ""}
      </p>
      <dl className="space-y-3">
        {groups.map((g) => (
          <div key={g.label} className="grid md:grid-cols-[11rem_1fr] gap-x-6 gap-y-1.5">
            <dt className="fact md:pt-2">{g.label}</dt>
            <dd className="flex flex-wrap gap-2">
              {[...g.skills.filter((s) => s.count > 0), ...g.skills.filter((s) => s.count === 0)].map((s) =>
                s.count > 0 ? (
                  <a key={s.skill} href={skillHref(s.skill)} className={`${chip} border-accent/40 text-accent hover:border-accent`}>
                    {s.skill}
                    <span className="wd-narrow text-[0.95rem] text-fg/80 tabular-nums">{s.count}</span>
                    <span className="sr-only">{s.count === 1 ? " result when searched" : " results when searched"}</span>
                  </a>
                ) : (
                  <a key={s.skill} href={skillHref(s.skill)} data-unseen="" className={`${chip} border-dashed border-fg/40 text-muted hover:border-accent hover:text-accent`}>
                    {s.skill}
                    <span className="sr-only"> listed, not found in the record</span>
                  </a>
                ),
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function SkillEvidence() {
  const { groups, documents } = skillEvidence(GROUPS, buildIndex(buildCorpus(notes.map((n) => noteText(n.slug)))));
  return <SkillChips groups={groups} documents={documents} />;
}
