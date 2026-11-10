import type { MDXComponents } from "mdx/types";
import type { ComponentPropsWithoutRef } from "react";
import Link from "next/link";

// House style for note bodies. One accent, mono for code, generous leading.
// Block code is styled by `.note pre code` in globals.css so the inline-code
// treatment below never leaks into fenced blocks.

function Anchor({ href = "", children, ...rest }: ComponentPropsWithoutRef<"a">) {
  const external = /^https?:\/\//.test(href);
  const cls = "link";
  if (external) {
    return (
      <a href={href} className={cls} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} {...rest}>
      {children}
    </Link>
  );
}

const components: MDXComponents = {
  h2: (p) => <h2 className="wd-semi mt-14 mb-4 text-[1.75rem] font-extrabold leading-tight text-fg" {...p} />,
  h3: (p) => <h3 className="mt-10 mb-3 text-xl font-bold text-fg" {...p} />,
  p: (p) => <p className="my-5 leading-[1.65] text-fg/90" {...p} />,
  a: Anchor,
  ul: (p) => <ul className="my-5 list-disc space-y-2 pl-6 text-fg/90 marker:text-muted" {...p} />,
  ol: (p) => <ol className="my-5 list-decimal space-y-2 pl-6 text-fg/90 marker:text-muted" {...p} />,
  li: (p) => <li className="leading-relaxed" {...p} />,
  strong: (p) => <strong className="font-semibold text-fg" {...p} />,
  em: (p) => <em className="italic" {...p} />,
  blockquote: (p) => (
    <blockquote className="my-6 border-l-2 border-fg pl-4 text-fg/80" {...p} />
  ),
  hr: () => <hr className="my-12 border-0 h-px bg-border" />,
  code: (p) => (
    <code
      className="font-mono text-[0.8em] text-fg bg-surface border border-border rounded-[3px] px-1 py-0.5"
      {...p}
    />
  ),
  pre: (p) => (
    <pre
      className="my-6 overflow-x-auto rounded-md border border-border bg-surface p-4 font-mono text-[12px] leading-relaxed text-fg/90"
      {...p}
    />
  ),
  table: (p) => (
    <div className="my-6 overflow-x-auto">
      <table className="w-full text-sm border-collapse" {...p} />
    </div>
  ),
  thead: (p) => <thead className="text-left wd-narrow text-[0.95rem] text-muted" {...p} />,
  th: (p) => <th className="py-2 pr-4 border-b border-fg font-normal" {...p} />,
  td: (p) => <td className="py-2 pr-4 border-b border-border align-top text-fg/80" {...p} />,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
