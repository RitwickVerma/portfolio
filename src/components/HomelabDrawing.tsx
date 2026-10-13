"use client";

import { Fragment, useState } from "react";
import { services } from "@/lib/data";
import {
  DRAW_ORDER,
  hull,
  type Box,
  HOST,
  boxFaces,
  footprint,
  bounds,
  corners,
  iso,
  layoutGuests,
  paintOrder,
  planeMatrix,
  r,
  topCentre,
  type Pt,
  type Vec3,
} from "@/lib/iso";

// Fig. 1 — the homelab as an exploded axonometric drawing, generated from the
// real guest list. The red line is the request path this page took to reach you.

const S = 24; // px per world unit
const byId = new Map(services.map((s) => [s.ct, s]));
const guests = layoutGuests(DRAW_ORDER);
const painted = paintOrder(guests);
const find = (id: string) => guests.find((g) => g.id === id)!;

const gateway = find("VM110");
const site = find("CT114");
const backup = find("CT108");
const [gx, gy, gz] = topCentre(gateway);
const [, ty] = topCentre(site);
const ALT = gz + 3.2; // altitude the request arrives at

// Every segment runs along a world axis, so the route stays on the isometric
// grid. Gateway and site share the front row: the path never crosses a box.
const P: Record<string, Vec3> = {
  internet: [gx - 7.6, gy, ALT],
  edge: [gx - 3.9, gy, ALT],
  aboveGw: [gx, gy, ALT],
  gw: [gx, gy, gz],
};
const toS = (v: Vec3) => iso(v, S);
const pathD = (pts: Vec3[]) => "M" + pts.map(toS).map(([a, b]) => `${r(a)} ${r(b)}`).join("L");
const ROUTE = pathD([P.internet, P.edge, P.aboveGw, P.gw]);
// Internal hop: out of the gateway's right face, straight along +x into CT114.
// It is painted between the two boxes, so CT114's opaque body hides its end —
// the line reads as entering the box, the way a real connection would.
const zMid = gateway.z + gateway.h * 0.5;
const HOP = pathD([
  [gateway.x + gateway.w, gy, zMid],
  [site.x + site.w * 0.5, ty, zMid],
]);
const silhouette = (b: Box) =>
  "M" + hull(corners(b).map(toS)).map(([a, c]) => `${r(a)} ${r(c)}`).join("L") + "Z";

// Drive bays on the host's front-left face, vents on its right face.
const bays = Array.from({ length: 11 }, (_, i) => {
  const x0 = 0.6 + i * 1.2;
  const quad: Vec3[] = [
    [x0, HOST.d, 0.32],
    [x0 + 0.95, HOST.d, 0.32],
    [x0 + 0.95, HOST.d, 1.12],
    [x0, HOST.d, 1.12],
  ];
  return "M" + quad.map(toS).map(([a, b]) => `${r(a)} ${r(b)}`).join("L") + "Z";
});
const vents = Array.from({ length: 9 }, (_, i) => {
  const y0 = 0.8 + i * 0.82;
  return pathD([[HOST.w, y0, 0.5], [HOST.w, y0 + 0.5, 0.5]]) + pathD([[HOST.w, y0, 0.95], [HOST.w, y0 + 0.5, 0.95]]);
});
// Exploded-view ghosts: where each guest "lands" on the host's top face.
const footprints = guests.map((g) => boxFaces(footprint(g, HOST.h), S).top);

type Callout = { n: number; anchor: Pt; at: Pt; text: string };
const off = (p: Pt, dx: number, dy: number): Pt => [p[0] + dx, p[1] + dy];
const edgeS = toS(P.edge);
const gwFace = toS([gateway.x + gateway.w * 0.5, gateway.y + gateway.d, gateway.z + gateway.h * 0.5]);
const siteFace = toS([site.x + site.w * 0.5, site.y + site.d, site.z]);
const backupFace = toS([backup.x + backup.w, backup.y + backup.d * 0.5, backup.z + backup.h * 0.5]);
const hostFace = toS([HOST.w, HOST.d * 0.5, HOST.h * 0.5]);
const CALLOUTS: Callout[] = [
  { n: 1, anchor: edgeS, at: off(edgeS, 0, -30), text: "Cloudflare edge — the only way in from the internet" },
  { n: 2, anchor: gwFace, at: off(gwFace, -34, 34), text: "VM110 gateway — Traefik, Authelia SSO, CrowdSec" },
  { n: 3, anchor: siteFace, at: off(siteFace, -6, 44), text: "CT114 — this page: static files behind nginx" },
  { n: 4, anchor: backupFace, at: off(backupFace, 36, -14), text: "CT108 — nightly backup of every guest" },
  { n: 5, anchor: hostFace, at: off(hostFace, 34, 26), text: "One physical Proxmox host running all 15 guests" },
];

