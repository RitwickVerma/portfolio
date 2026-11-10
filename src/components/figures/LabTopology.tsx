import { services } from "@/lib/data";

// The lab as a drawing: one way in, sixteen guests, and the loop that keeps
// Git and the host in agreement. Every box is read from lib/data; nothing
// that could locate a machine (address, port, hostname) is drawn.
//
// Two drawings of the same boxes. From 1024 px up: wide, one row of loop boxes
// under a five-column grid. Below that the wide one would be 6 to 9 px type
// and clipped by the viewport, so the same boxes are stacked into a column:
// way in, three-column host, the CI box, Git, the health check.

const W = 1000;
const H = 262;
const COLS = 5;
const CELL = { w: 128, h: 40, gx: 10, gy: 10 };
const GRID_X = 300;
const GRID_Y = 24;

const GATEWAY_PARTS = ["Traefik", "Authelia SSO", "Headscale VPN", "CrowdSec"];
const MUTED = { style: { fontStretch: "78%" } } as const;

function Wide({ guests, title }: { guests: typeof services; title: string }) {
  const gridW = COLS * CELL.w + (COLS - 1) * CELL.gx;
  const rows = Math.ceil(guests.length / COLS);
  const gridH = rows * CELL.h + (rows - 1) * CELL.gy;
  const gw = { x: 118, y: GRID_Y + gridH / 2 - 44, w: 132, h: 88 };
  const loopY = GRID_Y + gridH + 62;

  return (
      <svg viewBox={`0 0 ${W} ${H}`} className="hidden lg:block w-full h-auto" role="img" aria-labelledby="lab-title">
        <title id="lab-title">{title}</title>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 10 5 0 10z" fill="var(--fg)" />
          </marker>
        </defs>

        {/* The host */}
        <rect x={100} y={6} width={gridW + GRID_X - 100 + 12} height={gridH + 36} fill="none" stroke="var(--fg)" strokeOpacity={0.3} strokeDasharray="4 4" rx={6} />
        <text x={gridW + GRID_X + 4} y={gridH + 35} textAnchor="end" fontSize={11} fill="var(--muted)" style={{ fontStretch: "78%" }}>
          one Proxmox host
        </text>

        {/* Way in */}
        <text x={8} y={gw.y + 38} fontSize={13} fill="var(--fg)" fontWeight={600}>
          You
        </text>
        <text x={8} y={gw.y + 55} fontSize={11} fill="var(--muted)" style={{ fontStretch: "78%" }}>
          web or VPN
        </text>
        <line x1={64} x2={gw.x - 4} y1={gw.y + 44} y2={gw.y + 44} stroke="var(--fg)" strokeWidth={1.5} markerEnd="url(#arrow)" />

        {/* Gateway */}
        <rect x={gw.x} y={gw.y} width={gw.w} height={gw.h} fill="var(--fg)" rx={3} />
        <text x={gw.x + 10} y={gw.y + 22} fontSize={13} fill="var(--bg)" fontWeight={700}>
          Gateway
        </text>
        {GATEWAY_PARTS.map((t, i) => (
          <text key={t} x={gw.x + 10} y={gw.y + 39 + i * 13} fontSize={10.5} fill="var(--bg)" fillOpacity={0.8} style={{ fontStretch: "78%" }}>
            {t}
          </text>
        ))}

        {/* Fan-out */}
        <line x1={gw.x + gw.w} x2={GRID_X - 6} y1={gw.y + 44} y2={gw.y + 44} stroke="var(--fg)" strokeWidth={1.5} markerEnd="url(#arrow)" />

        {guests.map((s, i) => {
          const x = GRID_X + (i % COLS) * (CELL.w + CELL.gx);
          const y = GRID_Y + Math.floor(i / COLS) * (CELL.h + CELL.gy);
          return (
            <g key={s.ct}>
              <rect x={x} y={y} width={CELL.w} height={CELL.h} fill="var(--bg)" stroke="var(--fg)" rx={3} />
              <text x={x + 8} y={y + 17} fontSize={12} fill="var(--fg)" fontWeight={600}>
                {s.name}
              </text>
              <text x={x + 8} y={y + 31} fontSize={9} fill="var(--muted)" fontFamily="var(--font-mono)">
                {s.ct}
              </text>
            </g>
          );
        })}

        {/* The loop */}
        <rect x={100} y={loopY - 20} width={150} height={40} fill="none" stroke="var(--fg)" strokeWidth={1.5} rx={3} />
        <text x={112} y={loopY - 3} fontSize={12} fill="var(--fg)" fontWeight={600}>
          Git repository
        </text>
        <text x={112} y={loopY + 11} fontSize={10.5} fill="var(--muted)" style={{ fontStretch: "78%" }}>
          OpenTofu, configs, SOPS secrets
        </text>

        <line x1={254} x2={GRID_X + 150} y1={loopY - 8} y2={loopY - 8} stroke="var(--fg)" strokeWidth={1.5} markerEnd="url(#arrow)" />
        <text x={(254 + GRID_X + 150) / 2} y={loopY - 14} textAnchor="middle" fontSize={10.5} fill="var(--muted)" style={{ fontStretch: "78%" }}>
          declares 14 of 16 guests
        </text>
        <line x1={GRID_X + 150} x2={254} y1={loopY + 8} y2={loopY + 8} stroke="var(--fg)" strokeWidth={1.5} markerEnd="url(#arrow)" />
        <text x={(254 + GRID_X + 150) / 2} y={loopY + 24} textAnchor="middle" fontSize={10.5} fill="var(--muted)" style={{ fontStretch: "78%" }}>
          nightly: commit whatever changed
        </text>

        <rect x={GRID_X + 154} y={loopY - 20} width={250} height={40} fill="none" stroke="var(--fg)" strokeWidth={1.5} rx={3} />
        <text x={GRID_X + 166} y={loopY - 3} fontSize={12} fill="var(--fg)" fontWeight={600}>
          Nightly CI on the lab&apos;s own runner
        </text>
        <text x={GRID_X + 166} y={loopY + 11} fontSize={10.5} fill="var(--muted)" style={{ fontStretch: "78%" }}>
          reports plan drift against the live host
        </text>
        <line x1={GRID_X + 280} x2={GRID_X + 280} y1={loopY - 22} y2={GRID_Y + gridH + 34} stroke="var(--fg)" strokeWidth={1.5} strokeDasharray="3 3" markerEnd="url(#arrow)" />

        <rect x={GRID_X + 440} y={loopY - 20} width={gridW - 440} height={40} fill="none" stroke="var(--fg)" strokeOpacity={0.5} rx={3} />
        <text x={GRID_X + 452} y={loopY - 3} fontSize={12} fill="var(--fg)" fontWeight={600}>
          Health check, every 5 minutes
        </text>
        <text x={GRID_X + 452} y={loopY + 11} fontSize={10.5} fill="var(--muted)" style={{ fontStretch: "78%" }}>
          pages once per new fault that persists
        </text>
      </svg>
  );
}

