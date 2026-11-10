import { describe, it, expect } from "vitest";
import { timeline, addressesFor, clockText, leftText, gapText, EXAMPLE, GAPS_MS, ANSWER_AFTER_MS, APPROVAL_TIMEOUT_MS, type RequestInput } from "./sudostampSim";
import { REFUSED_QUIET, REFUSED_COOLING, REFUSED_GLOBAL, REFUSED_COOLING_V1 } from "./sudostamp";

const req = (o: Partial<RequestInput> = {}): RequestInput => ({ from: "a", fresh: false, payload: 32, answer: "approve", gapMs: 0, ...o });

describe("the limiter figure's model", () => {
  it("the example tells the story under 1.4: asked, refused right behind, asked, refused from a new address", () => {
    const rows = timeline(EXAMPLE, "computer");
    expect(rows.map((r) => r.outcome)).toEqual(["approved", "refused", "denied", "refused"]);
    expect(rows[1].reason).toBe(REFUSED_QUIET);
    expect(rows[3].reason).toBe(REFUSED_COOLING);
    expect(rows[3].rule).toBe("cooling");
    // computer B came from two different addresses and was still recognised
    expect(rows[2].address).not.toBe(rows[3].address);
    expect(rows.map((r) => r.atMs)).toEqual([0, 2_000, 12_000, 19_000]);
  });

  it("the same requests under 1.3: the second approval prompt and the rotated address both get through", () => {
    const rows = timeline(EXAMPLE, "address");
    expect(rows.map((r) => r.outcome)).toEqual(["approved", "approved", "denied", "denied"]);
    expect(rows.every((r) => r.asked)).toBe(true);
  });

  it("each row knows what the other keying would have done", () => {
    const mine = timeline(EXAMPLE, "computer");
    const other = timeline(EXAMPLE, "address");
    expect(mine.map((r) => r.askedUnderOther)).toEqual(other.map((r) => r.asked));
    expect(other.map((r) => r.askedUnderOther)).toEqual(mine.map((r) => r.asked));
  });

  it("times: a gap counts from the end of the previous request, and an answer takes 2 s", () => {
    const rows = timeline([req(), req({ gapMs: 5_000 })], "computer");
    expect(rows[0].atMs).toBe(0);
    expect(rows[0].endMs).toBe(ANSWER_AFTER_MS);
    expect(rows[1].atMs).toBe(ANSWER_AFTER_MS + 5_000);
    // 5 s after the answer, the 3 s quiet period is over
    expect(rows[1].asked).toBe(true);
  });

  it("quiet period boundary: refused 0 s and 2.999 s behind, asked at 3 s", () => {
    expect(timeline([req(), req({ gapMs: 0 })], "computer")[1].rule).toBe("quiet");
    expect(timeline([req(), req({ gapMs: 3_000 })], "computer")[1].asked).toBe(true);
  });

  it("ignoring a prompt costs 60 s of the visitor's time and then counts as unapproved", () => {
    const rows = timeline([req({ answer: "ignore" }), req({ gapMs: 0 })], "computer");
    expect(rows[0].outcome).toBe("ignored");
    expect(rows[0].endMs).toBe(APPROVAL_TIMEOUT_MS);
    expect(rows[1].rule).toBe("cooling");
    expect(rows[0].state.cooling).toEqual([{ who: "Computer A", leftMs: 60_000 }]);
  });

  it("a trusted computer can retry a mistaken Deny after 5 s; a new one waits 60 s", () => {
    const trusted = timeline([req(), req({ answer: "deny", gapMs: 3_000 }), req({ gapMs: 5_000 })], "computer");
    expect(trusted.map((r) => r.outcome)).toEqual(["approved", "denied", "approved"]);
    const fresh = timeline([req({ answer: "deny" }), req({ gapMs: 5_000 }), req({ gapMs: 60_000 })], "computer");
    expect(fresh.map((r) => r.asked)).toEqual([true, false, true]);
  });

  it("the global cap: four denials from any computers, then everything is refused until the oldest leaves the window", () => {
    // a minute apart, so each computer's own cooldown is over and only the cap can refuse
    const four = (["a", "b", "a", "b"] as const).map((from, i) => req({ from, answer: "deny", gapMs: i === 0 ? 0 : 60_000 }));
    const rows = timeline([...four, req({ from: "a", gapMs: 60_000 })], "computer");
    expect(rows[4].reason).toBe(REFUSED_GLOBAL);
    expect(rows[3].state.windowCount).toBe(4);
    const later = timeline([...four, req({ from: "a", gapMs: 600_000 })], "computer");
    expect(later[4].asked).toBe(true);
  });

  it("the payload check refuses before anything, under either keying, and costs the limiter nothing", () => {
    for (const keying of ["computer", "address"] as const) {
      const rows = timeline([req({ payload: 100, answer: "deny" }), req()], keying);
      expect(rows[0].rule).toBe("payload");
      expect(rows[0].reason).toBe("refusing to sign 100 bytes: not a pam_rssh challenge");
      expect(rows[1].asked, "nothing was recorded against the computer").toBe(true);
    }
  });

  it("1.3 keyed by address: the same address is silenced for 30 s, a known one never", () => {
    const same = timeline([req({ answer: "deny" }), req({ gapMs: 3_000 }), req({ gapMs: 30_000 })], "address");
    expect(same.map((r) => r.asked)).toEqual([true, false, true]);
    expect(same[1].reason).toBe(REFUSED_COOLING_V1);
    const known = timeline([req(), req({ answer: "deny", gapMs: 5_000 }), req({ gapMs: 0 })], "address");
    expect(known.map((r) => r.asked)).toEqual([true, true, true]);
  });

  it("rotating the address never trips 1.3 and always trips 1.4", () => {
    const attack = Array.from({ length: 4 }, (_, i) => req({ from: "b", fresh: true, answer: "deny", gapMs: i === 0 ? 0 : 5_000 }));
    expect(timeline(attack, "address").every((r) => r.asked)).toBe(true);
    expect(timeline(attack, "computer").map((r) => r.asked)).toEqual([true, false, false, false]);
  });

  it("addresses come from the documentation range, one new per fresh request per computer", () => {
    const a = addressesFor([req({ fresh: true }), req({ fresh: true }), req({ from: "b", fresh: true }), req()]);
    expect(a).toEqual(["2001:db8::a:1", "2001:db8::a:2", "2001:db8::b:1", "2001:db8::a"]);
    for (const x of a) expect(x).toMatch(/^2001:db8::/);
  });

  it("the replay is deterministic and does not mutate its input", () => {
    const copy = JSON.parse(JSON.stringify(EXAMPLE));
    expect(timeline(EXAMPLE, "computer")).toEqual(timeline(EXAMPLE, "computer"));
    expect(EXAMPLE).toEqual(copy);
  });

  it("text helpers", () => {
    expect(clockText(0)).toBe("0:00");
    expect(clockText(74_000)).toBe("1:14");
    expect(leftText(58_000)).toBe("58 s");
    expect(leftText(598_000)).toBe("9 min 58 s");
    expect(leftText(600_000)).toBe("10 min");
    expect(GAPS_MS.map(gapText)).toEqual(["0 s, queued behind", "3 s", "5 s", "10 s", "30 s", "1 min", "10 min"]);
  });
});
