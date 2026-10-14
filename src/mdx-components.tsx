import type { MDXComponents } from "mdx/types";
import type { ComponentPropsWithoutRef } from "react";
import Link from "next/link";

// House style for note bodies. One accent, mono for code, generous leading.
// Block code is styled by `.note pre code` in globals.css so the inline-code
// treatment below never leaks into fenced blocks.

function Anchor({ href = "", children, ...rest }: ComponentPropsWithoutRef<"a">) {
  const external = /^https?:\/\//.test(href);
  const cls = "text-accent underline underline-offset-4 decoration-accent/40 hover:decoration-accent";
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
  h2: (p) => <h2 className="mt-14 mb-4 text-2xl font-semibold tracking-tight text-fg" {...p} />,
  h3: (p) => <h3 className="mt-10 mb-3 text-lg font-semibold tracking-tight text-fg" {...p} />,
  p: (p) => <p className="my-5 leading-relaxed text-fg/85" {...p} />,
  a: Anchor,
  ul: (p) => <ul className="my-5 list-disc space-y-2 pl-6 text-fg/85 marker:text-accent/60" {...p} />,
  ol: (p) => <ol className="my-5 list-decimal space-y-2 pl-6 text-fg/85 marker:text-accent/60" {...p} />,
  li: (p) => <li className="leading-relaxed" {...p} />,
  strong: (p) => <strong className="font-semibold text-fg" {...p} />,
  em: (p) => <em className="italic" {...p} />,
  blockquote: (p) => (
    <blockquote className="my-6 border-l-2 border-accent/50 pl-4 text-fg/70 italic" {...p} />
  ),
  hr: () => <hr className="my-12 border-0 h-px bg-gradient-to-r from-accent/40 via-accent/10 to-transparent" />,
  code: (p) => (
    <code
      className="font-mono text-[0.9em] text-accent/90 bg-surface border border-border rounded px-1.5 py-0.5"
      {...p}
    />
  ),
  pre: (p) => (
    <pre
      className="my-6 overflow-x-auto rounded-lg border border-border bg-surface p-4 font-mono text-[13px] leading-relaxed text-fg/85"
      {...p}
    />
  ),
  table: (p) => (
    <div className="my-6 overflow-x-auto">
      <table className="w-full text-sm border-collapse" {...p} />
    </div>
  ),
  thead: (p) => <thead className="text-left font-mono text-xs uppercase tracking-wider text-muted" {...p} />,
  th: (p) => <th className="py-2 pr-4 border-b border-border font-medium" {...p} />,
  td: (p) => <td className="py-2 pr-4 border-b border-border align-top text-fg/80" {...p} />,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
