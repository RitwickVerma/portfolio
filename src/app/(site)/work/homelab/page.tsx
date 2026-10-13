import type { Metadata } from "next";
import Sheet from "@/components/Sheet";
import { CaseHeader, Callout, Fig, NextCase, Step } from "@/components/case";
import { services } from "@/lib/data";

export const metadata: Metadata = {
  title: "A homelab run like production",
  description:
    "Fifteen self-hosted services on one Proxmox host: a gateway with SSO and a VPN, pinned images, nightly backups, and two honest postmortems — one about this site.",
  alternates: { canonical: "/work/homelab/" },
};

// Public exposure, verified against public DNS: only these hostnames resolve.
const EXPOSURE: Record<string, string> = {
  CT114: "Public · www",
  CT106: "Public · share links only",
  VM110: "Public · login + VPN",
};

const DECISIONS = [
  {
    t: "Private by default",
    b: "Four hostnames resolve publicly: this site, photo share links, the login portal and the VPN. Everything else has no public DNS record at all and is reached over a self-hosted WireGuard mesh (Headscale).",
  },
  {
    t: "One service per container",
    b: "A guest does one job, so an upgrade or a compromise has one blast radius. There is one known exception — the monitoring stack (health checks, log viewer, image watcher) runs inside CT101 — and it’s on the list to move.",
  },
  {
    t: "Pinned images, deliberate upgrades",
    b: "No auto-updater. Every image is pinned to a verified build; a watcher reports new tags, and upgrades happen on purpose, one service at a time.",
  },
  {
    t: "SSO in front of everything",
    b: "Traefik routes, CrowdSec screens, and Authelia (OIDC + forward-auth) authenticates before a request reaches a service. Services that speak OIDC log in through it directly.",
  },
  {
    t: "Nightly backups, scrubbed storage",
    b: "Proxmox takes a nightly backup of every guest to a dedicated Backup Server container, and the ZFS pools are scrubbed on a schedule to catch silent corruption before it spreads.",
  },
  {
    t: "Alerts that stay silent",
    b: "Health checks probe the services and alert over Telegram when something changes state. A quiet phone means the estate is healthy, so a message always means something.",
  },
];

