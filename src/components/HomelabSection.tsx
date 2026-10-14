"use client";

import { useEffect } from "react";
import { services } from "@/lib/data";
import { loadStatus, useStatus } from "@/lib/statusStore";
import { ageMs, formatAge, formatUptime, guestView, runningCount, type GuestView } from "@/lib/status";

const stack = [
  { label: "Proxmox", css: "bg-accent/10 text-accent border-accent/30" },
  { label: "OpenTofu", css: "bg-white/10 text-fg border-white/20" },
  { label: "Debian + Docker gateway", css: "bg-white/10 text-fg border-white/20" },
  { label: "Traefik v3", css: "bg-white/5 text-fg/80 border-white/10" },
  { label: "Authelia OIDC", css: "bg-white/5 text-fg/80 border-white/10" },
  { label: "Headscale VPN", css: "bg-white/5 text-fg/80 border-white/10" },
  { label: "CrowdSec", css: "bg-white/5 text-fg/80 border-white/10" },
  { label: "SOPS + age", css: "bg-white/5 text-fg/80 border-white/10" },
];

const DOT: Record<GuestView, string> = {
  up: "bg-accent shadow-[0_0_6px_#64ffda]",
  down: "bg-[#ff4444] shadow-[0_0_6px_#ff4444]",
  unknown: "bg-white/20",
};

const DOT_LABEL: Record<GuestView, string> = { up: "running", down: "stopped", unknown: "state unknown" };

export default function HomelabSection() {
  const vms = services.filter((s) => s.ct.startsWith("VM")).length;
  const cts = services.length - vms;
  const snap = useStatus();
  useEffect(loadStatus, []);

  const live = snap.status ? snap : null;
  const running = live ? runningCount(live.status) : null;

  return (
    <section id="homelab" className="max-w-6xl mx-auto px-6 py-24 sm:py-32">
      <h2 className="font-mono text-accent text-sm mb-6 tracking-widest uppercase">
        Homelab
      </h2>

      <div className="glass rounded-xl p-6 sm:p-8 border-white/[0.06]">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <p className="text-fg/80 text-sm leading-relaxed max-w-3xl">
            {services.length} guests on a single Proxmox VE host: {cts} LXC
            containers and {vms} VMs, declared in OpenTofu and diffed against
            the live host every night by CI. A
            Debian + Docker gateway fronts everything with Traefik, Authelia SSO
            and a Headscale VPN. Secrets are SOPS-encrypted in the same repo.
            Proxmox Backup Server takes a nightly backup of every guest and
            restic copies it off the host.
          </p>

          {/* Live pill: only when /status.json parsed. Otherwise nothing, and the
              footer line says the inventory is static. */}
          {live && (
            <p
              className={`shrink-0 self-start inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs ${
                live.phase === "live"
                  ? "border-accent/30 text-accent bg-accent/5"
                  : "border-white/15 text-muted bg-white/5"
              }`}
              aria-live="polite"
            >
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 rounded-full ${live.phase === "live" ? "bg-accent shadow-[0_0_6px_#64ffda]" : "bg-white/30"}`}
              />
              {live.phase === "live" ? "Live" : "Stale"} · {running}/{services.length} running ·{" "}
              {formatAge(ageMs(live.status))}
            </p>
          )}
        </div>

        <ul className="flex items-center justify-center gap-3 sm:gap-4 mb-8 flex-wrap">
          {stack.map((item) => (
            <li
              key={item.label}
              className={`px-3 py-1 rounded-full text-xs font-mono border ${item.css}`}
            >
              {item.label}
            </li>
          ))}
        </ul>

        <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {services.map((s) => {
            const view = guestView(live?.status ?? null, s.ct);
            const guest = live?.status.guests.find((g) => g.id === s.ct);
            return (
              <li
                key={s.ct}
                className="glass-hover rounded-lg p-4 border border-white/[0.04] transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-accent">{s.ct}</span>
                  {live && (
                    <span className="flex items-center gap-1.5 text-[11px] font-mono text-muted">
                      {guest?.uptimeSeconds !== undefined && view === "up" && (
                        <span>up {formatUptime(guest.uptimeSeconds)}</span>
                      )}
                      <span
                        role="img"
                        aria-label={DOT_LABEL[view]}
                        className={`inline-block h-1.5 w-1.5 rounded-full ${DOT[view]}`}
                      />
                    </span>
                  )}
                </div>
                <h3 className="text-fg text-sm font-medium mt-1">{s.name}</h3>
                <p className="text-fg/70 text-xs mt-1 leading-relaxed">
                  {s.description}
                </p>
                <ul className="flex flex-wrap gap-1 mt-3">
                  {s.tech.slice(0, 2).map((t) => (
                    <li
                      key={t}
                      className="text-xs font-mono text-muted bg-white/[0.02] rounded px-1.5 py-px"
                    >
                      {t}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>

        <p className="text-muted text-xs mt-6 font-mono">
          {live
            ? "Live: the host writes /status.json every five minutes — guest state and uptime, nothing that identifies a machine."
            : "Static inventory, not a live status page."}
        </p>
      </div>
    </section>
  );
}
