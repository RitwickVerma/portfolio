"use client";

import { useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";

/* ------------------------------------------------------------------ */
/* Terminal constants                                                  */
/* ------------------------------------------------------------------ */

const ANSI = {
  reset: "\x1b[0m",
  green: "\x1b[92m",
  yellow: "\x1b[93m",
  red: "\x1b[91m",
  dim: "\x1b[90m",
};

const PROMPT = `${ANSI.green}ritwick@portfolio${ANSI.reset}:${ANSI.yellow}~${ANSI.reset}$ `;

const ASCII_ART = [
  "██████╗ ██╗ ███████╗ ██╗    ██╗ ██╗  ██████╗ ██╗  ██╗",
  "██╔══██╗ ██║ ╚══██╔═╝ ██║    ██║ ██║ ██╔════╝ ██║ ██╔╝",
  "██████╔╝ ██║    ██║ ██║ █╗ ██║ ██║ ██║     █████╔╝",
  "██╔══██╗ ██║    ██║ ██║███╗██║ ██║ ██║     ██╔═██╗",
  "██║  ██║ ██║    ██║ ╚███╔███╔╝ ██║ ╚██████╗ ██║  ██╗",
  "╚═╝  ╚═╝ ╚═╝    ╚═╝  ╚══╝╚══╝ ╚═╝  ╚═════╝ ╚═╝  ╚═╝",
].join("\r\n");

const WELCOME = `${ANSI.green}${ASCII_ART}${ANSI.reset}\r\nWelcome to my terminal. Type 'help' for available commands.\r\n`;

const COMMAND_NAMES = [
  "help",
  "whoami",
  "projects",
  "homelab",
  "skills",
  "experience",
  "resume",
  "contact",
  "neofetch",
  "matrix",
  "clear",
];

const COMMAND_OUTPUTS: Record<string, string> = {
  help:
    `${ANSI.green}Available commands:${ANSI.reset}\r\n` +
    "  help        Show this help message\r\n" +
    "  whoami      About me\r\n" +
    "  projects    Featured projects\r\n" +
    "  homelab     Homelab services\r\n" +
    "  skills      Skills by category\r\n" +
    "  experience  Career timeline\r\n" +
    "  resume      Resume download link\r\n" +
    "  contact     Get in touch\r\n" +
    "  neofetch    System info\r\n" +
    "  matrix      Easter egg — don't press it\r\n" +
    "  clear       Clear the terminal\r\n",

  whoami:
    `${ANSI.green}Ritwick Verma${ANSI.reset} — software engineer at eBay (San Francisco).\r\n` +
    "MCS from UC Irvine. Built ShutUp (26k+ downloads) and a quant trading bot,\r\n" +
    `and runs a 14-service homelab on Proxmox + NixOS + Traefik.\r\n`,

  projects:
    `${ANSI.green}${"ShutUp".padEnd(24)}${ANSI.reset}Android gesture-based telephony — 26k+ downloads\r\n` +
    `${ANSI.green}${"Plutus Bot".padEnd(24)}${ANSI.reset}Quant trading bot — Python, 144 tests\r\n` +
    `${ANSI.green}${"RPG Engine".padEnd(24)}${ANSI.reset}Custom game engine — C++ / SDL2\r\n` +
    `${ANSI.green}${"Homelab".padEnd(24)}${ANSI.reset}14 services — NixOS / Proxmox / Traefik\r\n` +
    `${ANSI.green}${"Monster Sudoku Solver".padEnd(24)}${ANSI.reset}AI constraint-satisfaction solver — UC Irvine\r\n` +
    `${ANSI.green}${"Solar EV DAQ".padEnd(24)}${ANSI.reset}Arduino + RPi + Firebase data acquisition\r\n`,

  homelab:
    `${ANSI.yellow}${"Service".padEnd(18)}${"Status".padEnd(12)}Purpose${ANSI.reset}\r\n` +
    `${ANSI.green}${"VM110 Gateway".padEnd(18)}${ANSI.reset}${ANSI.green}${"running".padEnd(12)}${ANSI.reset}NixOS gateway — Traefik + Authelia\r\n` +
    `${ANSI.green}${"CT101 Hermes".padEnd(18)}${ANSI.reset}${ANSI.green}${"running".padEnd(12)}${ANSI.reset}AI agent host\r\n` +
    `${ANSI.green}${"CT102 DNS".padEnd(18)}${ANSI.reset}${ANSI.green}${"running".padEnd(12)}${ANSI.reset}AdGuard / DNS\r\n` +
    `${ANSI.green}${"CT104 Vaultwarden".padEnd(18)}${ANSI.reset}${ANSI.green}${"running".padEnd(12)}${ANSI.reset}Password manager\r\n` +
    `${ANSI.green}${"CT106 Immich".padEnd(18)}${ANSI.reset}${ANSI.green}${"running".padEnd(12)}${ANSI.reset}Photo library\r\n` +
    `${ANSI.green}${"CT107 Paperless".padEnd(18)}${ANSI.reset}${ANSI.green}${"running".padEnd(12)}${ANSI.reset}Document management\r\n` +
    `${ANSI.green}${"CT111 Jellyfin".padEnd(18)}${ANSI.reset}${ANSI.green}${"running".padEnd(12)}${ANSI.reset}Media server\r\n` +
    `${ANSI.green}${"CT113 Syncthing".padEnd(18)}${ANSI.reset}${ANSI.green}${"running".padEnd(12)}${ANSI.reset}File sync\r\n`,

  skills:
    `${ANSI.yellow}Languages${ANSI.reset}  C++  C  Python  Java  TypeScript  JavaScript  Kotlin\r\n` +
    `${ANSI.yellow}Domains${ANSI.reset}     Backend  Android  Game Dev  AI/ML  DevOps  Embedded\r\n` +
    `${ANSI.yellow}Tools${ANSI.reset}       Docker  Proxmox  NixOS  Traefik  Git  Linux\r\n`,

  experience:
    `${ANSI.green}${"2021 — Present".padEnd(14)}${ANSI.reset}Software Engineer @ eBay\r\n` +
    `${ANSI.green}${"2020".padEnd(14)}${ANSI.reset}Software Dev Intern @ Shoelace Wireless\r\n` +
    `${ANSI.green}${"2019 — 2020".padEnd(14)}${ANSI.reset}MCS Computer Science @ UC Irvine\r\n` +
    `${ANSI.green}${"2018".padEnd(14)}${ANSI.reset}Software Dev Intern @ Advanced Structures India\r\n` +
    `${ANSI.green}${"2017".padEnd(14)}${ANSI.reset}Software Dev Intern @ BHEL\r\n`,

  resume:
    `${ANSI.green}Resume:${ANSI.reset} https://raw.githubusercontent.com/RitwickVerma/Resume/master/resume_ATS-letter.pdf\r\n`,

  contact:
    `${ANSI.green}Email:${ANSI.reset}    verma1997@gmail.com\r\n` +
    `${ANSI.green}GitHub:${ANSI.reset}   https://github.com/RitwickVerma\r\n` +
    `${ANSI.green}LinkedIn:${ANSI.reset} https://www.linkedin.com/in/ritwickverma\r\n`,

  neofetch:
    `       ${ANSI.green}▄▄▄▄▄▄▄${ANSI.reset}        ${ANSI.yellow}OS:${ANSI.reset}      ritwickverma.dev\r\n` +
    `    ${ANSI.green}▄███████████▄${ANSI.reset}     ${ANSI.yellow}Shell:${ANSI.reset}   portfolio v1.0\r\n` +
    `   ${ANSI.green}███████████████${ANSI.reset}    ${ANSI.yellow}Uptime:${ANSI.reset}  since 2021\r\n` +
    `  ${ANSI.green}█████████████████${ANSI.reset}   ${ANSI.yellow}Projects:${ANSI.reset} 6 featured\r\n` +
    `  ${ANSI.green}█████████████████${ANSI.reset}   ${ANSI.yellow}Services:${ANSI.reset} 14 (homelab)\r\n` +
    `  ${ANSI.green}█████████████████${ANSI.reset}   ${ANSI.yellow}Editor:${ANSI.reset}   vim\r\n` +
    `   ${ANSI.green}███████████████${ANSI.reset}    ${ANSI.yellow}Email:${ANSI.reset}    verma1997@gmail.com\r\n` +
    `    ${ANSI.green}▀███████████▀${ANSI.reset}     ${ANSI.yellow}Colors:${ANSI.reset}  ${ANSI.green}████${ANSI.reset}${ANSI.yellow}████${ANSI.reset}${ANSI.red}████${ANSI.reset}\r\n` +
    `       ${ANSI.green}▀▀▀▀▀▀▀${ANSI.reset}        ${ANSI.yellow}WM:${ANSI.reset}       none (ssh)\r\n`,
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function TerminalSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);

  const currentCommandRef = useRef("");
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(0);
  const matrixActiveRef = useRef(false);
  const matrixTimerRef = useRef<number | null>(null);
  const matrixTimeoutRef = useRef<number | null>(null);

  /** Execute a full command and print its output (without echoing). */
  const handleCommand = useCallback((cmd: string) => {
    const term = terminalRef.current;
    if (!term) return;

    const output = COMMAND_OUTPUTS[cmd];
    if (output) {
      term.write(output);
    } else {
      term.write(
        `${ANSI.red}command not found:${ANSI.reset} ${cmd}. Type ${ANSI.green}help${ANSI.reset} for available commands.\r\n`,
      );
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Safety net for StrictMode double-mount: drop any leftover DOM.
    container.innerHTML = "";

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: "bar",
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Geist Mono', monospace",
      theme: {
        background: "#0a0a0f",
        foreground: "#e4e4e7",
        cursor: "#64ffda",
        selectionBackground: "rgba(100,255,218,0.15)",
        green: "#64ffda",
        brightGreen: "#64ffda",
        yellow: "#fbbf24",
        red: "#ef4444",
        cyan: "#64ffda",
        brightCyan: "#64ffda",
      },
      allowProposedApi: true,
      disableStdin: false,
      cols: 80,
      rows: 24,
    });
    terminalRef.current = term;

    term.open(container);

    // FitAddon is loaded after the terminal is open in the DOM.
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    const fit = () => {
      if (container.clientWidth === 0 || container.clientHeight === 0) return;
      try {
        fitAddon.fit();
      } catch {
        // container not measurable yet — next resize/rAF will retry
      }
    };
    fit();
    const raf = requestAnimationFrame(fit);

    const onResize = () => fit();
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(() => requestAnimationFrame(fit));
    ro.observe(container);

    /* ---------------- helpers ---------------- */

    const redrawInput = (cmd: string) => {
      currentCommandRef.current = cmd;
      const wraps = Math.floor((PROMPT.length + cmd.length) / term.cols);
      if (wraps > 0) term.write(`\x1b[${wraps}A`);
      term.write("\r\x1b[J");
      term.write(PROMPT + cmd);
    };

    /* ---------------- matrix easter egg ---------------- */

    const runMatrix = () => {
      if (matrixActiveRef.current) return;
      matrixActiveRef.current = true;
      term.clear();

      const cols = term.cols;
      const rows = term.rows;
      const glyphs =
        "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789$#@%&*";
      const speeds = Array.from({ length: cols }, () => Math.floor(Math.random() * 4) + 1);
      const drops = Array.from({ length: cols }, () => Math.floor(Math.random() * rows));

      matrixTimerRef.current = window.setInterval(() => {
        for (let c = 0; c < cols; c++) {
          if (Math.floor(Math.random() * speeds[c]) !== 0) continue;
          const row = drops[c];
          const ch = glyphs[Math.floor(Math.random() * glyphs.length)];
          const color = Math.random() > 0.92 ? "\x1b[97m" : ANSI.green;
          term.write(`\x1b[${row + 1};${c + 1}H${color}${ch}${ANSI.reset}`);
          const tail = (row - 5 + rows) % rows;
          term.write(`\x1b[${tail + 1};${c + 1}H `);
          drops[c] = (row + 1) % rows;
        }
      }, 45);

      matrixTimeoutRef.current = window.setTimeout(() => {
        if (matrixTimerRef.current !== null) {
          window.clearInterval(matrixTimerRef.current);
          matrixTimerRef.current = null;
        }
        matrixActiveRef.current = false;
        term.clear();
        term.write(WELCOME);
        term.write(PROMPT);
      }, 3000);
    };

    /* ---------------- tab completion ---------------- */

    const handleTab = () => {
      const input = currentCommandRef.current;
      if (input.length === 0) return;
      const matches = COMMAND_NAMES.filter((c) => c.startsWith(input));
      if (matches.length === 1) {
        const completion = matches[0];
        term.write(completion.slice(input.length));
        currentCommandRef.current = completion;
      } else if (matches.length > 1) {
        term.write(`\r\n${ANSI.yellow}${matches.join("  ")}${ANSI.reset}\r\n`);
        term.write(PROMPT + currentCommandRef.current);
      }
    };

    term.attachCustomKeyEventHandler((event) => {
      if (event.type === "keydown" && event.key === "Tab") {
        handleTab();
        return false;
      }
      return true;
    });

    /* ---------------- input handling ---------------- */

    term.onData((data) => {
      if (matrixActiveRef.current) return;

      if (data === "\r") {
        // Enter
        term.write("\r\n");
        const cmd = currentCommandRef.current.trim();
        currentCommandRef.current = "";
        if (cmd) {
          historyRef.current.push(cmd);
          historyIndexRef.current = historyRef.current.length;
          if (cmd === "clear") {
            term.clear();
          } else if (cmd === "matrix") {
            runMatrix();
            return; // matrix restores welcome + prompt itself
          } else {
            handleCommand(cmd);
          }
        }
        term.write(PROMPT);
      } else if (data === "\x7f") {
        // Backspace
        if (currentCommandRef.current.length > 0) {
          redrawInput(currentCommandRef.current.slice(0, -1));
        }
      } else if (data === "\x1b[A") {
        // ArrowUp — history back
        if (historyIndexRef.current > 0) {
          historyIndexRef.current -= 1;
          redrawInput(historyRef.current[historyIndexRef.current] ?? "");
        }
      } else if (data === "\x1b[B") {
        // ArrowDown — history forward
        if (historyIndexRef.current < historyRef.current.length - 1) {
          historyIndexRef.current += 1;
          redrawInput(historyRef.current[historyIndexRef.current] ?? "");
        } else {
          historyIndexRef.current = historyRef.current.length;
          redrawInput("");
        }
      } else if (data === "\x03") {
        // Ctrl+C
        term.write("^C\r\n");
        currentCommandRef.current = "";
        term.write(PROMPT);
      } else if (data === "\x0c") {
        // Ctrl+L
        term.clear();
        term.write(PROMPT + currentCommandRef.current);
      } else if (data.length > 1) {
        // Paste
        const cleaned = data.replace(/[\r\n\x1b]/g, "");
        if (cleaned) {
          currentCommandRef.current += cleaned;
          term.write(cleaned);
        }
      } else if (data >= " ") {
        // Printable character
        currentCommandRef.current += data;
        term.write(data);
      }
    });

    // Welcome message + initial prompt
    term.write(WELCOME);
    term.write(PROMPT);
    term.focus();

    /* ---------------- cleanup ---------------- */

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
      if (matrixTimerRef.current !== null) window.clearInterval(matrixTimerRef.current);
      if (matrixTimeoutRef.current !== null) window.clearTimeout(matrixTimeoutRef.current);
      terminalRef.current = null;
      term.dispose();
    };
  }, [handleCommand]);

  return (
    <motion.section
      id="terminal"
      className="max-w-3xl mx-auto px-6 py-24 sm:py-32"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <h2 className="font-mono text-accent text-sm mb-6 tracking-widest uppercase">
        Terminal
      </h2>

      <div
        className="rounded-lg overflow-hidden glass glow-border cursor-text"
        onClick={() => terminalRef.current?.focus()}
      >
        {/* Window header bar */}
        <div className="relative flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.03]">
          <span className="w-3 h-3 rounded-full bg-[#ff5f57]" aria-hidden="true" />
          <span className="w-3 h-3 rounded-full bg-[#febc2e]" aria-hidden="true" />
          <span className="w-3 h-3 rounded-full bg-[#28c840]" aria-hidden="true" />
          <span className="absolute left-1/2 -translate-x-1/2 text-xs font-mono text-muted tracking-widest select-none">
            terminal
          </span>
        </div>

        {/* xterm mount point */}
        <div ref={containerRef} className="h-[420px] w-full" />
      </div>
    </motion.section>
  );
}
