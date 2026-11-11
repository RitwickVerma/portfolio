"use client";

import { useEffect } from "react";
import Link from "next/link";
import { services } from "@/lib/data";
import { labCounts } from "@/lib/lab";
import { loadStatus, useStatus } from "@/lib/statusStore";
import { ageMs, formatAge, formatUptime, guestView, runningCount, type GuestView } from "@/lib/status";
import Section from "@/components/Section";
import LabTopology from "@/components/figures/LabTopology";
import { Fold } from "@/components/figures/kit";

const STATE: Record<GuestView, { label: string; cls: string }> = {
  up: { label: "running", cls: "text-fg" },
  down: { label: "stopped", cls: "text-warn font-semibold" },
  unknown: { label: "unknown", cls: "text-muted" },
};

export default function Homelab() {
  const { containers: cts, vms, declared, guests } = labCounts();
  const snap = useStatus();
  useEffect(loadStatus, []);
  const live = snap.status ? snap : null;

  return (
    <Section
      id="homelab"
      title="I run a lab that diffs itself against Git every night."
      lede={
        <>
          <p>
            One Proxmox host, {cts} containers and {vms} VMs. OpenTofu declares {declared} of the {guests}, and CI diffs them
            against the live host nightly. Secrets are SOPS-encrypted in the same repo, and every guest is backed up nightly and
            copied off the host.
          </p>
          <p>
            <Link href="/notes/homelab-git-is-the-truth/" className="link">
              Git is the truth: how the lab runs
            </Link>
          </p>
        </>
      }
    >
      <LabTopology />
      <p className="fact mb-3" aria-live="polite">
        {live
          ? `${live.phase === "live" ? "Live" : "Stale"}: ${runningCount(live.status)} of ${services.length} running, checked ${formatAge(ageMs(live.status))}. Guest state and uptime only.`
          : "The inventory, not a live status page."}
      </p>
      <Fold summary={`All ${guests} guests`}>
        <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-8 border-b border-border">
          {services.map((s) => {
            const view = guestView(live?.status ?? null, s.ct);
            const guest = live?.status.guests.find((g) => g.id === s.ct);
            return (
              <li key={s.ct} className="border-t border-border py-3 grid grid-cols-[3.4rem_1fr] gap-x-3">
                <span className="font-mono text-xs text-muted pt-1">{s.ct}</span>
                <span>
                  <span className="font-semibold">{s.name}</span>
                  <span className="block text-[0.95rem] text-fg/75 leading-snug">{s.description}</span>
                  {live && (
                    <span className={`block wd-narrow text-sm ${STATE[view].cls}`}>
                      {STATE[view].label}
                      {view === "up" && guest?.uptimeSeconds !== undefined ? `, up ${formatUptime(guest.uptimeSeconds)}` : ""}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </Fold>
    </Section>
  );
}
