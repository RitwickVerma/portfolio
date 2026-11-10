import { describe, it, expect } from "vitest";
import { inReach, isPull, fightStep, reachReport, bestReach, explainPull, classify, reachBox, FIGHT_MS, type Rect, type Chain } from "./frameAuthority";

// The first three blocks are the cases of kwin-canvas's tests/unit/logic.test.js,
// section "the frame authority" (commit 93e7e50), one `it` per original `ok(...)`,
// named as the original names them. The numbers are the original's.

const mon: Rect[] = [{ x: 0, y: 0, width: 1920, height: 1080 }];
const R = (x: number, y: number, w?: number, h?: number): Rect => ({ x, y, width: w || 460, height: h || 420 });

describe("inReach (logic.test.js)", () => {
  it("100 px over the monitor is in reach", () => expect(inReach(R(1820, 300), mon)).toBe(true));
  it("80 px over it is not", () => expect(inReach(R(1840, 300), mon)).toBe(false));
  it("a window narrower than 100 px wholly over it is", () => expect(inReach(R(1840, 300, 80, 200), mon)).toBe(true));
  it("a top edge above the monitor is not", () => expect(inReach(R(300, -60), mon)).toBe(false));
  it("a top edge in the last 28 px is not", () => expect(inReach(R(300, 1060), mon)).toBe(false));
  it("one at 28 px above the bottom is", () => expect(inReach(R(300, 1052), mon)).toBe(true));
  it("no monitors, nothing in reach", () => expect(inReach(R(0, 0), [])).toBe(false));
  // Not in the original: the two edges of the rule, one pixel either side, from the measurements in docs/architecture.md.
  it("99 px over is not in reach and 100 is, so the limit is the 100 of the measurement", () => {
    expect([inReach(R(1821, 300), mon), inReach(R(1820, 300), mon)]).toEqual([false, true]);
    expect([inReach(R(-360, 300), mon), inReach(R(-359, 300), mon)]).toEqual([true, true]);
    expect(inReach(R(-361, 300), mon)).toBe(false);
  });
  it("a top at 1052 is in reach and 1053 is not", () => expect([inReach(R(300, 1052), mon), inReach(R(300, 1053), mon)]).toEqual([true, false]));
});

describe("isPull (logic.test.js)", () => {
  it("KWin's pull from far away is a pull (4000 -> 1820, the d112 case)", () => expect(isPull(R(4000, 300), R(1820, 300), mon, mon)).toBe(true));
  it("a window wholly past the right edge brought to 100 px over is a pull", () => expect(isPull(R(1980, 300), R(1820, 300), mon, mon)).toBe(true));
  it("a window wholly above the screen brought to the top is a pull", () => expect(isPull(R(300, -500), R(300, 0), mon, mon)).toBe(true));
  it("from 80 px over to 100 px over is a pull", () => expect(isPull(R(1840, 300), R(1820, 300), mon, mon)).toBe(true));
  it("a top edge brought to the top is a pull", () => expect(isPull(R(300, -60), R(300, 0), mon, mon)).toBe(true));
  it("a move between two places on the screen is not", () => expect(isPull(R(100, 120), R(700, 400), mon, mon)).toBe(false));
  it("a move out of reach is not", () => expect(isPull(R(100, 120), R(5000, 120), mon, mon)).toBe(false));
  it("a resize is not", () => expect(isPull(R(4000, 300), R(1820, 300, 500, 420), mon, mon)).toBe(false));
  it("a sub-pixel snap is not", () => expect(isPull(R(4000, 300), R(4000.4, 300), mon, mon)).toBe(false));
  it("a rescue from a monitor that went away is not (it was in reach before)", () => {
    const two: Rect[] = [mon[0], { x: 1920, y: 0, width: 1920, height: 1080 }];
    expect(isPull(R(2220, 200), R(300, 200), mon, two)).toBe(false);
  });
  it("a missing monitorsBefore reads as none (the original's `|| []`)", () => {
    expect(isPull(R(4000, 300), R(1820, 300), mon)).toBe(true);
    expect(isPull(R(4000, 300), R(1820, 300), mon, null)).toBe(true);
  });
});

