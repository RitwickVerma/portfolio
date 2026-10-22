// Terminal command output — pure strings built from lib/data so the terminal
// can never drift from the rest of the site. No xterm import: unit-testable.

import { projects, experiences, services, skills, socialLinks, SITE_URL } from "./data";
import { notes, noteUrl, formatNoteDate } from "./notes";
import { ageMs, formatAge, formatUptime, runningCount, type Status, type Freshness } from "./status";

export const ANSI = {
  reset: "\x1b[0m",
  green: "\x1b[92m",
  yellow: "\x1b[93m",
  red: "\x1b[91m",
  dim: "\x1b[90m",
};

export const PROMPT = `${ANSI.green}ritwick@portfolio${ANSI.reset}:${ANSI.yellow}~${ANSI.reset}$ `;

export function welcome(): string {
  return `${ANSI.green}Ritwick Verma${ANSI.reset}  ${ANSI.dim}portfolio terminal${ANSI.reset}\r\nType 'help' for available commands.\r\n`;
}

export const COMMAND_NAMES = [
  "help",
  "whoami",
  "projects",
  "homelab",
  "skills",
  "experience",
  "resume",
  "notes",
  "status",
  "contact",
  "stack",
  "neofetch",
  "clear",
];

const g = (s: string) => `${ANSI.green}${s}${ANSI.reset}`;
const y = (s: string) => `${ANSI.yellow}${s}${ANSI.reset}`;

/** Columns a hand-written command may use: xterm's default desktop width. */
export const TERMINAL_COLS = 80;

/**
 * `Label      item  item  item`, wrapped between items so no word ever breaks
 * mid-way on an 80-column terminal. Continuation lines indent under the first item.
 */
