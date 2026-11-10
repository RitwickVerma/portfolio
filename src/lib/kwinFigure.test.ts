import { describe, it, expect } from "vitest";
import { inReach, type Rect } from "./frameAuthority";
import { kwinReach, monitorsFor, play, presetScene, initialFigure, PRESETS, ACTORS, ruleSentence, MONITOR, SIZE, type Scene } from "./kwinFigure";

const mon: Rect[] = [MONITOR];
const R = (x: number, y: number, w = SIZE.width, h = SIZE.height): Rect => ({ x, y, width: w, height: h });

describe("kwinReach, the stand-in for KWin's rule, reproduces the measurements in kwin-canvas's docs/architecture.md", () => {
  it("1840 and 4000 on a 1920 px screen both end at 1820", () => {
    expect(kwinReach(R(1840, 300), mon).x).toBe(1820);
    expect(kwinReach(R(4000, 300), mon).x).toBe(1820);
  });
  it("-400 for a 460 px window ends at -360", () => expect(kwinReach(R(-400, 300), mon).x).toBe(-360));
  it("a top above the monitor goes to 0, one in the last 28 px to the height minus 28 (1060 ends at 1052)", () => {
    expect(kwinReach(R(300, -60), mon).y).toBe(0);
    expect(kwinReach(R(300, -500), mon).y).toBe(0);
    expect(kwinReach(R(300, 1060), mon).y).toBe(1052);
  });
  it("a window in reach is left alone, and the result of the rule is always in reach", () => {
    expect(kwinReach(R(100, 120), mon)).toEqual(R(100, 120));
    const wrong: string[] = [];
    for (let x = -3000; x <= 6000; x += 137) for (let y = -900; y <= 1500; y += 91) for (const w of [80, 460, 1900]) {
      const out = kwinReach(R(x, y, w, 300), mon);
      if (!inReach(out, mon) || out.width !== w) wrong.push(`${x},${y},${w}`);
    }
    expect(wrong).toEqual([]);
  });
  it("with two monitors it goes to the nearest", () => {
    const two = [MONITOR, { x: 1920, y: 0, width: 1920, height: 1080 }];
    expect(kwinReach(R(4000, 300), two).x).toBe(3740);
    expect(kwinReach(R(-900, 300), two).x).toBe(-360);
  });
});

describe("the figure's presets play out as the unit tests say", () => {
  for (const p of PRESETS) {
    it(`${p.label}: ${p.test}`, () => {
      const r = play(presetScene(p));
      expect(r.played.result.verdict).toBe(p.expect);
    });
  }
  it("the cases are the ones of the test file: every preset cites a distinct test", () => {
    expect(new Set(PRESETS.map((p) => p.test)).size).toBe(PRESETS.length);
  });
  it("a revert leaves the window where the canvas had it; an adopt leaves it where it went", () => {
    const rev = play(presetScene(PRESETS[0]));
    expect(rev.played.now.x).toBe(1820);
    expect(rev.played.final).toEqual(R(4000, 300));
    expect(rev.scene.frame).toEqual(R(4000, 300));
    const ado = play(presetScene(PRESETS.find((p) => p.id === "on-screen")!));
    expect(ado.scene.frame).toEqual(R(700, 400));
  });
  it("the insisting window: revert, revert, adopt, and then it is where KWin put it", () => {
    let s = presetScene(PRESETS.find((p) => p.id === "insists")!);
    const out: string[] = [];
    for (let i = 0; i < 4; i++) {
      const r = play(s);
      out.push(`${r.played.result.verdict}:${r.played.result.rule}`);
      s = r.scene;
    }
    expect(out).toEqual(["revert:pull", "revert:pull", "adopt:insists", "adopt:not-moved"]);
    expect(s.frame.x).toBe(1820);
  });
  it("after a pause the chain starts over", () => {
    let s: Scene = presetScene(PRESETS[0]);
    s = play(s).scene;
    s = play(s).scene;
    const third = play({ ...s, gap: "pause" });
    expect(third.played.result.verdict).toBe("revert");
    expect(third.scene.chain?.n).toBe(1);
  });
  it("a rescue is adopted because the window was in reach before the monitor went", () => {
    const r = play(presetScene(PRESETS.find((p) => p.id === "rescue")!));
    expect(r.played.result.rule).toBe("was-in-reach-before");
    const same = play({ ...presetScene(PRESETS.find((p) => p.id === "rescue")!), gone: false });
    expect(same.played.result.verdict, "with the monitor still there it is a pull").toBe("revert");
    expect(monitorsFor(true).before).toHaveLength(2);
  });
  it("the server-rendered first state is a played case, and every actor has a sentence", () => {
    const f = initialFigure();
    expect(f.played.result.verdict).toBe("revert");
    expect(ruleSentence(f.played.result, f.played.final)).toMatch(/Reverted.*4000, 300/);
    expect(ACTORS.map((a) => a.id)).toEqual(["kwin", "script", "resize", "snap"]);
  });
});