// Portrait: 360 units wide, drawn at up to 480 px, so type stays at 10.5 to 14 px.
const NW = 360;
const N = { cols: 3, cw: 108, ch: 38, gx: 8, gy: 7, pad: 10 };
const GW_H = 64;
const HOST_Y = GW_H + 30;
const HOST_H = 20 + 5 * N.ch + 4 * N.gy + 26;
const CI_Y = HOST_Y + HOST_H + 38;
const GIT_Y = CI_Y + 40 + 64;
const HC_Y = GIT_Y + 40 + 18;
const NH = HC_Y + 40 + 4;

function Narrow({ guests, title }: { guests: typeof services; title: string }) {
  const arrow = { stroke: "var(--fg)", strokeWidth: 1.5, markerEnd: "url(#arrow-n)" } as const;
  const cx = NW / 2;
  return (
    <svg viewBox={`0 0 ${NW} ${NH}`} className="lg:hidden w-full max-w-[30rem] h-auto" role="img" aria-labelledby="lab-title-n">
      <title id="lab-title-n">{title}</title>
      <defs>
        <marker id="arrow-n" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 10 5 0 10z" fill="var(--fg)" />
        </marker>
      </defs>

      {/* Way in */}
      <text x={1} y={GW_H / 2 - 1} fontSize={13} fill="var(--fg)" fontWeight={600}>You</text>
      <text x={1} y={GW_H / 2 + 14} fontSize={11} fill="var(--muted)" {...MUTED}>web or VPN</text>
      <line x1={66} x2={88} y1={GW_H / 2} y2={GW_H / 2} {...arrow} />
      <rect x={92} y={0} width={NW - 93} height={GW_H} fill="var(--fg)" rx={3} />
      <text x={102} y={21} fontSize={13} fill="var(--bg)" fontWeight={700}>Gateway</text>
      {GATEWAY_PARTS.map((t, i) => (
        <text key={t} x={102 + (i % 2) * 124} y={39 + Math.floor(i / 2) * 15} fontSize={11} fill="var(--bg)" fillOpacity={0.85} {...MUTED}>{t}</text>
      ))}
      <line x1={cx + 46} x2={cx + 46} y1={GW_H + 1} y2={HOST_Y - 4} {...arrow} />

      {/* The host */}
      <rect x={1} y={HOST_Y} width={NW - 2} height={HOST_H} fill="none" stroke="var(--fg)" strokeOpacity={0.3} strokeDasharray="4 4" rx={6} />
      <text x={NW - 10} y={HOST_Y + HOST_H - 9} textAnchor="end" fontSize={11} fill="var(--muted)" {...MUTED}>one Proxmox host</text>
      {guests.map((s, i) => {
        const x = N.pad + (i % N.cols) * (N.cw + N.gx);
        const y = HOST_Y + 14 + Math.floor(i / N.cols) * (N.ch + N.gy);
        return (
          <g key={s.ct}>
            <rect x={x} y={y} width={N.cw} height={N.ch} fill="var(--bg)" stroke="var(--fg)" rx={3} />
            <text x={x + 7} y={y + 16} fontSize={11.5} fill="var(--fg)" fontWeight={600}>{s.name}</text>
            <text x={x + 7} y={y + 30} fontSize={9.5} fill="var(--muted)" fontFamily="var(--font-mono)">{s.ct}</text>
          </g>
        );
      })}

      {/* The loop: CI checks the host, Git declares to CI and CI commits back */}
      <rect x={1} y={CI_Y} width={NW - 2} height={40} fill="none" stroke="var(--fg)" strokeWidth={1.5} rx={3} />
      <text x={12} y={CI_Y + 17} fontSize={12} fill="var(--fg)" fontWeight={600}>Nightly CI on the lab&apos;s own runner</text>
      <text x={12} y={CI_Y + 31} fontSize={11} fill="var(--muted)" {...MUTED}>reports plan drift against the live host</text>
      <line x1={cx} x2={cx} y1={CI_Y - 1} y2={HOST_Y + HOST_H + 4} stroke="var(--fg)" strokeWidth={1.5} strokeDasharray="3 3" markerEnd="url(#arrow-n)" />

      <line x1={26} x2={26} y1={GIT_Y - 2} y2={CI_Y + 42} {...arrow} />
      <text x={38} y={CI_Y + 40 + 36} fontSize={10.5} fill="var(--muted)" {...MUTED}>declares 14 of 16 guests</text>
      <line x1={196} x2={196} y1={CI_Y + 42} y2={GIT_Y - 2} {...arrow} />
      <text x={208} y={CI_Y + 40 + 36} fontSize={10.5} fill="var(--muted)" {...MUTED}>nightly: commit what changed</text>

      <rect x={1} y={GIT_Y} width={NW - 2} height={40} fill="none" stroke="var(--fg)" strokeWidth={1.5} rx={3} />
      <text x={12} y={GIT_Y + 17} fontSize={12} fill="var(--fg)" fontWeight={600}>Git repository</text>
      <text x={12} y={GIT_Y + 31} fontSize={11} fill="var(--muted)" {...MUTED}>OpenTofu, configs, SOPS secrets</text>

      <rect x={1} y={HC_Y} width={NW - 2} height={40} fill="none" stroke="var(--fg)" strokeOpacity={0.5} rx={3} />
      <text x={12} y={HC_Y + 17} fontSize={12} fill="var(--fg)" fontWeight={600}>Health check, every 5 minutes</text>
      <text x={12} y={HC_Y + 31} fontSize={11} fill="var(--muted)" {...MUTED}>pages once per new fault that persists</text>
    </svg>
  );
}

export default function LabTopology() {
  const gateway = services.find((s) => s.name === "Gateway");
  const guests = services.filter((s) => s !== gateway);
  const title = `Lab topology. Traffic enters through the gateway (${gateway?.description}) and reaches ${guests.length} other guests on one Proxmox host. A nightly pipeline diffs the host against Git and commits what changed.`;
  return (
    <figure className="mb-10">
      <Wide guests={guests} title={title} />
      <Narrow guests={guests} title={title} />
    </figure>
  );
}