export function wrapList(label: string, items: readonly string[], cols = TERMINAL_COLS): string {
  const indent = 11;
  const lines: string[] = [];
  let line = "";
  for (const item of items) {
    const next = line ? `${line}  ${item}` : item;
    if (line && indent + next.length > cols) {
      lines.push(line);
      line = item;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  if (!lines.length) return "";
  return lines
    .map((l, i) => (i === 0 ? y(label.padEnd(indent)) + l : " ".repeat(indent) + l))
    .join("\r\n") + "\r\n";
}

/** `status`: one line per guest from /status.json, or why there is none. Pure; the component passes the snapshot in. */
export function statusOutput(status: Status | null, phase: Freshness | "none" | "loading" | "idle", now = Date.now()): string {
  if (!status) {
    if (phase === "loading") return `${ANSI.dim}Fetching /status.json…${ANSI.reset}\r\n`;
    return `${ANSI.dim}No live status feed on this host.${ANSI.reset}\r\n`;
  }
  const head =
    `${y("Host")}  ${phase === "live" ? g("live") : `${ANSI.red}stale${ANSI.reset}`}` +
    ` · updated ${formatAge(ageMs(status, now))} · ${runningCount(status)}/${status.guests.length} running` +
    (status.host.load1 !== undefined ? ` · load ${status.host.load1.toFixed(2)}` : "") +
    (status.host.uptimeSeconds !== undefined ? ` · up ${formatUptime(status.host.uptimeSeconds)}` : "") +
    "\r\n";
  const rows = services
    .map((s) => {
      const gst = status.guests.find((x) => x.id === s.ct);
      const state = !gst ? `${ANSI.dim}unknown${ANSI.reset}` : gst.state === "running" ? g("running") : `${ANSI.red}stopped${ANSI.reset}`;
      const up = gst?.state === "running" && gst.uptimeSeconds !== undefined ? `  up ${formatUptime(gst.uptimeSeconds)}` : "";
      return `${s.ct.padEnd(8)}${s.name.padEnd(16)}${state}${up}\r\n`;
    })
    .join("");
  return head + rows;
}

export function commandOutputs(): Record<string, string> {
  const guests = services.length;
  const featured = projects.filter((p) => p.featured).length;
  const ebay = experiences[0];
  // Period column sized to the longest period, so the role never runs into it.
  const periodCol = Math.max(...experiences.map((e) => e.period.length)) + 2;

  return {
    help:
      `${g("Available commands:")}\r\n` +
      "  help        Show this help message\r\n" +
      "  whoami      About me\r\n" +
      "  projects    Projects, one headline number each\r\n" +
      "  homelab     Every guest on the Proxmox host\r\n" +
      "  skills      Skills by category\r\n" +
      "  experience  Career timeline\r\n" +
      "  resume      Printable resume page\r\n" +
      "  notes       Engineering notes\r\n" +
      "  status      Live guest state from the host\r\n" +
      "  contact     Get in touch\r\n" +
      "  stack       How this site is built\r\n" +
      "  neofetch    Site info\r\n" +
      "  clear       Clear the terminal\r\n",

    whoami:
      `${g("Ritwick Verma")}, backend engineer (${ebay.location?.split(",")[0]}). Five years on\r\n` +
      "Cassini, eBay's C++ search engine. MCS from UC Irvine. Writes Android\r\n" +
      `apps, keyboard firmware and a C++ game engine; runs a ${guests}-guest homelab.\r\n`,

    projects: projects
      .map((p) => `${g(p.title.padEnd(24))}${p.metric.value} ${p.metric.label}\r\n`)
      .join(""),

    homelab:
      `${y("ID".padEnd(8) + "Guest".padEnd(16) + "Role")}\r\n` +
      services
        .map((s) => `${g(s.ct.padEnd(8))}${s.name.padEnd(16)}${s.description}\r\n`)
        .join("") +
      `${ANSI.dim}${guests} guests. Static inventory, not live status.${ANSI.reset}\r\n`,

    skills:
      wrapList("Languages", skills.languages) +
      wrapList("Domains", skills.domains) +
      wrapList("Tools", skills.tools),

    experience: experiences
      .map((e) => `${g(e.period.padEnd(periodCol))}${e.role} @ ${e.company}\r\n`)
      .join(""),

    resume: `${g("Resume:")} ${SITE_URL}/resume  ${ANSI.dim}(Save as PDF from the page)${ANSI.reset}\r\n`,

    notes:
      notes
        .map((n) => `${g(formatNoteDate(n.date))}  ${n.title}\r\n            ${ANSI.dim}${SITE_URL}${noteUrl(n)}${ANSI.reset}\r\n`)
        .join("") || `${ANSI.dim}No notes yet.${ANSI.reset}\r\n`,

    contact:
      `${g("Email:")}    ${socialLinks.email}\r\n` +
      `${g("GitHub:")}   ${socialLinks.github}\r\n` +
      `${g("GitLab:")}   ${socialLinks.gitlab}\r\n` +
      `${g("LinkedIn:")} ${socialLinks.linkedin}\r\n`,

    stack:
      `${g("How this site is built")}\r\n` +
      `${y("Build")}    Next.js 16 static export: plain HTML/JS/CSS, no server runtime\r\n` +
      `${y("Host")}     Cloudflare Pages, deployed by GitLab CI on green master\r\n` +
      `${y("Hero")}     three.js + React Three Fiber, loaded after idle behind an SVG poster\r\n` +
      `${y("Terminal")} xterm.js, fetched only when this section nears the viewport\r\n` +
      `${y("Motion")}   framer-motion, one token file; reduced-motion gets a static site\r\n` +
      `${y("Privacy")}  no cookies, no analytics of my own; Cloudflare may add its beacon\r\n` +
      `${y("CI")}       lint + typecheck + test on every push; master rebuilds on the host\r\n`,

    neofetch:
      `       ${g("▄▄▄▄▄▄▄")}        ${y("Host:")}     ritwickverma.dev\r\n` +
      `    ${g("▄███████████▄")}     ${y("Role:")}     ${ebay.role} @ eBay\r\n` +
      `   ${g("███████████████")}    ${y("Homelab:")}  ${guests} guests on Proxmox\r\n` +
      `  ${g("█████████████████")}   ${y("Projects:")} ${projects.length} (${featured} featured)\r\n` +
      `  ${g("█████████████████")}   ${y("Site:")}     Next.js static export + nginx\r\n` +
      `   ${g("███████████████")}    ${y("Email:")}    ${socialLinks.email}\r\n` +
      `    ${g("▀███████████▀")}\r\n` +
      `       ${g("▀▀▀▀▀▀▀")}\r\n`,
  };
}
