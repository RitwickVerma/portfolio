import type { ReactNode } from "react";

/**
 * A home-page section: a full-width rule, one sentence as the heading and an
 * optional paragraph beside it. The heading is the claim; the body is the evidence.
 */
export default function Section({
  id,
  title,
  lede,
  children,
}: {
  id: string;
  title: string;
  lede?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="border-t-2 border-fg">
      <div className="max-w-[78rem] mx-auto px-5 sm:px-8 pt-8 pb-20 sm:pb-28">
        <div className="grid lg:grid-cols-12 gap-x-8 gap-y-5 mb-12 sm:mb-16">
          <h2 id={`${id}-title`} className="lg:col-span-7 wd-semi text-h2 font-extrabold leading-[1.02]">
            {title}
          </h2>
          {lede ? <div className="lg:col-span-5 lg:pt-2 text-fg/85 max-w-[58ch] space-y-3">{lede}</div> : null}
        </div>
        {children}
      </div>
    </section>
  );
}
