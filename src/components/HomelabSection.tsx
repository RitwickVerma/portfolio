"use client";

import { services } from "@/lib/data";

const stack = [
  { label: "Proxmox", css: "bg-accent/10 text-accent border-accent/30" },
  { label: "Debian + Docker gateway", css: "bg-white/10 text-fg border-white/20" },
  { label: "Traefik v3", css: "bg-white/5 text-fg/80 border-white/10" },
  { label: "Authelia OIDC", css: "bg-white/5 text-fg/80 border-white/10" },
  { label: "Headscale VPN", css: "bg-white/5 text-fg/80 border-white/10" },
  { label: "CrowdSec", css: "bg-white/5 text-fg/80 border-white/10" },
];

export default function HomelabSection() {
  const vms = services.filter((s) => s.ct.startsWith("VM")).length;
  const cts = services.length - vms;

  return (
    <section id="homelab" className="max-w-6xl mx-auto px-6 py-24 sm:py-32">
      <h2 className="font-mono text-accent text-sm mb-6 tracking-widest uppercase">
        Homelab
      </h2>

      <div className="glass rounded-xl p-6 sm:p-8 border-white/[0.06]">
        <p className="text-fg/80 text-sm leading-relaxed mb-8">
          {services.length} guests on a single Proxmox VE host: {cts} LXC
          containers and {vms} VMs. A Debian + Docker gateway fronts everything
          with Traefik, Authelia SSO and a Headscale VPN, and Proxmox takes a
          nightly backup of every guest.
        </p>

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
          {services.map((s) => (
            <li
              key={s.ct}
              className="glass-hover rounded-lg p-4 border border-white/[0.04] transition-all"
            >
              <span className="text-xs font-mono text-accent">{s.ct}</span>
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
          ))}
        </ul>

        <p className="text-muted text-xs mt-6 font-mono">
          Static inventory, not a live status page.
        </p>
      </div>
    </section>
  );
}
