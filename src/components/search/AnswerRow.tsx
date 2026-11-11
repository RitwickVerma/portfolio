import Link from "next/link";
import { Fragment } from "react";
import type { Answer, AnswerLink } from "@/lib/answers";
import { ResultLink } from "@/components/search/parts";

function AnswerAnchor({ link }: { link: AnswerLink }) {
  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" className="link">
        {link.label}
      </a>
    );
  }
  if (link.href.endsWith(".pdf") || link.href.startsWith("mailto:")) {
    return (
      <a href={link.href} className="link">
        {link.label}
      </a>
    );
  }
  return (
    <Link href={link.href} className="link">
      {link.label}
    </Link>
  );
}

/**
 * A direct answer, above the results: the question as the engine read it, the answer in the display weight,
 * and one line saying where it came from. A row, not a selectable result: the arrow keys skip it, and Tab
 * reaches its links.
 */
export function AnswerRow({ answer }: { answer: Answer }) {
  return (
    <section aria-label="Answer" data-testid="answer" data-intent={answer.intent} className="mt-4 grid sm:grid-cols-[7.5rem_1fr] gap-x-6 gap-y-1 py-4 border-y border-fg">
      <p className="fact sm:pt-2" aria-hidden="true">
        Answer
      </p>
      <div className="min-w-0">
        <p className="fact">{answer.question}</p>
        <h2 className="wd-semi font-extrabold text-2xl sm:text-3xl leading-tight mt-1 [overflow-wrap:anywhere]">
          {answer.links ? (
            answer.links.map((l, i) => (
              <Fragment key={l.href}>
                {i > 0 && <span aria-hidden="true">, </span>}
                <AnswerAnchor link={l} />
              </Fragment>
            ))
          ) : (
            answer.answer
          )}
        </h2>
        {answer.links && answer.intent === "resume" && <p className="mt-1">{answer.answer}</p>}
        <p className="fact mt-1.5" data-testid="answer-source">
          {answer.source}
          {!answer.links && (
            <>
              {" "}
              <ResultLink href={answer.href} className="underline decoration-fg/30 underline-offset-4 hover:text-fg">
                See it on this page
              </ResultLink>
            </>
          )}
        </p>
      </div>
    </section>
  );
}
