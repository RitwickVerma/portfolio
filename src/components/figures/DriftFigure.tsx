"use client";

import { useState } from "react";
import { CALM, DRIFT_GUESTS, INITIAL, plan, sameLive, toggleId, type Finding, type Live } from "@/lib/drift";

// The nightly job of the note, as a model. You break the live side; the job
// reports what its two stages would do. The real job SSHes into the host and
// the gateway and runs OpenTofu against the live host. This runs neither.

const TOGGLE =
  "inline-flex items-center min-h-8 px-3 py-1 rounded-[4px] border-[1.5px] border-fg text-[0.9rem] leading-tight text-left hover:border-accent hover:text-accent aria-pressed:bg-fg aria-pressed:text-bg aria-pressed:hover:text-bg aria-pressed:hover:border-fg disabled:opacity-45 disabled:pointer-events-none";

function Group({ title, items }: { title: string; items: Finding[] }) {
  return (
    <li className="border-t border-border py-3">
      <p className="font-semibold">
        <span className="font-mono text-[0.8rem]">{title}</span>
      </p>
      {items.length === 0 ? null : (
        <ul className="mt-2 space-y-2">
          {items.map((f) => (
            <li key={f.subject} className="grid grid-cols-[5.5rem_1fr] gap-x-3 leading-snug">
              <span className="font-semibold wd-narrow">{f.outcome}</span>
              <span>
                {f.subject}
                <span className="block fact">{f.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default function DriftFigure() {
  const [live, setLive] = useState<Live>(INITIAL);
  const [ran, setRan] = useState<Live>(INITIAL);
  const report = plan(ran);
  const stale = !sameLive(live, ran);

  const part = (step: string) => report.findings.filter((f) => f.step === step);
  const syncLive = part("sync-live");
  const tofuPlan = part("tofu-plan");
  const unseen = part("unseen");

  const flag = (key: "added" | "compose" | "secret" | "inside") => setLive({ ...live, [key]: !live[key] });
  const flags: { key: "added" | "compose" | "secret" | "inside"; label: string }[] = [
    { key: "added", label: "Add a guest Git has not heard of" },
    { key: "compose", label: "Edit a compose file or config" },
    { key: "secret", label: "Leave a live secret in a synced file" },
    { key: "inside", label: "Edit a file inside a container" },
  ];

  return (
    <figure className="my-8 border-t-2 border-fg pt-4" aria-labelledby="drift-cap">
      <div role="region" aria-label="Declared state beside live state. Scrolls sideways on a narrow screen." tabIndex={0} className="overflow-x-auto">
        <ul className="min-w-[34rem]">
          <li className="grid grid-cols-[1.4fr_0.8fr_1.2fr_auto] gap-x-4 pb-2 fact" aria-hidden="true">
            <span>Guest</span>
            <span>Declared in Git</span>
            <span>Live on the host</span>
            <span className="w-[13.5rem]">Break it</span>
          </li>
          {DRIFT_GUESTS.map((g) => {
            const gone = live.gone.includes(g.id);
            const edited = !gone && live.edited.includes(g.id);
            const differs = gone || edited;
            return (
              <li key={g.id} className="grid grid-cols-[1.4fr_0.8fr_1.2fr_auto] gap-x-4 items-center border-t border-border py-2">
                <span>
                  <span className="font-semibold">{g.name}</span> <span className="font-mono text-[0.7rem] text-muted">{g.id}</span>
                </span>
                <span className={g.declared ? "" : "text-muted"}>{g.declared ? "declared" : "not yet"}</span>
                <span className={differs ? "text-warn font-semibold" : ""}>{gone ? "gone" : edited ? "settings edited" : "as it was"}</span>
                <span className="flex gap-2 w-[13.5rem]">
                  <button type="button" className={TOGGLE} aria-pressed={edited} disabled={gone} aria-label={`Edit settings on ${g.name}`} onClick={() => setLive({ ...live, edited: toggleId(live.edited, g.id) })}>
                    Edit settings
                  </button>
                  <button type="button" className={TOGGLE} aria-pressed={gone} aria-label={`Remove ${g.name}`} onClick={() => setLive({ ...live, gone: toggleId(live.gone, g.id) })}>
                    Remove
                  </button>
                </span>
              </li>
            );
          })}
          {live.added && (
            <li className="grid grid-cols-[1.4fr_0.8fr_1.2fr_auto] gap-x-4 items-center border-t border-border py-2">
              <span className="font-semibold">A new guest</span>
              <span className="text-muted">not yet</span>
              <span className="text-warn font-semibold">appeared</span>
              <span className="w-[13.5rem]" />
            </li>
          )}
        </ul>
      </div>

      <ul className="mt-4 flex flex-wrap gap-2" aria-label="More ways to break the live side">
        {flags.map((f) => (
          <li key={f.key}>
            <button type="button" className={TOGGLE} aria-pressed={live[f.key]} onClick={() => flag(f.key)}>
              {f.label}
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" className="btn" onClick={() => setRan({ ...live, edited: [...live.edited], gone: [...live.gone] })}>
          Run tonight&apos;s job
        </button>
        <button type="button" className="btn-quiet" onClick={() => setLive({ ...CALM })}>
          Put it all back
        </button>
        <span className="fact" aria-live="polite">
          {stale ? "You changed the live side since the last run." : "This is what the last run reported."}
        </span>
      </div>

      <div aria-live="polite" className="mt-4" data-testid="drift-report">
        <ul>
          <Group title={syncLive.length === 0 ? "sync-live: the commit is empty" : `sync-live: ${syncLive.length} committed`} items={syncLive} />
          <Group title={tofuPlan.length === 0 ? "tofu-plan: no difference" : `tofu-plan: ${tofuPlan.length} reported, the job does not block`} items={tofuPlan} />
          {unseen.length > 0 && <Group title="neither stage sees" items={unseen} />}
        </ul>
      </div>

      <figcaption id="drift-cap" className="fact mt-4 max-w-[60ch]">
        A model of the policy, on inputs you set. The real job reads the host and runs OpenTofu; this reads nothing. It starts on one made-up night. Declared means what the note says is declared: the dev box and the observability box are not yet.
      </figcaption>
    </figure>
  );
}
