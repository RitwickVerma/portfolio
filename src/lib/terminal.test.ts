import { describe, it, expect } from "vitest";
import { commandOutputs, COMMAND_NAMES, welcome } from "./terminal";
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
    expect(all).not.toMatch(/jellyfin|debrid|aiostreams|nixos|pi-hole|adguard|ramen\./i);
    expect(all).not.toMatch(/\b(?:69\.69\.69|192\.168)\./);
  });

  it("welcome banner drops the wide block art on narrow terminals", () => {
    expect(plain(welcome(80))).toContain("██");
    expect(plain(welcome(40))).not.toContain("██");
    expect(plain(welcome(40))).toContain("RITWICK VERMA");
  });
});
