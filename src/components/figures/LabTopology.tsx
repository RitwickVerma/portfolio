import { services } from "@/lib/data";

// The lab as a drawing: one way in, sixteen guests, and the loop that keeps
// Git and the host in agreement. Every box is read from lib/data; nothing
// that could locate a machine (address, port, hostname) is drawn.

const W = 1000;
const H = 262;
const COLS = 5;
const CELL = { w: 128, h: 40, gx: 10, gy: 10 };
const GRID_X = 300;
const GRID_Y = 24;

export default function LabTopology() {
  const gateway = services.find((s) => s.name === "Gateway");
  const guests = services.filter((s) => s !== gateway);
  const gridW = COLS * CELL.w + (COLS - 1) * CELL.gx;
  const rows = Math.ceil(guests.length / COLS);
  const gridH = rows * CELL.h + (rows - 1) * CELL.gy;
  const gw = { x: 118, y: GRID_Y + gridH / 2 - 44, w: 132, h: 88 };
  const loopY = GRID_Y + gridH + 62;

  return (
    <figure className="mb-10 overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[720px] h-auto" role="img" aria-labelledby="lab-title">
        <title id="lab-title">
          {`Lab topology. Traffic enters through the gateway (${gateway?.description}) and reaches ${guests.length} other guests on one Proxmox host. A nightly pipeline diffs the host against Git and commits what changed.`}
        </title>
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
        {["Traefik", "Authelia SSO", "Headscale VPN", "CrowdSec"].map((t, i) => (
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
    </figure>
  );
}
