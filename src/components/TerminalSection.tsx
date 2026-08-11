"use client";

import { useEffect, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";

const PROMPT = "ritwick@portfolio:~$ ";

const COMMANDS: Record<
  string,
  (write: (s: string) => void) => void
> = {
  help: (w) => {
    w("\r\n");
    w("  \x1b[1;36mAvailable commands:\x1b[0m\r\n");
    w("  whoami       About me\r\n");
    w("  projects     Featured projects\r\n");
    w("  homelab      Homelab services\r\n");
    w("  skills       Technical skills\r\n");
    w("  experience   Career timeline\r\n");
    w("  resume       Download resume PDF\r\n");
    w("  contact      Get in touch\r\n");
    w("  neofetch     System info\r\n");
    w("  matrix       Easter egg\r\n");
    w("  clear        Clear terminal\r\n");
    w("  help         This message\r\n");
  },
  whoami: (w) => {
    w("\r\n");
    w("  \x1b[1;36mRitwick Verma\x1b[0m\r\n");
    w("  Software Engineer at \x1b[1;33meBay\x1b[0m — San Francisco\r\n");
    w("  MCS from \x1b[1;33mUC Irvine\x1b[0m (2020)\r\n");
    w("  I build backend systems, Android apps, game engines,\r\n");
    w("  and a \x1b[1;32m14-service homelab\x1b[0m on Proxmox.\r\n");
  },
  projects: (w) => {
    w("\r\n");
    const ps = [
      ["ShutUp", "Android telephony app — 26k+ downloads, 4.3★"],
      ["Plutus Bot", "Quant trading bot — 144 tests, Python"],
      ["RPG Engine", "2D RPG in C++ with SDL2 — custom engine"],
      ["Homelab", "14 services — NixOS, Proxmox, Traefik"],
      ["Sudoku Solver", "AI CSP solver — UC Irvine course project"],
      ["Solar EV DAQ", "Sensor network — Arduino + RPi + Firebase"],
    ];
    for (const [name, desc] of ps) {
      w(`  \x1b[1;36m${name}\x1b[0m — ${desc}\r\n`);
    }
  },
  homelab: (w) => {
    w("\r\n");
    w("  \x1b[1;32m●\x1b[0m VM110  Gateway      NixOS • Traefik • Authelia\r\n");
    w("  \x1b[1;32m●\x1b[0m CT101  Hermes Agent  AI runtime • WebSocket\r\n");
    w("  \x1b[1;32m●\x1b[0m CT102  DNS           Technitium DNS/DHCP\r\n");
    w("  \x1b[1;32m●\x1b[0m CT104  Vaultwarden   Password manager\r\n");
    w("  \x1b[1;32m●\x1b[0m CT106  Immich        Photo backup + ML\r\n");
    w("  \x1b[1;32m●\x1b[0m CT107  Paperless     Document management\r\n");
    w("  \x1b[1;32m●\x1b[0m CT111  Jellyfin      Media streaming\r\n");
    w("  \x1b[1;32m●\x1b[0m CT113  Syncthing     P2P file sync\r\n");
  },
  skills: (w) => {
    w("\r\n");
    w("  \x1b[1;36mLanguages:\x1b[0m  C++, C, Python, Java, TypeScript, Kotlin\r\n");
    w("  \x1b[1;36mDomains:\x1b[0m    Backend, Android, Game Dev, AI/ML, DevOps\r\n");
    w(
      "  \x1b[1;36mTools:\x1b[0m     Docker, Proxmox, NixOS, Traefik, Git, Linux\r\n",
    );
  },
  experience: (w) => {
    w("\r\n");
    w("  \x1b[1;33m2021→\x1b[0m   Software Engineer @ eBay\r\n");
    w("  \x1b[1;33m2020\x1b[0m    Intern @ Shoelace Wireless\r\n");
    w("  \x1b[1;33m2019\x1b[0m    MCS @ UC Irvine\r\n");
    w("  \x1b[1;33m2018\x1b[0m    Intern @ Advanced Structures India\r\n");
    w("  \x1b[1;33m2017\x1b[0m    Intern @ BHEL\r\n");
  },
  resume: (w) => {
    w("\r\n");
    w("  \x1b[1;36mDownload:\x1b[0m https://raw.githubusercontent.com/RitwickVerma/Resume/master/resume_ATS-letter.pdf\r\n");
  },
  contact: (w) => {
    w("\r\n");
    w("  \x1b[1;36mEmail:\x1b[0m    ritwickverma@gmail.com\r\n");
    w("  \x1b[1;36mGitHub:\x1b[0m   github.com/RitwickVerma\r\n");
    w("  \x1b[1;36mLinkedIn:\x1b[0m linkedin.com/in/ritwick-verma\r\n");
  },
  neofetch: (w) => {
    w("\r\n");
    w("       ████████            \x1b[1;36mritwick@ritwickverma.dev\x1b[0m\r\n");
    w("     ████████████          \x1b[0m--------------------\x1b[0m\r\n");
    w("   ████████████████        \x1b[1;33mOS:\x1b[0m ritwickverma.dev\r\n");
    w("   ████████████████        \x1b[1;33mShell:\x1b[0m portfolio v1.0\r\n");
    w("   ████████████████        \x1b[1;33mUptime:\x1b[0m since 2021\r\n");
    w("     ████████████          \x1b[1;33mPackages:\x1b[0m 14 (homelab)\x1b[0m\r\n");
    w("       ████████            \x1b[1;33mTheme:\x1b[0m #64ffda on #0a0a0f\r\n");
    w("                           \x1b[1;33mTerminal:\x1b[0m xterm.js\r\n");
    w("\r\n");
    w("  \x1b[1;32m●\x1b[0m \x1b[1;32m●\x1b[0m \x1b[1;33m●\x1b[0m \x1b[1;31m●\x1b[0m \x1b[1;35m●\x1b[0m\r\n");
  },
  matrix: (w) => {
    const chars = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃ0123456789";
    let count = 0;
    const interval = setInterval(() => {
      let line = "";
      for (let i = 0; i < 80; i++) {
        line += chars[Math.floor(Math.random() * chars.length)];
      }
      w(`\x1b[32m${line}\x1b[0m\r\n`);
      count++;
      if (count > 40) {
        clearInterval(interval);
        w(`\r\n\x1b[0m${PROMPT}`);
      }
    }, 50);
  },
};

export default function TerminalSection() {
  const termRef = useRef<HTMLDivElement>(null);
  const terminal = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const cmdBuffer = useRef("");
  const history = useRef<string[]>([]);
  const historyIdx = useRef(-1);
  const savedLine = useRef("");

  const write = useCallback((s: string) => {
    terminal.current?.write(s);
  }, []);

  const writeLine = useCallback(
    (s: string) => {
      write(s + "\r\n");
    },
    [write],
  );

  const handleCommand = useCallback(
    (cmd: string) => {
      const trimmed = cmd.trim().toLowerCase();
      if (!trimmed) return;

      history.current.push(cmd);
      historyIdx.current = history.current.length;

      if (trimmed === "clear") {
        terminal.current?.clear();
        write(PROMPT);
        return;
      }

      const handler = COMMANDS[trimmed];
      if (handler) {
        handler(write);
      } else {
        writeLine(`\r\n  \x1b[31mCommand not found:\x1b[0m ${trimmed}`);
        writeLine("  Type 'help' for available commands.");
      }
      write(`\r\n${PROMPT}`);
    },
    [write, writeLine],
  );

  useEffect(() => {
    if (!termRef.current) return;

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

    const fitAddonInstance = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddonInstance);
    term.loadAddon(webLinksAddon);
    term.open(termRef.current);
    fitAddonInstance.fit();

    terminal.current = term;
    fitAddon.current = fitAddonInstance;

    // Welcome message
    writeLine("");
    writeLine("  ██████╗ ██╗████████╗██╗    ██╗██╗ ██████╗██╗  ██╗");
    writeLine("  ██╔══██╗██║╚══██╔══╝██║    ██║██║██╔════╝██║ ██╔╝");
    writeLine("  ██████╔╝██║   ██║   ██║ █╗ ██║██║██║     █████╔╝ ");
    writeLine("  ██╔══██╗██║   ██║   ██║███╗██║██║██║     ██╔═██╗ ");
    writeLine("  ██║  ██║██║   ██║   ╚███╔███╔╝██║╚██████╗██║  ██╗");
    writeLine("  ╚═╝  ╚═╝╚═╝   ╚═╝    ╚══╝╚══╝ ╚═╝ ╚═════╝╚═╝  ╚═╝");
    writeLine("");
    writeLine("Welcome to my terminal. Type 'help' for available commands.");
    write(PROMPT);

    // Key handler
    const onKey = (e: { key: string; domEvent: KeyboardEvent }) => {
      const { key, domEvent } = e;
      const charCode = key.charCodeAt(0);
      const printable = !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey;

      if (domEvent.key === "Enter") {
        write("\r\n");
        handleCommand(cmdBuffer.current);
        cmdBuffer.current = "";
      } else if (domEvent.key === "Backspace") {
        if (cmdBuffer.current.length > 0) {
          cmdBuffer.current = cmdBuffer.current.slice(0, -1);
          write("\b \b");
        }
      } else if (domEvent.key === "ArrowUp") {
        if (history.current.length > 0) {
          if (historyIdx.current === history.current.length) {
            savedLine.current = cmdBuffer.current;
          }
          historyIdx.current = Math.max(0, historyIdx.current - 1);
          // Clear current line
          write("\r\x1b[K" + PROMPT);
          cmdBuffer.current = history.current[historyIdx.current];
          write(cmdBuffer.current);
        }
      } else if (domEvent.key === "ArrowDown") {
        if (historyIdx.current < history.current.length) {
          historyIdx.current = Math.min(
            history.current.length,
            historyIdx.current + 1,
          );
          write("\r\x1b[K" + PROMPT);
          cmdBuffer.current =
            historyIdx.current === history.current.length
              ? savedLine.current
              : history.current[historyIdx.current];
          write(cmdBuffer.current);
        }
      } else if (domEvent.key === "Tab") {
        domEvent.preventDefault();
        const available = Object.keys(COMMANDS).filter((c) =>
          c.startsWith(cmdBuffer.current.toLowerCase()),
        );
        if (available.length === 1) {
          const completion = available[0].slice(cmdBuffer.current.length);
          cmdBuffer.current += completion;
          write(completion);
        }
      } else if (domEvent.ctrlKey && domEvent.key === "c") {
        write("^C\r\n" + PROMPT);
        cmdBuffer.current = "";
      } else if (printable && key.length === 1) {
        cmdBuffer.current += key;
        write(key);
      }
    };

    term.onKey(onKey);

    const onResize = () => fitAddonInstance.fit();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      term.dispose();
    };
  }, [write, writeLine, handleCommand]);

  return (
    <section id="terminal" className="max-w-3xl mx-auto px-6 py-24 sm:py-32">
      <h2 className="font-mono text-accent text-sm mb-6 tracking-widest uppercase">
        Terminal
      </h2>
      <div className="glass rounded-xl overflow-hidden border-white/[0.06]">
        {/* Header bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.02] border-b border-white/[0.04]">
          <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <span className="w-3 h-3 rounded-full bg-[#28c840]" />
          <span className="ml-3 text-xs text-muted font-mono">terminal</span>
        </div>
        <div ref={termRef} className="p-4" style={{ height: "420px" }} />
      </div>
    </section>
  );
}
