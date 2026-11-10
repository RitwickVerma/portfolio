"use client";

import { useState } from "react";
import { LOSSES, verdict, type Loss } from "@/lib/restore";

// Which copy brings it back, by the note's own description of the copies.

const TOGGLE =
  "inline-flex items-center min-h-8 px-3 py-1 rounded-[4px] border-[1.5px] border-fg text-[0.9rem] leading-tight text-left hover:border-accent hover:text-accent aria-pressed:bg-fg aria-pressed:text-bg aria-pressed:hover:text-bg aria-pressed:hover:border-fg";

export default function BackupsFigure() {
  const [loss, setLoss] = useState<Loss>("host");
  const v = verdict(loss);

  return (
    <figure className="my-8 border-t-2 border-fg pt-4" aria-labelledby="backups-cap">
      <p className="fact mb-2" id="backups-q">What do you lose?</p>
      <ul className="flex flex-wrap gap-2" role="group" aria-labelledby="backups-q">
        {LOSSES.map((l) => (
          <li key={l.id}>
            <button type="button" className={TOGGLE} aria-pressed={loss === l.id} onClick={() => setLoss(l.id)}>
              {l.label}
            </button>
          </li>
        ))}
      </ul>

      <ul className="mt-4" aria-live="polite" data-testid="backups-result">
        {v.rows.map(({ copy, state }) => (
          <li key={copy.id} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1.2fr_1fr_auto] gap-x-4 gap-y-0.5 items-baseline border-t border-border py-2">
            <span className="font-semibold">{copy.label}</span>
            <span className="fact sm:order-none order-last col-span-2 sm:col-span-1">{copy.where}</span>
            <span className={state === "restores it" ? "font-semibold" : "text-muted"}>{state}</span>
          </li>
        ))}
        <li className="border-t border-border pt-3 leading-snug">
          {loss === "other"
            ? "Nothing to restore. One copy is left, and it lives on the host."
            : v.dataLost
              ? "No copy in the note holds this."
              : loss === "host"
                ? "The first copy lived on the host. The off-host copy and the playbook are how it comes back."
                : "Restored from the nightly copy."}
        </li>
      </ul>

      <figcaption id="backups-cap" className="fact mt-4 max-w-[60ch]">
        A lookup built from the note&apos;s description of the copies, not a restore. It does not model how recent a copy is or whether a restore works.
      </figcaption>
    </figure>
  );
}
