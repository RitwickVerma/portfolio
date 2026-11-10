import { describe, expect, it } from "vitest";
import { compare } from "@/lib/chordAlign";
import { GRACE_DURATION, GRACE_LINES, GRACE_ROWS } from "@/lib/chordAlignFixture";
import { chordVerdict, rowRanges } from "./chordVerdict";

const run = (rows: string[]) => chordVerdict(compare(rows, GRACE_LINES, GRACE_DURATION), rows.length);

describe("the chord figure's verdict", () => {
  it("is ok when both methods give every row the same line", () => {
    const v = run(GRACE_ROWS);
    expect(v).toMatchObject({ tone: "ok", title: "Both methods give all 12 rows the same lines.", lost: [], differing: [] });
  });

  it("warns, with computed numbers, when the greedy scan loses the rest of the song", () => {
    const v = run(GRACE_ROWS.filter((_, k) => k !== 4));
    expect(v.tone).toBe("warn");
    expect(v.title).toBe("Alignment places 11 of 11 rows; the greedy scan places 6 and ends 42 seconds early (last row at 0:41, not 1:23).");
    expect(v.lost.length).toBe(5);
    expect(v.wrong).toEqual([5, 11]);
    expect(v.lost).toEqual(v.lost.slice().sort((x, y) => x - y));
  });

  it("is plain, not a warning, when only the choice between tied copies differs", () => {
    const v = run([...GRACE_ROWS, ...GRACE_ROWS.slice(8)]);
    expect(v.tone).not.toBe("warn");
    expect(v.differing.length).toBeGreaterThan(0);
  });

  it("handles an empty chart and a chart nothing matches", () => {
    expect(run([])).toMatchObject({ tone: "plain", title: "There are no rows to place." });
    expect(run(["zzz qqq", "xxx yyy"]).title).toBe("Neither method finds a line for any of the 2 rows.");
  });

  it("writes runs of row numbers", () => {
    expect(rowRanges([6, 7, 8, 9, 10, 11])).toBe("6 to 11");
    expect(rowRanges([6, 9])).toBe("6 and 9");
    expect(rowRanges([6, 7, 9, 10, 11])).toBe("6, 7 and 9 to 11");
    expect(rowRanges([])).toBe("");
  });
});
