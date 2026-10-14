import { describe, it, expect } from "vitest";
import { commandOutputs, statusOutput, COMMAND_NAMES, welcome, wrapList, TERMINAL_COLS } from "./terminal";
import { parseStatus } from "./status";
import example from "../../tools/status.example.json";
import { services, projects } from "./data";
import { notes } from "./notes";

const plain = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

describe("terminal output", () => {
  const out = commandOutputs();

  it("defines output for every command except clear and the live status", () => {
    for (const name of COMMAND_NAMES.filter((c) => c !== "clear" && c !== "status")) {
      expect(out[name], name).toBeTruthy();
    }
  });

  it("status explains itself without a feed and lists every guest with one", () => {
    expect(plain(statusOutput(null, "none"))).toMatch(/No live status/);
    expect(plain(statusOutput(null, "loading"))).toMatch(/Fetching/);
    const s = parseStatus(example)!;
    const now = Date.parse(s.generatedAt) + 3 * 60_000;
    const text = plain(statusOutput(s, "live", now));
    expect(text).toMatch(/^Host  live · updated 3 min ago · 15\/16 running/);
    for (const svc of services) expect(text).toContain(svc.ct);
    expect(text).toMatch(/CT107 {3}Paperless-ngx {3}stopped/);
    expect(plain(statusOutput(s, "stale", now))).toMatch(/stale/);
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

  it("lists every note with its URL", () => {
    const text = plain(out.notes);
    for (const n of notes) {
      expect(text).toContain(n.title);
      expect(text).toContain(`/notes/${n.slug}/`);
    }
  });

  it("lists every project", () => {
    const text = plain(out.projects);
    for (const p of projects) expect(text).toContain(p.title);
  });

  it("experience keeps a gap between the period column and the role", () => {
    for (const line of plain(out.experience).split("\r\n").filter(Boolean)) {
      expect(line, line).toMatch(/\S  +\S/);
      expect(line).toMatch(/ @ /);
    }
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

  it("welcome greets by name and points at help", () => {
    expect(plain(welcome())).toMatch(/^Ritwick Verma/);
    expect(plain(welcome())).toContain("'help'");
  });
});
