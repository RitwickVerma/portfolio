"use client";

import { useMemo, useState } from "react";
import { fitReport, SAMPLE_JD, type FitTerm } from "@/lib/fit";
import { useSearchIndex } from "@/lib/useSearchIndex";
import { socialLinks, YEARS_AT_EBAY } from "@/lib/data";
import { ResultLink } from "@/components/search/parts";

// The fit check. At eBay, fitment decides whether a part fits a vehicle.
// This asks the same kind of question about a role: paste a job description,
// and the search index reports which of the skills it names are in my record,
// with the evidence, and which are not. lib/fit.ts does the work; the text
// never leaves the page.

function Evidence({ term }: { term: FitTerm }) {
  return (
    <span className="block">
      {term.evidence.map((e, i) => (
        <span key={e.doc.id} className="block text-[0.95rem] leading-snug mt-0.5">
          <span className="fact">{i === 0 ? "Evidence: " : "Also: "}</span>
          <ResultLink href={e.doc.href} className="link">
            {e.doc.title}
          </ResultLink>
          <span className="fact"> ({e.doc.kind})</span>
        </span>
      ))}
    </span>
  );
}

export default function FitCheck() {
  const { index } = useSearchIndex();
  const [text, setText] = useState("");
  const report = useMemo(() => (text.trim().length > 0 ? fitReport(index, text, YEARS_AT_EBAY) : null), [index, text]);

  const direct = report?.terms.filter((t) => t.status === "direct") ?? [];
  const adjacent = report?.terms.filter((t) => t.status === "adjacent") ?? [];
  const missing = report?.terms.filter((t) => t.status === "missing") ?? [];
  const total = report?.terms.length ?? 0;

  const mail = `mailto:${socialLinks.email}?subject=${encodeURIComponent("A role that might fit")}&body=${encodeURIComponent(
    report && total > 0
      ? `Your fit check found ${direct.length} of ${total} skills in your record${adjacent.length ? `, ${adjacent.length} adjacent` : ""}${missing.length ? `, and ${missing.length} missing (${missing.map((t) => t.label).join(", ")})` : ""}.\n\nThe role:\n`
      : "",
  )}`;

  return (
    <section id="fit" aria-labelledby="fit-title" className="landing border-t-2 border-fg">
      <div className="max-w-[var(--page)] mx-auto px-5 sm:px-8 pt-8 pb-20 sm:pb-28">
        <div className="grid lg:grid-cols-12 gap-x-8 gap-y-5 mb-10 sm:mb-12">
          <h2 id="fit-title" className="lg:col-span-7 wd-semi text-h2 font-extrabold leading-[1.02]">
            Paste a job description. The engine will say where I fit, and where I don&apos;t.
          </h2>
          <div className="lg:col-span-5 lg:pt-2 text-fg/85 max-w-[58ch] space-y-3">
            <p>
              At eBay, fitment decides whether a part fits a buyer&apos;s vehicle. This asks the same question about a role. It finds the skills the
              posting names, looks each one up in the index, and shows the evidence or says there is none.
            </p>
            <p className="fact">It runs in this tab. The text is not sent anywhere.</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-x-8 gap-y-8">
          <div className="lg:col-span-5 lg:sticky lg:top-20 lg:self-start">
            <label htmlFor="jd" className="sr-only">
              Job description
            </label>
            <textarea
              id="jd"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the posting here"
              rows={12}
              spellCheck={false}
              className="w-full border-2 border-fg bg-background rounded-[var(--r-box)] p-4 text-[0.95rem] leading-relaxed placeholder:text-muted outline-none focus:border-accent resize-y min-h-48"
            />
            <div className="mt-3 flex flex-wrap gap-3">
              <button type="button" className="btn-quiet" onClick={() => setText(SAMPLE_JD)}>
                Try a sample posting
              </button>
              {text && (
                <button type="button" className="fact hover:text-fg underline decoration-fg/30 underline-offset-4" onClick={() => setText("")}>
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-7" aria-live="polite">
            {!report ? (
              <div className="border border-dashed border-border rounded-[var(--r-box)] p-6 h-full flex flex-col justify-center gap-2 min-h-48">
                <p className="text-lg font-semibold">The report appears here.</p>
                <p className="text-fg/80 max-w-[52ch]">
                  Three lists: skills my record states in those words, skills where I have the nearest thing, and skills that are not on this site at all.
                </p>
              </div>
            ) : total === 0 ? (
              <p className="border-t border-border py-5 max-w-[56ch]">
                I could not find a named skill in that text. The check looks for languages, tools and domains, about 300 of them, and ignores everything
                else.
              </p>
            ) : (
              <>
                <p className="text-lede leading-[1.25] font-semibold max-w-[30ch]">
                  {direct.length} of {total} skills in this posting are in my record.
                </p>
                <p className="mt-2 text-fg/85">
                  {adjacent.length > 0 ? `${adjacent.length} more ${adjacent.length === 1 ? "is" : "are"} adjacent. ` : ""}
                  {missing.length > 0 ? `${missing.length} ${missing.length === 1 ? "is" : "are"} not here.` : "None are missing."}
                  {report.years
                    ? ` The posting asks for ${report.years.asked} years; I have ${report.years.have} on one search engine.`
                    : ""}
                </p>

                <div className="mt-5 flex h-3 gap-px" role="img" aria-label={`${direct.length} in my record, ${adjacent.length} adjacent, ${missing.length} missing`}>
                  {report.terms.map((t) => (
                    <span
                      key={t.label}
                      title={`${t.label}: ${t.status === "direct" ? "in my record" : t.status === "adjacent" ? "adjacent" : "not here"}`}
                      className={`flex-1 ${t.status === "direct" ? "bg-ok" : t.status === "adjacent" ? "bg-ok/40" : "border border-fg/40"}`}
                    />
                  ))}
                </div>
                <p className="fact !text-xs mt-1.5">One block per skill, in the order the posting names them. Filled is stated, pale is adjacent, hollow is missing.</p>

                {direct.length > 0 && (
                  <>
                    <h3 className="wd-semi text-xl font-bold mt-8 mb-1">In my record</h3>
                    <ul className="border-b border-border">
                      {direct.map((t) => (
                        <li key={t.label} className="border-t border-border py-2.5 grid sm:grid-cols-[11rem_1fr] gap-x-6">
                          <span className="font-semibold">{t.label}</span>
                          <Evidence term={t} />
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {adjacent.length > 0 && (
                  <>
                    <h3 className="wd-semi text-xl font-bold mt-8 mb-1">Adjacent</h3>
                    <p className="fact mb-2">Not stated in those words. The nearest thing I have done is named, so you can judge the distance.</p>
                    <ul className="border-b border-border">
                      {adjacent.map((t) => (
                        <li key={t.label} className="border-t border-border py-2.5 grid sm:grid-cols-[11rem_1fr] gap-x-6">
                          <span>
                            <span className="font-semibold">{t.label}</span>
                            <span className="fact block">nearest here: {t.via.join(", ")}</span>
                          </span>
                          <Evidence term={t} />
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {missing.length > 0 && (
                  <>
                    <h3 className="wd-semi text-xl font-bold mt-8 mb-1">Not on this site</h3>
                    <p className="max-w-[60ch]">
                      {missing.map((t) => t.label).join(", ")}.{" "}
                      <span className="text-fg/75">I have not used these, or not enough to write it down. Better you read that here than find it out in an interview.</span>
                    </p>
                  </>
                )}

                <p className="mt-8">
                  <a href={mail} className="btn">
                    Email me about this role
                  </a>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
