"use client";

import { useState } from "react";
import { FigureFrame, Presets, Verdict } from "./kit";
import { LOSSES, headline, verdict, type Loss } from "@/lib/restore";

// Which copy brings it back, by the note's own description of the copies.
// The rows and the verdict come from verdict() in lib/restore.

const ORDER: Loss[] = ["host", "file", "config", "guest", "other"];
const ITEMS = ORDER.map((id) => ({ id, label: LOSSES.find((l) => l.id === id)!.label }));

export default function BackupsFigure() {
  const [loss, setLoss] = useState<Loss | null>(null);
  const v = verdict(loss ?? "host");

  return (
    <FigureFrame
      claim="Lose the host and its backup goes with it; a second copy on another machine brings it back."
      how="Press the first button: the host is lost, and the copies that survive light up."
      caption="A lookup built from the note's description of the copies, not a restore."
      about={
        <>
          <p>The note describes three places that hold your data. The Backup Server takes every guest nightly and lives on the host. Restic then copies that backup store, nightly, to a different machine. Git holds what is written down about the host and the config files, and the note says what is inside each container is the backup&apos;s problem, not Git&apos;s.</p>
          <p>The point of the second copy is that the first lives on the thing that would fail. The figure does not model how fresh a copy is, how long a restore takes, or whether it works. Losing both machines is not drawn: the note does not say what happens then.</p>
        </>
      }
    >
      <Presets label="Lose" items={ITEMS} active={loss} onPick={setLoss} />

      <ul aria-label="The three places a copy lives">
        {v.rows.map(({ copy, state }) => {
          const on = loss !== null && state === "restores it";
          const gone = loss !== null && state === "had it, lost with it";
          return (
            <li
              key={copy.id}
              data-state={loss === null ? "idle" : state}
              className={`grid grid-cols-[1fr_auto] gap-x-3 items-baseline border-t border-border px-2 py-2 ${on ? "bg-hit text-ink" : ""}`}
            >
              <span>
                <span className={`font-semibold ${gone ? "line-through" : ""}`}>{copy.label}</span>
                <span className={`block text-[0.95rem] ${on ? "" : "text-fg/75"}`}>Lives {copy.where}.</span>
              </span>
              <span className={`text-[0.95rem] text-right ${on ? "font-bold" : gone ? "font-semibold" : "text-fg/75"}`}>{loss === null ? "intact" : state}</span>
            </li>
          );
        })}
      </ul>

      {loss === null ? (
        <Verdict title="Nothing is lost yet.">Press a loss to see which copy would bring it back.</Verdict>
      ) : (
        <Verdict tone={v.dataLost ? "warn" : loss === "other" ? "plain" : "ok"} title={headline(loss)}>
          {loss === "host" ? "There is a written recovery playbook next to the restic password." : null}
        </Verdict>
      )}
    </FigureFrame>
  );
}
