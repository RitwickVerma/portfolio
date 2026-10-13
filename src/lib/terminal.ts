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

const ASCII_ART = [
  "██████╗ ██╗ ███████╗ ██╗    ██╗ ██╗  ██████╗ ██╗  ██╗",
  "██╔══██╗ ██║ ╚══██╔═╝ ██║    ██║ ██║ ██╔════╝ ██║ ██╔╝",
  "██████╔╝ ██║    ██║ ██║ █╗ ██║ ██║ ██║     █████╔╝",
  "██╔══██╗ ██║    ██║ ██║███╗██║ ██║ ██║     ██╔═██╗",
  "██║  ██║ ██║    ██║ ╚███╔███╔╝ ██║ ╚██████╗ ██║  ██╗",
  "╚═╝  ╚═╝ ╚═╝    ╚═╝  ╚══╝╚══╝ ╚═╝  ╚═════╝ ╚═╝  ╚═╝",
].join("\r\n");

export const WELCOME = `${ANSI.green}${ASCII_ART}${ANSI.reset}\r\nType 'help' for available commands.\r\n`;

export const COMMAND_NAMES = [
  "help",
  "whoami",
  "projects",
  "homelab",
  "skills",
  "experience",
  "resume",
  "contact",
  "neofetch",
  "clear",
];

const g = (s: string) => `${ANSI.green}${s}${ANSI.reset}`;
const y = (s: string) => `${ANSI.yellow}${s}${ANSI.reset}`;

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
      `${y("Languages")}  ${skills.languages.join("  ")}\r\n` +
      `${y("Domains")}    ${skills.domains.join("  ")}\r\n` +
      `${y("Tools")}      ${skills.tools.join("  ")}\r\n`,

    experience: experiences
      .map((e) => `${g(e.period.padEnd(18))}${e.role} @ ${e.company}\r\n`)
      .join(""),

    resume: `${g("Resume:")} ${SITE_URL}/resume  ${ANSI.dim}(Save as PDF from the page)${ANSI.reset}\r\n`,

    contact:
      `${g("Email:")}    ${socialLinks.email}\r\n` +
      `${g("GitHub:")}   ${socialLinks.github}\r\n` +
      `${g("GitLab:")}   ${socialLinks.gitlab}\r\n` +
      `${g("LinkedIn:")} https://www.linkedin.com/in/ritwickverma\r\n`,

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
