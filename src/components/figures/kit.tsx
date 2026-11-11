"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";

// The shared frame and controls for a figure inside a note. Every note figure
// is built from these, so a reader who has operated one knows how to operate
// the next: the claim on top, one thing to try first, the verdict beside the
// thing you pressed, everything else folded away.
//
// Reading order, top to bottom:
//   claim    one sentence the figure proves; it is the figure's name
//   how      one line: what to press first
//   children the stage: Presets, the drawing, the Verdict, then More
//   caption  one sentence on where the figure stops being the real thing
//   about    the long provenance, folded
//
// Controls: Presets (one-tap scenarios), Segmented (one of a few, as radios),
// Toggle (one thing on or off, as a switch), QuietAction, Actions.

export function FigureFrame({
  claim,
  how,
  caption,
  about,
  children,
}: {
  claim: string;
  how: ReactNode;
  caption: ReactNode;
  about?: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <figure aria-labelledby={`${id}-claim`} className="my-8 first:mt-0">
      <p id={`${id}-claim`} className="wd-semi text-xl sm:text-2xl font-extrabold leading-[1.1] max-w-[30ch]">
        {claim}
      </p>
      <p className="mt-1.5 text-[0.95rem] text-fg/85 max-w-[60ch]">{how}</p>
      <div className="mt-4 border-2 border-fg rounded-[var(--r-box)] p-3 sm:p-5 space-y-5">{children}</div>
      <figcaption className="mt-3 text-[0.95rem] text-fg/75 max-w-[68ch]">{caption}</figcaption>
      {about ? (
        <Fold summary="What this figure is and is not">
          <div className="text-[0.95rem] text-fg/80 max-w-[68ch] space-y-2">{about}</div>
        </Fold>
      ) : null}
    </figure>
  );
}

/** Folded content: advanced controls, tables of numbers, provenance. Closed until the visitor opens it. */
export function Fold({ summary, children, open }: { summary: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="group" open={open}>
      <summary className="flex items-center min-h-11 border-t border-border text-[0.95rem] text-fg/85 cursor-pointer hover:text-fg list-none [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="mr-2 w-3 font-mono text-xs group-open:hidden">
          +
        </span>
        <span aria-hidden="true" className="mr-2 w-3 font-mono text-xs hidden group-open:inline">
          −
        </span>
        {summary}
      </summary>
      <div className="pt-1 pb-3">{children}</div>
    </details>
  );
}

const chip =
  "inline-flex items-center justify-center min-h-11 sm:min-h-9 px-3 rounded-[var(--r-chip)] border text-[0.95rem] leading-tight transition-colors duration-[var(--dur-tap)]";

/**
 * One-tap scenarios. The first is the one to try. They are choices, not places
 * to go and not matches, so they are ink, never blue or yellow: the pressed one
 * is filled. Two to a row on a phone, so four scenarios take two rows, not four.
 */
export function Presets<T extends string>({
  label = "Try",
  items,
  active,
  onPick,
}: {
  label?: string;
  items: readonly { id: T; label: string }[];
  active: T | null;
  onPick: (id: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
      <span className="fact col-span-2 sm:mr-1">{label}</span>
      {items.map((p) => (
        <button
          key={p.id}
          type="button"
          aria-pressed={active === p.id}
          onClick={() => onPick(p.id)}
          className={`${chip} text-left sm:text-center border-fg/40 hover:border-fg aria-pressed:bg-fg aria-pressed:text-background aria-pressed:border-fg`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

/** One choice out of a few, as a radio group: arrow keys move, the chosen one is ink. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (step === 0) return;
    e.preventDefault();
    const i = options.findIndex((o) => o.id === value);
    const next = options[(i + step + options.length) % options.length];
    onChange(next.id);
    ref.current?.querySelector<HTMLButtonElement>(`[data-id="${next.id}"]`)?.focus();
  };
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <span className="text-[0.95rem] leading-snug text-fg/75">{label}</span>
      <div ref={ref} role="radiogroup" aria-label={label} onKeyDown={onKeyDown} className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            data-id={o.id}
            aria-checked={value === o.id}
            tabIndex={value === o.id ? 0 : -1}
            onClick={() => onChange(o.id)}
            className={`${chip} border-fg/40 hover:border-fg aria-checked:bg-fg aria-checked:text-background aria-checked:border-fg`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * One thing that is on or off: a real switch, not a two-option Segmented. The
 * whole row is the 44 px target, the label sits beside the track and names the
 * switch, and the track is ink when on (a choice, so never blue or yellow).
 */
export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex w-full sm:w-auto items-center gap-3 min-h-11 text-left text-[0.95rem] leading-tight outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-[var(--r-chip)]"
    >
      <span
        aria-hidden="true"
        className="relative inline-block h-6 w-11 shrink-0 rounded-full border-2 border-fg/50 bg-transparent transition-colors duration-[var(--dur-tap)] group-hover:border-fg group-aria-checked:border-fg group-aria-checked:bg-fg"
      >
        <span className="absolute left-0.5 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-fg/60 transition-transform duration-[var(--dur-tap)] group-aria-checked:translate-x-5 group-aria-checked:bg-background" />
      </span>
      <span className="text-fg/85 group-aria-checked:text-fg">
        {label}
        {hint ? <span className="block text-xs text-fg/75">{hint}</span> : null}
      </span>
    </button>
  );
}

/**
 * What the real logic decided, right where the visitor pressed. `ok` and
 * `warn` colour the rule only: they are for a computed outcome, never for
 * decoration. Announced politely to screen readers when it changes.
 */
export function Verdict({ tone = "plain", title, children }: { tone?: "ok" | "warn" | "plain"; title: string; children?: ReactNode }) {
  const rule = tone === "ok" ? "border-ok" : tone === "warn" ? "border-warn" : "border-fg";
  // Always a live region. Making it one only once there is a result was tried and reverted: a region
  // that becomes live in the same update that fills it is often not announced at all.
  return (
    <div role="status" aria-live="polite" data-tone={tone} className={`border-l-4 ${rule} pl-3 py-0.5`}>
      <p className="wd-semi text-lg sm:text-xl font-bold leading-snug">{title}</p>
      {children ? <div className="text-[0.95rem] text-fg/85 max-w-[62ch] mt-0.5">{children}</div> : null}
    </div>
  );
}

/** The one thing to press, and quiet actions beside it. */
export function Actions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-x-4 gap-y-2">{children}</div>;
}

export function QuietAction({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="fact inline-flex items-center min-h-11 sm:min-h-9 underline decoration-fg/30 underline-offset-4 hover:text-fg">
      {children}
    </button>
  );
}
