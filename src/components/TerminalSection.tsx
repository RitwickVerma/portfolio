"use client";

import { useCallback, useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import { ANSI, PROMPT, welcome, COMMAND_NAMES, commandOutputs, statusOutput } from "@/lib/terminal";
import { getStatusSnapshot, loadStatus } from "@/lib/statusStore";
import { ACCENT, BG, FG, WARN } from "@/lib/theme";

// The xterm body only — TerminalWrapper owns the section chrome and mounts
// this lazily, so xterm never ships in the first-load bundle.

/** The site's mono font under the name next/font gave it (globals.css: --font-mono). */
function siteMonoFont(): string {
  const mono = getComputedStyle(document.documentElement).getPropertyValue("--font-geist-mono").trim();
  return mono ? `${mono}, monospace` : "monospace";
}

export default function TerminalSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);

  const currentCommandRef = useRef("");
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(0);

  /** Execute a full command and print its output (without echoing). */
  const handleCommand = useCallback((cmd: string) => {
    const term = terminalRef.current;
    if (!term) return;

    if (cmd === "status") {
      loadStatus();
      const snap = getStatusSnapshot();
      term.write(statusOutput(snap.status, snap.phase));
      return;
    }
    const output = commandOutputs()[cmd];
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

    const mount = (): (() => void) => {
      // Safety net for StrictMode double-mount: drop any leftover DOM.
      container.innerHTML = "";

      const term = new Terminal({
        cursorBlink: true,
        cursorStyle: "bar",
        fontSize: 14,
        fontFamily: siteMonoFont(),
        // Two tones only: values in the accent, labels in the text colour.
        theme: {
          background: BG,
          foreground: FG,
          cursor: ACCENT,
          selectionBackground: "rgba(240,179,90,0.22)",
          green: ACCENT,
          brightGreen: ACCENT,
          yellow: FG,
          brightYellow: FG,
          red: WARN,
          brightRed: WARN,
          cyan: ACCENT,
          brightCyan: ACCENT,
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

      // Tab completes; Escape hands focus back to the page so the terminal is
      // never a keyboard trap.
      term.attachCustomKeyEventHandler((event) => {
        if (event.type !== "keydown") return true;
        if (event.key === "Tab") {
          event.preventDefault();
          handleTab();
          return false;
        }
        if (event.key === "Escape") {
          term.blur();
          return false;
        }
        return true;
      });

      /* ---------------- input handling ---------------- */

      term.onData((data) => {
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

      // Welcome message + initial prompt. No auto-focus: it would steal focus
      // (and raise the keyboard on mobile) the moment the section scrolls in.
      term.write(welcome());
      term.write(PROMPT);

      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", onResize);
        ro.disconnect();
        terminalRef.current = null;
        term.dispose();
      };
    };

    // xterm measures a glyph once at open and sizes every cell from it, so it
    // must see the real font. The promise is already settled by the time this
    // section scrolls in (the nav uses Geist Mono from first paint); on a slow
    // connection the terminal waits rather than measuring the fallback.
    let disposed = false;
    let unmount: (() => void) | undefined;
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    fontsReady.then(() => {
      if (!disposed) unmount = mount();
    });

    return () => {
      disposed = true;
      unmount?.();
    };
  }, [handleCommand]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full cursor-text"
      onClick={() => terminalRef.current?.focus()}
    />
  );
}
