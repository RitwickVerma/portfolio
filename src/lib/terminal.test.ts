import { describe, it, expect } from "vitest";
import { commandOutputs, COMMAND_NAMES, welcome, wrapList, BANNER_COLS, TERMINAL_COLS } from "./terminal";
import { services, projects } from "./data";

const plain = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

describe("terminal output", () => {
  const out = commandOutputs();

  it("defines output for every command except clear", () => {
    for (const name of COMMAND_NAMES.filter((c) => c !== "clear")) {
      expect(out[name], name).toBeTruthy();
    }
  });

  it("has no easter-egg command", () => {
    expect(COMMAND_NAMES).not.toContain("matrix");
    expect(plain(out.help)).not.toMatch(/easter|matrix/i);
  });

  it("derives the guest count from the services list", () => {
    expect(plain(out.whoami)).toContain(`${services.length}-guest`);
    expect(plain(out.neofetch)).toContain(`${services.length} guests`);
    expect(plain(out.homelab).split("\r\n").filter((l) => /^(CT|VM)\d+/.test(l))).toHaveLength(
      services.length,
    );
  });

  it("lists every project", () => {
    const text = plain(out.projects);
    for (const p of projects) expect(text).toContain(p.title);
  });

  it("points the resume command at the /resume page, not a PDF", () => {
    expect(plain(out.resume)).toContain("/resume");
    expect(plain(out.resume)).not.toMatch(/raw\.githubusercontent|\.pdf/);
  });

  it("contains no stale or private claims", () => {
    const all = plain(Object.values(out).join("\n"));
    expect(all).not.toMatch(/jellyfin|debrid|aiostreams|nixos|pi-hole|adguard|ramen\.|google play|play store/i);
    expect(all).not.toMatch(/\b(?:69\.69\.69|192\.168)\./);
  });

  it("fixed-format commands fit an 80-column terminal without wrapping", () => {
    // Data-driven tables (projects, homelab) wrap by content; the hand-written
    // ones must not, or a word breaks mid-way on the default desktop width.
    for (const name of ["help", "whoami", "skills", "resume", "contact", "stack", "neofetch"]) {
      for (const line of plain(out[name]).split("\r\n")) {
        expect(line.length, `${name}: ${line}`).toBeLessThanOrEqual(TERMINAL_COLS);
      }
    }
  });

  it("wrapList breaks between items, never inside one, and indents continuations", () => {
    // 11-column label + "aaaa bbbb  cccc dddd" (20) fits 32; adding the third item would not.
    const lines = plain(wrapList("Domains", ["aaaa bbbb", "cccc dddd", "eeee ffff"], 32)).split("\r\n").filter(Boolean);
    expect(lines).toEqual(["Domains    aaaa bbbb  cccc dddd", "           eeee ffff"]);
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(32);
    expect(plain(wrapList("X", ["one"], 80))).toBe("X          one\r\n");
    expect(plain(wrapList("X", [], 80))).toBe("");
  });

  it("welcome banner drops the wide block art on narrow terminals", () => {
    expect(plain(welcome(80))).toContain("██");
    expect(plain(welcome(40))).not.toContain("██");
    expect(plain(welcome(40))).toContain("RITWICK VERMA");
    // Exactly as wide as the banner still wraps the trailing newline: needs one more column.
    expect(plain(welcome(BANNER_COLS))).not.toContain("██");
    expect(plain(welcome(BANNER_COLS + 1))).toContain("██");
  });

  it("every banner line is the same width, so the letters line up", () => {
    const lines = plain(welcome(80)).split("\r\n").filter((l) => /[█╗╔╝║═╚]/.test(l));
    expect(lines).toHaveLength(6);
    for (const l of lines) expect(l.length, l).toBe(BANNER_COLS);
  });
});
