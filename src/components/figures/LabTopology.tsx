import { services } from "@/lib/data";

// The lab as a drawing: one way in, sixteen guests, and the loop that keeps
// Git and the host in agreement. Every box is read from lib/data; nothing
// that could locate a machine (address, port, hostname) is drawn.
//
// It is laid out in HTML, not SVG: an SVG scales its type with the screen, and
// the old drawing read at 6 to 9 px in the note's column. Here every word is
// real text at 12 px or more at any width. On a phone the parts stack, the way
// in first and the loop last; from 1024 px up the way in runs left to right
// and the loop sits in one row under it.

const GATEWAY_PARTS = ["Traefik", "Authelia SSO", "Headscale VPN", "CrowdSec"];

/** An arrow between two parts: down while they stack, right when they sit side by side. */
function Arrow() {
  return (
    <span aria-hidden="true" className="flex items-center justify-center text-xl leading-none text-fg">
      <span className="lg:hidden">↓</span>
      <span className="hidden lg:inline">→</span>
    </span>
  );
}

/** A box of the loop: a name and one line saying what it does. */
function Step({ name, line, quiet }: { name: string; line: string; quiet?: boolean }) {
  return (
    <div className={`rounded-[3px] border-2 px-3 py-2 ${quiet ? "border-fg/50" : "border-fg"}`}>
      <p className="text-[0.95rem] font-semibold leading-snug text-fg">{name}</p>
      <p className="text-[0.8125rem] leading-snug text-fg/75">{line}</p>
    </div>
  );
}

export default function LabTopology() {
  const gateway = services.find((s) => s.name === "Gateway");
  const guests = services.filter((s) => s !== gateway);
  const title = `Lab topology. Traffic enters through the gateway (${gateway?.description}) and reaches ${guests.length} other guests on one Proxmox host. A nightly pipeline diffs the host against Git and commits what changed.`;
  return (
    <figure className="mb-10">
      <div role="img" aria-label={title} className="space-y-2">
        {/* The way in, and the host it opens onto. */}
        <div className="grid gap-2 lg:grid-cols-[auto_auto_auto_auto_1fr] lg:items-center lg:gap-x-3">
          <div>
            <p className="text-[0.95rem] font-semibold text-fg">You</p>
            <p className="text-[0.8125rem] leading-snug text-fg/75">web or VPN</p>
          </div>
          <Arrow />
          <div className="rounded-[3px] bg-fg px-3 py-2 text-background">
            <p className="text-[0.95rem] font-bold leading-snug">Gateway</p>
            <ul className="mt-0.5 grid grid-cols-2 gap-x-4 text-[0.8125rem] leading-snug lg:grid-cols-1">
              {GATEWAY_PARTS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          <Arrow />
          <div className="rounded-md border border-dashed border-fg/40 p-2.5">
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
              {guests.map((s) => (
                <li key={s.ct} className="rounded-[3px] border border-fg bg-background px-2 py-1.5">
                  <p className="text-[0.8125rem] font-semibold leading-tight text-fg">{s.name}</p>
                  <p className="font-mono text-xs leading-snug text-fg/75">{s.ct}</p>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-right text-[0.8125rem] text-fg/75">one Proxmox host</p>
          </div>
        </div>

        {/* The loop: CI checks the host; Git declares to CI and CI commits back. */}
        <div className="grid gap-2 lg:grid-cols-[1fr_auto_1fr_1fr] lg:items-center lg:gap-x-3">
          <div className="lg:order-3">
            <span aria-hidden="true" className="mb-1 block text-center text-xl leading-none text-fg">
              ↑
            </span>
            <Step name="Nightly CI on the lab's own runner" line="reports plan drift against the live host" />
          </div>
          <div className="space-y-0.5 text-[0.8125rem] leading-snug text-fg/75 lg:order-2">
            <p>
              <span aria-hidden="true" className="mr-1.5 text-fg">
                →
              </span>
              declares 14 of 16 guests
            </p>
            <p>
              <span aria-hidden="true" className="mr-1.5 text-fg">
                ←
              </span>
              nightly: commit whatever changed
            </p>
          </div>
          <div className="lg:order-1">
            <Step name="Git repository" line="OpenTofu, configs, SOPS secrets" />
          </div>
          <div className="lg:order-4">
            <Step name="Health check, every 5 minutes" line="pages once per new fault that persists" quiet />
          </div>
        </div>
      </div>
    </figure>
  );
}
