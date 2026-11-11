"use client";

import { useState } from "react";
import { Actions, FigureFrame, Fold, Presets, QuietAction, Segmented, Toggle, Verdict } from "./kit";
import { CALM, DRIFT_GUESTS, SCENARIOS, guestState, headline, jobFor, plan, sameLive, setGuest, type GuestState, type Live, type ScenarioId } from "@/lib/drift";

// The nightly job of the note, as a model. A scenario changes the lab by hand
// and then runs the job; the drawing and the verdict are computed from
// plan() in lib/drift. Nothing here reads a host.

const GUEST_OPTIONS: { id: GuestState; label: string }[] = [
  { id: "as it was", label: "Unchanged" },
  { id: "edited", label: "Settings edited" },
  { id: "gone", label: "Gone" },
];

const HOST_WORD: Record<GuestState, string> = { "as it was": "unchanged", edited: "settings edited", gone: "gone" };

function Row({ title, sub, job, differs }: { title: string; sub: string; job: string; differs: boolean }) {
  return (
    <li className="grid grid-cols-[1fr_auto] gap-x-3 items-baseline border-t border-border py-1.5">
      <span>
        <span className="font-semibold">{title}</span>
        <span className={`block text-[0.95rem] leading-snug ${differs ? "text-fg" : "text-fg/75"}`}>{sub}</span>
      </span>
      <span className={`wd-narrow text-[0.95rem] text-right ${job === "nothing to report" ? "text-muted" : "font-bold"}`}>{job}</span>
    </li>
  );
}

export default function DriftFigure() {
  const [live, setLive] = useState<Live>(CALM);
  const [ran, setRan] = useState<Live>(CALM);
  const [active, setActive] = useState<ScenarioId | null>(null);

  const report = plan(ran);
  const stale = !sameLive(live, ran);
  const said = headline(report);

  const pick = (id: ScenarioId) => {
    const next = SCENARIOS.find((s) => s.id === id)!.live;
    setLive(next);
    setRan(next);
    setActive(id);
  };
  const edit = (next: Live) => {
    setLive(next);
    setActive(null);
  };
  const flag = (key: "added" | "compose" | "secret" | "inside", on: boolean) => edit({ ...live, [key]: on });

  const job = (subject: string, seen: string) => {
    if (stale) return "run the job";
    const o = jobFor(report, subject);
    return o === "nothing" ? seen : o === "committed" ? "saved" : o === "not seen" ? "cannot see" : o;
  };

  const extras: { key: "added" | "compose" | "secret" | "inside"; subject: string; title: string; sub: string }[] = [
    { key: "added", subject: "A new guest", title: "A new guest", sub: "In the repository: no. On the host: appeared." },
    { key: "compose", subject: "A compose file or config", title: "A config file on the host", sub: "On the host: changed by hand." },
    { key: "secret", subject: "A synced file with a live secret", title: "A config file with a password in it", sub: "On the host: changed by hand." },
    { key: "inside", subject: "A file inside a container", title: "A file inside a container", sub: "On the host: changed by hand." },
  ];

  return (
    <FigureFrame
      claim="Change something by hand and the nightly job notices, with two exceptions it cannot see."
      how="Press the first scenario: something is changed by hand on the lab, then the nightly job runs and says what it finds."
      caption="A model of the job's policy on made-up changes: the real job reads the host and runs OpenTofu, and this reads nothing."
      about={
        <>
          <p>The job has two stages. One compares the live host with what is written in the repository and reports any difference. The other pulls the live config files and saves whatever changed. The model keeps that split: a changed setting on a guest the repository describes is reported; a changed config file is saved; a password in a synced file is scrubbed before it is saved.</p>
          <p>Fourteen of the sixteen guests are described in the repository. The dev box and the observability box are not yet, so the comparison has nothing to hold their changes against. That last step is my inference from the note&apos;s count, not a sentence in it. What is inside a container is the backup&apos;s problem, not Git&apos;s.</p>
          <p>The four guests drawn are named in the site&apos;s inventory. The changes are not real and the figure starts on a quiet night.</p>
        </>
      }
    >
      <Presets items={SCENARIOS} active={active} onPick={pick} />

      <div>
        <ul aria-label="What is in the repository, what is on the host, and what the job did about it">
          {DRIFT_GUESTS.map((g) => {
            const st = guestState(live, g.id);
            return (
              <Row
                key={g.id}
                title={`${g.name} · ${g.id}`}
                sub={`In the repository: ${g.declared ? "yes" : "not yet"}. On the host: ${HOST_WORD[st]}.`}
                job={job(g.name, "nothing to report")}
                differs={st !== "as it was"}
              />
            );
          })}
          {extras
            .filter((e) => live[e.key])
            .map((e) => (
              <Row key={e.key} title={e.title} sub={e.sub} job={job(e.subject, "nothing to report")} differs />
            ))}
        </ul>
      </div>

      <Verdict tone={stale ? "plain" : said.tone} title={stale ? "You changed the lab. Run the job to see what it finds." : said.title}>
        {stale ? null : said.details.length ? said.details.map((d) => <p key={d}>{d}</p>) : null}
      </Verdict>

      <Fold summary="More controls">
        <div className="space-y-3">
          {DRIFT_GUESTS.map((g) => (
            <Segmented key={g.id} label={g.name} options={GUEST_OPTIONS} value={guestState(live, g.id)} onChange={(v) => edit(setGuest(live, g.id, v))} />
          ))}
          <Toggle label="A new guest appears" checked={live.added} onChange={(on) => flag("added", on)} />
          <Toggle label="A config file is edited" checked={live.compose} onChange={(on) => flag("compose", on)} />
          <Toggle label="A password is left in a config" checked={live.secret} onChange={(on) => flag("secret", on)} />
          <Toggle label="A file inside a container is edited" checked={live.inside} onChange={(on) => flag("inside", on)} />
          <Actions>
            <button type="button" className="btn min-h-11 sm:min-h-9" onClick={() => setRan({ ...live, edited: [...live.edited], gone: [...live.gone] })}>
              Run tonight&apos;s job
            </button>
            <QuietAction
              onClick={() => {
                setLive(CALM);
                setRan(CALM);
                setActive(null);
              }}
            >
              Put it all back
            </QuietAction>
          </Actions>
        </div>
      </Fold>

      <Fold summary="What each step did">
        <ul className="space-y-2 text-[0.95rem]" data-testid="drift-steps">
          {(["sync-live", "tofu-plan", "unseen"] as const).map((step) => {
            const items = report.findings.filter((f) => f.step === step);
            const title = step === "sync-live" ? (items.length ? `sync-live saved ${items.length}` : "sync-live saved nothing") : step === "tofu-plan" ? (items.length ? `tofu-plan reported ${items.length}` : "tofu-plan found no difference") : "Neither step sees";
            if (step === "unseen" && items.length === 0) return null;
            return (
              <li key={step}>
                <span className="font-mono text-[0.8rem] font-semibold">{title}</span>
                {items.map((f) => (
                  <span key={f.subject} className="block text-fg/80">
                    {f.subject}: {f.detail}
                  </span>
                ))}
              </li>
            );
          })}
        </ul>
      </Fold>
    </FigureFrame>
  );
}