// viewBox from every drawn point, plus room for callouts and the entry label.
const allPts: Pt[] = [
  ...corners(HOST).map(toS),
  ...guests.flatMap((g) => corners(g).map(toS)),
  ...Object.values(P).map(toS),
  ...CALLOUTS.map((c) => c.at),
];
const B = bounds(allPts);
const PAD = 18;
const VB = `${r(B.minX - PAD)} ${r(B.minY - PAD - 12)} ${r(B.maxX - B.minX + PAD * 2)} ${r(B.maxY - B.minY + PAD * 2 + 12)}`;

export const LEGEND = CALLOUTS.map((c) => ({ n: c.n, text: c.text }));

export default function HomelabDrawing() {
  const [active, setActive] = useState("CT114");
  const sel = byId.get(active);
  const hostFaces = boxFaces(HOST, S);
  const [ix, iy] = toS(P.internet);
  const gwTop = toS(P.gw);
  // end-of-route dot sits on the back corner of CT114's top face, clear of its ID
  const siteTop = toS([site.x + site.w * 0.8, site.y + site.d * 0.22, site.z + site.h]);

  return (
    <figure className="figure" data-reveal>
      <div className="plate" style={{ padding: "clamp(18px, 3vw, 34px)" }}>
        <span className="plate-tag">Fig. 1</span>
        <svg
          className="drawing"
          viewBox={VB}
          role="group"
          aria-label="Exploded drawing of the homelab: one Proxmox host with 15 guests above it, and the path this request took through the gateway to the web server."
        >
          <defs>
            <pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="4" style={{ stroke: "var(--hatch)", strokeWidth: 1.1 }} />
            </pattern>
          </defs>

          {/* host chassis */}
          <g>
            <path d={hostFaces.left} className="face-left fill-in" />
            <path d={hostFaces.right} className="face-right fill-in" />
            <path d={hostFaces.top} className="face-top fill-in" />
            <path d={hostFaces.left} className="stroke draw" pathLength={1} />
            <path d={hostFaces.right} className="stroke draw" pathLength={1} />
            <path d={hostFaces.top} className="stroke draw" pathLength={1} />
            {bays.map((d, i) => (
              <path key={i} d={d} className="stroke thin draw" pathLength={1} style={{ ["--d" as string]: 300 + i * 30 }} />
            ))}
            {vents.map((d, i) => (
              <path key={i} d={d} className="stroke thin draw" pathLength={1} style={{ ["--d" as string]: 400 + i * 30 }} />
            ))}
          </g>

          {/* footprints: where each guest lands on the host */}
          {footprints.map((d, i) => (
            <path key={i} d={d} className="leader fill-in" style={{ ["--d" as string]: 450 + i * 15 }} />
          ))}

          {/* exploded-view leaders: each guest drops onto the host it runs on */}
          {guests.map((g, i) => {
            const c: Vec3 = [g.x + g.w / 2, g.y + g.d / 2, g.z];
            return (
              <path
                key={g.id}
                d={pathD([c, [c[0], c[1], HOST.h]])}
                className="leader fill-in"
                style={{ ["--d" as string]: 500 + i * 20 }}
              />
            );
          })}

          {/* guests */}
          {painted.map((g, i) => {
            const f = boxFaces(g, S);
            const svc = byId.get(g.id)!;
            const on = active === g.id;
            return (
              <Fragment key={g.id}>
              <g
                className={`guest${on ? " active" : ""}`}
                role="button"
                tabIndex={0}
                aria-pressed={on}
                aria-label={`${g.id} ${svc.name}: ${svc.description}`}
                onPointerEnter={() => setActive(g.id)}
                onFocus={() => setActive(g.id)}
                onClick={() => setActive(g.id)}
                style={{ ["--d" as string]: 700 + i * 45 }}
              >
                {/* fixed hit area — the drawn box lifts on hover, the target doesn't, so hover never flickers */}
                <path d={silhouette(g)} style={{ fill: "transparent" }} />
                <g className="lift">
                <path d={silhouette(g)} className="fill-in" style={{ fill: "var(--paper)" }} />
                <path d={f.left} className="face-left fill-in" />
                <path d={f.right} className="face-right fill-in" />
                <path d={f.top} className="face-top fill-in" />
                <path d={f.left} className="stroke draw" pathLength={1} />
                <path d={f.right} className="stroke draw" pathLength={1} />
                <path d={f.top} className="stroke draw" pathLength={1} />
                <text
                  transform={planeMatrix([g.x + 0.1, g.y + g.d * 0.66, g.z + g.h], S)}
                  fontSize={0.5}
                  className="fill-in"
                  style={{ letterSpacing: "-0.01em", fontWeight: 500 }}
                >
                  {g.id}
                </text>
                </g>
              </g>
              {g.id === "VM110" && (
                <g style={{ ["--d" as string]: 2300 }}>
                  <path d={HOP} className="path-signal draw" pathLength={1} />
                  <path d={HOP} className="path-signal flow fill-in" style={{ ["--d" as string]: 2700 }} />
                </g>
              )}
              </Fragment>
            );
          })}

          {/* the request path */}
          <g style={{ ["--d" as string]: 1500 }}>
            <path d={ROUTE} className="path-signal draw" pathLength={1} />
            <path d={ROUTE} className="path-signal flow fill-in" style={{ ["--d" as string]: 2400, opacity: 0.9 }} />
            <circle cx={ix} cy={iy} r={3.2} style={{ fill: "var(--signal)" }} className="fill-in" />
            <text x={ix} y={iy - 12} className="t-label halo fill-in" textAnchor="middle">
              INTERNET
            </text>
            {/* where the request ends: this page */}
            <circle cx={siteTop[0]} cy={siteTop[1]} r={3.6} style={{ fill: "var(--signal)" }} className="fill-in" />
            {/* where the request enters the gateway */}
            <circle cx={gwTop[0]} cy={gwTop[1]} r={3.6} style={{ fill: "var(--paper)", stroke: "var(--signal)", strokeWidth: 1.6 }} className="fill-in" />
            <path
              d={`M${r(edgeS[0])} ${r(edgeS[1] - 6)}L${r(edgeS[0] + 6)} ${r(edgeS[1])}L${r(edgeS[0])} ${r(edgeS[1] + 6)}L${r(edgeS[0] - 6)} ${r(edgeS[1])}Z`}
              className="fill-in"
              style={{ fill: "var(--paper)", stroke: "var(--signal)", strokeWidth: 1.4 }}
            />
          </g>

          {/* callouts */}
          {CALLOUTS.map((c, i) => (
            <g key={c.n} className="callout fill-in" style={{ ["--d" as string]: 1900 + i * 90 }}>
              <path d={`M${r(c.anchor[0])} ${r(c.anchor[1])}L${r(c.at[0])} ${r(c.at[1])}`} className="leader" style={{ strokeDasharray: "none" }} />
              <circle cx={r(c.at[0])} cy={r(c.at[1])} r={10} />
              <text x={r(c.at[0])} y={r(c.at[1]) + 0.5}>
                {c.n}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <figcaption className="figcap">
        <b>Fig. 1</b>
        <div>
          <span>The homelab this page is served from, drawn from its real inventory. The red line is your request.</span>
          <span className="selected" aria-live="polite">
            <span style={{ color: "var(--signal-text)" }}>{active}</span> · {sel?.name} — {sel?.description}
            <span className="hint">Hover or tab through the guests to inspect them.</span>
          </span>
          <ol className="legend">
            {LEGEND.map((l) => (
              <li key={l.n}>
                <span>{l.n}</span>
                <span>{l.text}</span>
              </li>
            ))}
          </ol>
        </div>
      </figcaption>
    </figure>
  );
}