export default function Homelab() {
  return (
    <>
      <CaseHeader
        slug="homelab"
        abstract={
          <p>
            One physical machine runs everything I self-host — passwords, photos, documents, DNS, media, this
            site. I run it the way I’d want a production service run: small blast radius, nothing public by
            accident, and failures that announce themselves. Below are the decisions, and two times it went wrong.
          </p>
        }
      />

      <Sheet no="01" label="Architecture">
        <div className="case-body">
          <Fig no="1" caption="How a request reaches a service. The red rule marks the only public path; most services are not reachable from the internet at all.">
            <div className="topo">
              <div className="signal-top">
                <span className="label label-signal">01 · Edge</span>
                <h4>Cloudflare</h4>
                <ul>
                  <li>DNS + proxy</li>
                  <li>4 public hostnames</li>
                  <li>origin IP hidden</li>
                </ul>
              </div>
              <div className="signal-top">
                <span className="label label-signal">02 · Gateway VM</span>
                <h4>Debian + Docker</h4>
                <ul>
                  <li>CrowdSec — screen</li>
                  <li>Traefik — route, TLS</li>
                  <li>Authelia — SSO, OIDC</li>
                  <li>Headscale — VPN</li>
                </ul>
              </div>
              <div>
                <span className="label">03 · Host</span>
                <h4>Proxmox VE</h4>
                <ul>
                  <li>13 containers, 2 VMs</li>
                  <li>ZFS storage</li>
                  <li>nightly backups</li>
                </ul>
              </div>
              <div>
                <span className="label">04 · Guests</span>
                <h4>One job each</h4>
                <ul>
                  <li>public: 3 of 15</li>
                  <li>VPN / LAN: the rest</li>
                  <li>images pinned</li>
                </ul>
              </div>
            </div>
          </Fig>

          <div className="table-wrap" data-reveal>
            <table className="table">
              <caption className="label">Fig. 2 · Inventory — every guest on the host · IDs in red are reachable from the internet</caption>
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Service</th>
                  <th scope="col" className="hide-sm">Role</th>
                  <th scope="col" className="r">Exposure</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.ct}>
                    <td className="v" style={{ color: EXPOSURE[s.ct] ? "var(--signal-text)" : undefined }}>{s.ct}</td>
                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                    <td className="hide-sm muted">{s.description}</td>
                    <td className="r mono" style={{ fontSize: 12.5 }}>{EXPOSURE[s.ct] ?? "VPN / LAN"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Sheet>

      <Sheet no="02" label="Decisions">
        <div className="case-body">
          <div className="principles">
            {DECISIONS.map((d, i) => (
              <div key={d.t} className="principle" data-reveal>
                <span className="sheet-no">D{i + 1}</span>
                <h3 className="h-3">{d.t}</h3>
                <p>{d.b}</p>
              </div>
            ))}
          </div>
        </div>
      </Sheet>

      <Sheet no="03" label="Postmortems">
        <div className="case-body">
          <Callout>Two incidents, both on this website. Both were silent, which is the actual failure.</Callout>

          <article className="pm" data-reveal>
            <div className="pm-head">
              <h3 className="h-3">PM-1 · The site that stopped deploying for seven weeks</h3>
              <span className="label">13 Aug → 30 Sep 2026 · sev: low · silent</span>
            </div>
            <dl>
              <dt>Impact</dt>
              <dd>Every change to this site from mid-August onward never went live. Visitors saw a stale build.</dd>
              <dt>Root cause</dt>
              <dd>
                The web server’s container had 512 MB of RAM. <code className="code">npm ci</code> was OOM-killed
                mid-install, the deploy script’s <code className="code">set -e</code> exited before the copy step, and
                nginx kept serving the previous build.
              </dd>
              <dt>Why silent</dt>
              <dd>
                Every check was a status code, and every request still returned 200 — nginx even serves its 404 page
                with a 200. Nothing measured whether the bytes being served were new.
              </dd>
              <dt>Fix</dt>
              <dd>Memory raised to 2 GB. Deploys are now verified by webroot timestamp and by grepping the served page for content from the change, never by status code.</dd>
            </dl>
          </article>

          <article className="pm" data-reveal>
            <div className="pm-head">
              <h3 className="h-3">PM-2 · The 3D hero that only worked without a GPU</h3>
              <span className="label">13 Oct 2026 · same-day fix</span>
            </div>
            <dl>
              <dt>Impact</dt>
              <dd>A WebGPU renderer shipped for the previous hero. Visitors on Chrome with a GPU saw a static placeholder instead of the scene.</dd>
              <dt>Root cause</dt>
              <dd>
                The renderer factory was handed a props object where it expected a canvas. A type cast had silenced
                the compiler error that would have caught it.
              </dd>
              <dt>Why silent</dt>
              <dd>
                Every automated browser check ran headless, with no GPU — so every check exercised the WebGL
                fallback, which worked. The broken path was never the one being tested.
              </dd>
              <dt>Fix</dt>
              <dd>Signature fixed and the cast removed; WebGPU made opt-in; a harness that forces a software WebGPU adapter now exercises both renderer paths, so the GPU path can be tested headless.</dd>
            </dl>
          </article>

          <Step no="3.1" title="Known risk, stated plainly">
            <p>
              The bulk-storage pool is a single external USB drive with no mirror, and its USB bridge has degraded.
              That pool is a single point of failure. The plan is to
              retire it for an internal NVMe drive; until then it’s set to keep serving rather than hang the host if
              the disk misbehaves.
            </p>
          </Step>
        </div>
      </Sheet>

      <NextCase slug="homelab" />
    </>
  );
}
