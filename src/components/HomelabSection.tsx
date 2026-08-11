"use client";

import { services } from "@/lib/data";

export default function HomelabSection() {
  return (
    <section id="homelab" className="max-w-6xl mx-auto px-6 py-24 sm:py-32">
      <h2 className="font-mono text-accent text-sm mb-6 tracking-widest uppercase">
        Homelab
      </h2>

      <div className="glass rounded-xl p-6 sm:p-8 border-white/[0.06]">
        <p className="text-fg/70 text-sm leading-relaxed mb-8">
          14 services running on Proxmox VE across 8 containers and VMs. Gateway
          on NixOS with Traefik, Authelia SSO, and Headscale VPN. All served
          from a single machine under my desk.
        </p>

        {/* Architecture diagram placeholder */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 mb-8 flex-wrap">
          {[
            { label: "Proxmox", css: "bg-accent/10 text-accent border-accent/30" },
            { label: "NixOS Gateway", css: "bg-white/10 text-fg border-white/20" },
            { label: "Traefik v3", css: "bg-white/5 text-fg/70 border-white/10" },
            { label: "Authelia OIDC", css: "bg-white/5 text-fg/70 border-white/10" },
            { label: "Headscale VPN", css: "bg-white/5 text-fg/70 border-white/10" },
            { label: "CrowdSec", css: "bg-white/5 text-fg/70 border-white/10" },
          ].map((item) => (
            <span
              key={item.label}
              className={`px-3 py-1 rounded-full text-xs font-mono border ${item.css}`}
            >
              {item.label}
            </span>
          ))}
        </div>

        {/* Service grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {services.map((s) => (
            <div
              key={s.ct}
              className="glass-hover rounded-lg p-4 border-white/[0.04] transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-green-400/80 animate-pulse" />
                <span className="text-xs font-mono text-accent">{s.ct}</span>
              </div>
              <h4 className="text-fg text-sm font-medium">{s.name}</h4>
              <p className="text-fg/50 text-xs mt-1 leading-relaxed">
                {s.description}
              </p>
              <div className="flex flex-wrap gap-1 mt-3">
                {s.tech.slice(0, 2).map((t) => (
                  <span
                    key={t}
                    className="text-[10px] font-mono text-muted bg-white/[0.02] rounded px-1.5 py-px"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-muted text-xs mt-6 font-mono">
          * Live status would pull from homelab API. Static data shown here for public hosting.
        </p>
      </div>
    </section>
  );
}
