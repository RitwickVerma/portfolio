import { describe, it, expect } from "vitest";
import { services } from "./data";
import { CALM, DRIFT_GUESTS, INITIAL, SCENARIOS, UNDECLARED, guestState, headline, jobFor, plan, sameLive, setGuest, toggleId } from "./drift";

describe("drift model", () => {
  it("declares fourteen of the sixteen guests, as the note says", () => {
    expect(services.length).toBe(16);
    expect(services.filter((s) => !UNDECLARED.includes(s.ct)).length).toBe(14);
    expect(UNDECLARED.map((id) => services.find((s) => s.ct === id)!.name)).toEqual(["Devbox", "Observability"]);
  });

  it("draws guests that exist in lib/data, undeclared ones included", () => {
    expect(DRIFT_GUESTS.length).toBeGreaterThanOrEqual(4);
    expect(DRIFT_GUESTS.some((g) => !g.declared)).toBe(true);
    expect(DRIFT_GUESTS.some((g) => g.declared)).toBe(true);
  });

  it("a calm night reports nothing: empty commit, clean plan", () => {
    const r = plan(CALM);
    expect(r.findings).toEqual([]);
    expect(r.commitEmpty).toBe(true);
    expect(r.planClean).toBe(true);
  });

  it("an edit to a declared guest is reported by plan, not committed", () => {
    const r = plan({ ...CALM, edited: ["VM110"] });
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0]).toMatchObject({ step: "tofu-plan", outcome: "reported", subject: "Gateway" });
    expect(r.planClean).toBe(false);
    expect(r.commitEmpty).toBe(true);
  });

  it("a missing declared guest is reported once, even if it was also edited", () => {
    const r = plan({ ...CALM, edited: ["VM110"], gone: ["VM110"] });
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0].detail).toMatch(/not on the host/);
  });

  it("an undeclared guest is not seen by plan, edited or gone", () => {
    const r = plan({ ...CALM, edited: ["CT118"], gone: ["CT119"], added: true });
    expect(r.findings.map((f) => f.outcome)).toEqual(["not seen", "not seen", "not seen"]);
    expect(r.planClean).toBe(true);
    expect(r.commitEmpty).toBe(true);
  });

  it("a changed compose file is committed, and a secret is committed behind the redaction pass", () => {
    const r = plan({ ...CALM, compose: true, secret: true });
    expect(r.findings.map((f) => f.step)).toEqual(["sync-live", "sync-live"]);
    expect(r.findings[1].detail).toMatch(/redaction/);
    expect(r.commitEmpty).toBe(false);
    expect(r.planClean).toBe(true);
  });

  it("a file inside a container is outside both stages", () => {
    const r = plan({ ...CALM, inside: true });
    expect(r.findings).toEqual([{ step: "unseen", outcome: "not seen", subject: "A file inside a container", detail: "the backup's problem, not git's" }]);
  });

  it("is deterministic and does not mutate its input", () => {
    const live = { ...INITIAL, edited: [...INITIAL.edited] };
    const before = JSON.stringify(live);
    expect(plan(live)).toEqual(plan(live));
    expect(JSON.stringify(live)).toBe(before);
  });

  it("every finding belongs to exactly the stage that sees it", () => {
    const all = plan({ edited: ["VM100", "CT118"], gone: ["VM110"], added: true, compose: true, secret: true, inside: true });
    for (const f of all.findings) {
      if (f.outcome === "reported") expect(f.step).toBe("tofu-plan");
      if (f.outcome === "committed") expect(f.step).toBe("sync-live");
      if (f.outcome === "not seen") expect(f.step).toBe("unseen");
    }
    expect(all.findings).toHaveLength(7);
  });

  it("toggleId and sameLive", () => {
    expect(toggleId([], "a")).toEqual(["a"]);
    expect(toggleId(["a", "b"], "a")).toEqual(["b"]);
    expect(sameLive({ ...CALM, edited: ["a", "b"] }, { ...CALM, edited: ["b", "a"] })).toBe(true);
    expect(sameLive(CALM, { ...CALM, inside: true })).toBe(false);
  });

  it("the figure opens on a calm night", () => {
    expect(plan(INITIAL).findings).toEqual([]);
  });

  it("guest state and setGuest round-trip, and gone wins over edited", () => {
    const a = setGuest(CALM, "VM110", "edited");
    expect(guestState(a, "VM110")).toBe("edited");
    const b = setGuest(a, "VM110", "gone");
    expect(guestState(b, "VM110")).toBe("gone");
    expect(b.edited).toEqual([]);
    expect(guestState(setGuest(b, "VM110", "as it was"), "VM110")).toBe("as it was");
  });

  it("each scenario says what the note says happens", () => {
    const by = (id: string) => plan(SCENARIOS.find((s) => s.id === id)!.live);
    expect(by("gateway").findings.map((f) => f.outcome)).toEqual(["reported"]);
    expect(by("devbox").findings.map((f) => f.outcome)).toEqual(["not seen"]);
    expect(by("config").findings.map((f) => f.outcome)).toEqual(["committed"]);
    expect(by("secret").findings.map((f) => f.outcome)).toEqual(["committed"]);
    expect(by("inside").findings.map((f) => f.outcome)).toEqual(["not seen"]);
  });

  it("the headline counts what the report holds, in plain words", () => {
    expect(headline(plan(CALM)).tone).toBe("ok");
    const h = headline(plan({ ...CALM, edited: ["VM110"], compose: true, inside: true }));
    expect(h.title).toBe("The job reports 1 difference and saves 1 changed file to the repository. It cannot see 1 change.");
    expect(h.tone).toBe("warn");
    expect(h.details).toEqual(["Reported: Gateway.", "What is inside a container is the backup's job, not Git's."]);
    expect(headline(plan({ ...CALM, edited: ["VM100", "VM110"] })).title).toBe("The job reports 2 differences.");
    expect(headline(plan({ ...CALM, edited: ["VM110"] })).tone).toBe("ok");
  });

  it("jobFor looks a subject up", () => {
    const r = plan({ ...CALM, edited: ["VM110"] });
    expect(jobFor(r, "Gateway")).toBe("reported");
    expect(jobFor(r, "Home Assistant")).toBe("nothing");
  });
});