describe("fightStep (logic.test.js)", () => {
  it("walks the original's chain: allowed, allowed, adopted, then a new chain after a pause", () => {
    let st = fightStep(null, 1000, 500);
    expect(st.allow, "the first revert is allowed").toBe(true);
    st = fightStep(st.chain, 1200, 500);
    expect(st.allow, "a second within the window is allowed").toBe(true);
    st = fightStep(st.chain, 1400, 500);
    expect(st.allow, "the third running is the window insisting: adopted").toBe(false);
    st = fightStep(st.chain, 2000, 500);
    expect(st.allow, "a move after a pause starts a new chain").toBe(true);
  });
  it("the step does not change the chain it was given", () => {
    const c0: Chain = { n: 1, at: 1000 };
    fightStep(c0, 1100, 500);
    expect(c0.n === 1 && c0.at === 1000).toBe(true);
  });
  it("500 ms is the limit of a chain, inclusive (main.qml fightMs)", () => {
    expect(FIGHT_MS).toBe(500);
    const c: Chain = { n: 2, at: 1000 };
    expect(fightStep(c, 1500, FIGHT_MS).allow, "exactly 500 ms later still continues the chain").toBe(false);
    expect(fightStep(c, 1501, FIGHT_MS).allow, "501 ms later starts a new one").toBe(true);
  });
});

// ---- what is new here: the explanations are the ported functions' own answers

/** A fixed pseudo-random sequence, so the grid is the same on every run. */
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

