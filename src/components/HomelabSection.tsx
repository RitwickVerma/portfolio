"use client";

import { useEffect } from "react";
import Link from "next/link";
import { services } from "@/lib/data";
import { loadStatus, useStatus } from "@/lib/statusStore";
import { ageMs, formatAge, formatUptime, guestView, runningCount, type GuestView } from "@/lib/status";

const DOT: Record<GuestView, string> = {
  up: "bg-accent",
  down: "bg-warn",
  unknown: "bg-white/25",
};
const DOT_LABEL: Record<GuestView, string> = { up: "running", down: "stopped", unknown: "state unknown" };

export default function HomelabSection() {
  const vms = services.filter((s) => s.ct.startsWith("VM")).length;
  const cts = services.length - vms;
  const snap = useStatus();
  useEffect(loadStatus, []);
  const live = snap.status ? snap : null;

  return (
    <section id="homelab" className="max-w-6xl mx-auto px-6 py-20 sm:py-24">
      <h2 className="font-mono text-muted text-sm mb-6 tracking-widest uppercase">Homelab</h2>

      <div className="grid lg:grid-cols-[1fr_auto] gap-x-12 gap-y-4 items-start mb-8">
        <p className="text-fg/80 text-sm leading-relaxed max-w-2xl">
          One Proxmox host, {cts} containers and {vms} VMs, declared in OpenTofu and diffed
          against the live host nightly by CI. A Debian gateway fronts it with Traefik,
          Authelia and Headscale; secrets are SOPS-encrypted in the same repo; every guest
          is backed up nightly and copied off the host. It serves this site.{" "}
          <Link href="/notes/homelab-git-is-the-truth/" className="text-accent hover:underline underline-offset-4 whitespace-nowrap">
            Git is the truth: how the lab runs →
          </Link>
        </p>

        {live && (
          <p
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs ${
              live.phase === "live"
                ? "border-accent/30 text-accent bg-accent/5"
                : "border-white/15 text-muted bg-white/5"
            }`}
            aria-live="polite"
          >
            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${live.phase === "live" ? "bg-accent" : "bg-white/30"}`} />
            {live.phase === "live" ? "Live" : "Stale"} · {runningCount(live.status)}/{services.length} running ·{" "}
            {formatAge(ageMs(live.status))}
          </p>
        )}
      </div>

      <ul className="flex flex-wrap gap-2">
        {services.map((s) => {
          const view = guestView(live?.status ?? null, s.ct);
          const guest = live?.status.guests.find((g) => g.id === s.ct);
          return (
            <li
              key={s.ct}
              title={s.description}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 font-mono text-xs"
            >
              {live && (
                <span role="img" aria-label={DOT_LABEL[view]} className={`inline-block h-1.5 w-1.5 rounded-full ${DOT[view]}`} />
              )}
              <span className="text-accent">{s.ct}</span>
              <span className="text-fg/85">{s.name}</span>
              {live && view === "up" && guest?.uptimeSeconds !== undefined && (
                <span className="text-muted">{formatUptime(guest.uptimeSeconds)}</span>
              )}
            </li>
          );
        })}
      </ul>

      <p className="text-muted text-xs mt-5 font-mono">
        {live
          ? "Live: the host writes /status.json every five minutes. Guest state and uptime only."
          : "Static inventory, not a live status page."}
      </p>
    </section>
  );
}
