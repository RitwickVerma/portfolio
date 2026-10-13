// Terminal command output — pure strings built from lib/data so the terminal
// can never drift from the rest of the site. No xterm import: unit-testable.

import { projects, experiences, services, skills, socialLinks, SITE_URL } from "./data";

export const ANSI = {
  reset: "\x1b[0m",
  green: "\x1b[92m",
  yellow: "\x1b[93m",
  red: "\x1b[91m",
  dim: "\x1b[90m",
};

export const PROMPT = `${ANSI.green}ritwick@portfolio${ANSI.reset}:${ANSI.yellow}~${ANSI.reset}$ `;

// figlet "ANSI Shadow", 49 columns. Every line is the same width — the test
// checks, because one dropped space skews every letter below it.
const ASCII_ART = [
  "██████╗ ██╗████████╗██╗    ██╗██╗ ██████╗██╗  ██╗",
  "██╔══██╗██║╚══██╔══╝██║    ██║██║██╔════╝██║ ██╔╝",
  "██████╔╝██║   ██║   ██║ █╗ ██║██║██║     █████╔╝ ",
  "██╔══██╗██║   ██║   ██║███╗██║██║██║     ██╔═██╗ ",
  "██║  ██║██║   ██║   ╚███╔███╔╝██║╚██████╗██║  ██╗",
  "╚═╝  ╚═╝╚═╝   ╚═╝    ╚══╝╚══╝ ╚═╝ ╚═════╝╚═╝  ╚═╝",
];
export const BANNER_COLS = ASCII_ART[0].length;
const BANNER = ASCII_ART.join("\r\n");

/** Terminals narrower than the banner (phones) get a plain heading instead of wrapped block art. */
export function welcome(cols: number): string {
  const head =
    cols > BANNER_COLS ? `${ANSI.green}${BANNER}${ANSI.reset}` : `${ANSI.green}RITWICK VERMA${ANSI.reset}`;
  return `${head}\r\nType 'help' for available commands.\r\n`;
}

export const COMMAND_NAMES = [
  "help",
  "whoami",
  "projects",
  "homelab",
  "skills",
  "experience",
  "resume",
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

export function commandOutputs(): Record<string, string> {
  const guests = services.length;
  const featured = projects.filter((p) => p.featured).length;
  const ebay = experiences[0];

  return {
    help:
      `${g("Available commands:")}\r\n` +
      "  help        Show this help message\r\n" +
      "  whoami      About me\r\n" +
      "  projects    Projects and what they prove\r\n" +
      "  homelab     Every guest on the Proxmox host\r\n" +
      "  skills      Skills by category\r\n" +
      "  experience  Career timeline\r\n" +
      "  resume      Printable resume page\r\n" +
      "  contact     Get in touch\r\n" +
      "  stack       How this site is built\r\n" +
      "  neofetch    Site info\r\n" +
      "  clear       Clear the terminal\r\n",

    whoami:
      `${g("Ritwick Verma")} — backend engineer at eBay (${ebay.location?.split(",")[0]}).\r\n` +
      "MCS from UC Irvine. Writes Android apps, a trading bot and a C++ game\r\n" +
      `engine, and runs a ${guests}-guest homelab on Proxmox.\r\n`,

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
      .map((e) => `${g(e.period.padEnd(18))}${e.role} @ ${e.company}\r\n`)
      .join(""),

    resume: `${g("Resume:")} ${SITE_URL}/resume  ${ANSI.dim}(Save as PDF from the page)${ANSI.reset}\r\n`,

    contact:
      `${g("Email:")}    ${socialLinks.email}\r\n` +
      `${g("GitHub:")}   ${socialLinks.github}\r\n` +
      `${g("GitLab:")}   ${socialLinks.gitlab}\r\n` +
      `${g("LinkedIn:")} ${socialLinks.linkedin}\r\n`,

    stack:
      `${g("How this site is built")}\r\n` +
      `${y("Build")}    Next.js 16 static export: plain HTML/JS/CSS, no server runtime\r\n` +
      `${y("Host")}     nginx on CT114, a container on the Proxmox host listed above\r\n` +
      `${y("Hero")}     three.js + React Three Fiber, loaded after idle behind an SVG poster\r\n` +
      "         WebGPU + a TSL compute airflow layer is opt-in: ?renderer=webgpu\r\n" +
      `${y("Terminal")} xterm.js, fetched only when this section nears the viewport\r\n` +
      `${y("Motion")}   framer-motion, one token file; reduced-motion gets a static site\r\n` +
      `${y("Privacy")}  no third-party requests, no analytics, no cookies\r\n` +
      `${y("CI")}       lint + typecheck + test on every push; master rebuilds on the host\r\n`,

    neofetch:
      `       ${g("▄▄▄▄▄▄▄")}        ${y("Host:")}     ritwickverma.dev\r\n` +
      `    ${g("▄███████████▄")}     ${y("Role:")}     Software Engineer @ eBay\r\n` +
      `   ${g("███████████████")}    ${y("Homelab:")}  ${guests} guests on Proxmox\r\n` +
      `  ${g("█████████████████")}   ${y("Projects:")} ${projects.length} (${featured} featured)\r\n` +
      `  ${g("█████████████████")}   ${y("Site:")}     Next.js static export + nginx\r\n` +
      `   ${g("███████████████")}    ${y("Email:")}    ${socialLinks.email}\r\n` +
      `    ${g("▀███████████▀")}\r\n` +
      `       ${g("▀▀▀▀▀▀▀")}\r\n`,
  };
}