describe("reachReport and explainPull agree with the ported functions", () => {
  const layouts: Rect[][] = [mon, [mon[0], { x: 1920, y: 0, width: 1920, height: 1080 }], [mon[0], { x: 0, y: 1080, width: 2560, height: 1440 }], []];
  const rnd = lcg(7);
  const rects: Rect[] = [];
  for (let i = 0; i < 400; i++) rects.push({ x: Math.round(rnd() * 6000 - 1500), y: Math.round(rnd() * 3000 - 800), width: [60, 80, 100, 101, 460, 500][i % 6], height: [200, 420][i % 2] });
  // Boundaries the rule is made of.
  for (const x of [-361, -360, 1819, 1820, 1821, 1840]) for (const y of [-1, 0, 1051, 1052, 1053]) rects.push(R(x, y));

  it("reachReport(...).some(ok) is inReach, on 400 random windows and the rule's boundaries, for four layouts", () => {
    for (const m of layouts) for (const r of rects) expect(reachReport(r, m).some((x) => x.ok), JSON.stringify(r)).toBe(inReach(r, m));
  });
  it("explainPull(...).pull is isPull, and the rule is the first check that fails", () => {
    for (const before of layouts) {
      for (let i = 0; i + 1 < rects.length; i += 1) {
        const was = rects[i];
        const now = rects[(i * 7 + 3) % rects.length];
        for (const variant of [now, { ...now, width: was.width, height: was.height }, { ...was, x: was.x + 0.4 }]) {
          const t = explainPull(was, variant, mon, before);
          expect(t.pull, JSON.stringify([was, variant])).toBe(isPull(was, variant, mon, before));
          expect(t.pull).toBe(t.rule === "pull");
        }
      }
    }
  });
  it("names each check", () => {
    const two: Rect[] = [mon[0], { x: 1920, y: 0, width: 1920, height: 1080 }];
    expect(explainPull(R(4000, 300), R(1820, 300, 500, 420), mon, mon).rule).toBe("size-changed");
    expect(explainPull(R(4000, 300), R(4000.4, 300), mon, mon).rule).toBe("not-moved");
    expect(explainPull(R(100, 120), R(700, 400), mon, mon).rule).toBe("was-in-reach");
    expect(explainPull(R(2220, 200), R(300, 200), mon, two).rule).toBe("was-in-reach-before");
    expect(explainPull(R(100, 120), R(5000, 120), mon, mon).rule).toBe("was-in-reach");
    expect(explainPull(R(4000, 300), R(5000, 300), mon, mon).rule).toBe("lands-out-of-reach");
    expect(explainPull(R(4000, 300), R(1820, 300), mon, mon).rule).toBe("pull");
  });
  it("reports the numbers it compared", () => {
    const [m] = reachReport(R(1840, 300), mon);
    expect(m.across).toBe(80);
    expect(m.need).toBe(100);
    expect(m.widthOk).toBe(false);
    expect([m.topMin, m.topMax]).toEqual([0, 1052]);
    const [n] = reachReport(R(1840, 300, 80, 200), mon);
    expect([n.across, n.need, n.ok]).toEqual([80, 80, true]);
    expect(bestReach(reachReport(R(4000, 300), [mon[0], { x: 1920, y: 0, width: 1920, height: 1080 }]))?.monitor.x).toBe(1920);
    expect(bestReach([])).toBeNull();
  });
  it("reachBox is the set of top-left corners that are in reach (inclusive), and nothing else", () => {
    const wrong: string[] = [];
    for (const size of [{ width: 460, height: 420 }, { width: 80, height: 200 }, { width: 500, height: 420 }]) {
      const b = reachBox(size, mon[0]);
      const xs = [b.x - 1, b.x, b.x + 1, b.x + b.width - 1, b.x + b.width, b.x + b.width + 1];
      const ys = [b.y - 1, b.y, b.y + 1, b.y + b.height - 1, b.y + b.height, b.y + b.height + 1];
      for (let x = -600; x <= 2100; x += 37) xs.push(x);
      for (let y = -100; y <= 1100; y += 29) ys.push(y);
      for (const x of xs) {
        for (const y of ys) {
          const inside = x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height;
          if (inReach({ x, y, ...size }, mon) !== inside) wrong.push(`${size.width} at ${x},${y}`);
        }
      }
    }
    expect(wrong).toEqual([]);
  });
});

describe("classify composes them as classifyFrame in main.qml does", () => {
  it("a pull is reverted and starts a chain", () => {
    const c = classify(R(4000, 300), R(1820, 300), mon, mon, null, 1000);
    expect([c.verdict, c.rule]).toEqual(["revert", "pull"]);
    expect(c.chain).toEqual({ n: 1, at: 1000 });
    expect(c.fight?.allow).toBe(true);
  });
  it("a move that is not a pull is adopted without asking the fight detector, and leaves the chain alone", () => {
    const chain: Chain = { n: 2, at: 900 };
    const c = classify(R(100, 120), R(700, 400), mon, mon, chain, 1000);
    expect([c.verdict, c.rule, c.fight]).toEqual(["adopt", "was-in-reach", null]);
    expect(c.chain).toBe(chain);
  });
  it("the third pull in a row within 500 ms is adopted: the window insists", () => {
    let chain: Chain | null = null;
    const verdicts: string[] = [];
    for (const t of [1000, 1200, 1400]) {
      const c = classify(R(4000, 300), R(1820, 300), mon, mon, chain, t);
      verdicts.push(`${c.verdict}:${c.rule}`);
      chain = c.chain;
    }
    expect(verdicts).toEqual(["revert:pull", "revert:pull", "adopt:insists"]);
  });
  it("a pull after a pause is a new cause and is reverted again", () => {
    let chain: Chain | null = { n: 2, at: 1400 };
    const c = classify(R(4000, 300), R(1820, 300), mon, mon, chain, 2000);
    chain = c.chain;
    expect([c.verdict, c.fight?.sinceLast, chain?.n]).toEqual(["revert", 600, 1]);
  });
});
