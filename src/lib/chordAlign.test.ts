import { describe, it, expect } from "vitest";
import golden from "./chordAlign.golden.json";
import {
  MIN_SIMILARITY,
  align,
  alignDetail,
  compare,
  editDistance,
  greedyAlign,
  greedyDetail,
  rowTimes,
  similarity,
  timesFromMatch,
  tokenMatch,
  tokens,
  type TimedLine,
} from "./chordAlign";
import { GRACE_DURATION, GRACE_LINES, GRACE_ROWS, clock } from "./chordAlignFixture";
import { getNote } from "./notes";
import { noteSource, plainText } from "./notes.server";

// The vectors come from the originals, not from this port. `chordAlign.golden.json` holds 43 cases
// run through chordist/align.py (similarity, align, row_times; repo head ede71cb) and through the
// widget's first matcher, ChordsView.qml scoreLine and buildSchedule at 52db806, extracted
// verbatim and run under Node. The text in them is "Amazing Grace" (public domain) and words the
// repo's own tests invented; there are no commercial lyrics here.

interface Golden {
  rows: string[];
  lines: [number, string][];
  duration: number;
  similarity: number[][];
  match: (number | null)[];
  times: number[] | null;
  greedyTimes: number[] | null;
}
const cases = golden as Golden[];
const timed = (pairs: [number, string][]): TimedLine[] => pairs.map(([t, text]) => ({ t, text }));
const without = (rows: string[], i: number) => rows.filter((_, k) => k !== i);

describe("the port against the Python original", () => {
  it("has the 43 cases the figure's caption cites", () => {
    expect(cases).toHaveLength(43);
  });

  it("scores every row against every line exactly as similarity() does", () => {
    for (const [k, c] of cases.entries()) {
      c.rows.forEach((row, i) => c.lines.forEach(([, text], j) => expect(similarity(row, text), `case ${k} ${i},${j}`).toBe(c.similarity[i][j])));
    }
  });

  it("returns the same pairing as align() and the same times as row_times()", () => {
    for (const [k, c] of cases.entries()) {
      expect(align(c.rows, c.lines.map((l) => l[1])), `case ${k} match`).toEqual(c.match);
      expect(rowTimes(c.rows, timed(c.lines), c.duration), `case ${k} times`).toEqual(c.times);
    }
  });

  it("the greedy scan gives the times the widget's QML gave", () => {
    for (const [k, c] of cases.entries()) {
      const lines = timed(c.lines);
      const match = greedyAlign(c.rows, lines.map((l) => l.text));
      expect(timesFromMatch(match, lines, c.duration), `case ${k}`).toEqual(c.greedyTimes);
    }
  });

  it("covers cases where the two matchers disagree, or the vectors prove nothing about the difference", () => {
    const differing = cases.filter((c) => JSON.stringify(c.match) !== JSON.stringify(greedyAlign(c.rows, c.lines.map((l) => l[1]))));
    expect(differing.length).toBeGreaterThanOrEqual(10);
  });
});

describe("tests/python/test_align.py, restated on invented text", () => {
  it("rows are matched to the lines they say", () => {
    const times = rowTimes(["when you were here before", "couldn't look you in the eye"], timed([[10, "When you were here before"], [15, "Couldn't look you in the eye"]]));
    expect(times).toEqual([10, 15]);
  });

  it("a repeated chorus takes each occurrence in order", () => {
    const rows = ["la la la dee dah", "hello from the verse", "la la la dee dah"];
    const lines = timed([[5, "la la la dee dah"], [10, "hello from the verse"], [20, "la la la dee dah"]]);
    expect(rowTimes(rows, lines)).toEqual([5, 10, 20]);
  });

  it("time never runs backwards, even when the chart is in the wrong order", () => {
    const rows = ["alpha beta gamma delta", "epsilon zeta eta theta", "iota kappa lambda mu"];
    const lines = timed([[10, "alpha beta gamma delta"], [20, "epsilon zeta eta theta"], [30, "iota kappa lambda mu"]]);
    const shuffled = [rows[2], rows[0], rows[1]];
    const times = rowTimes(shuffled, lines) as number[];
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it("unmatched rows are spread between matched ones", () => {
    const rows = ["one two three four", "mystery words nobody sings", "five six seven eight"];
    expect(rowTimes(rows, timed([[10, "one two three four"], [30, "five six seven eight"]]))).toEqual([10, 20, 30]);
  });

  it("nothing to align is null, not a guess", () => {
    expect(rowTimes(["a b c d"], [])).toBeNull();
    expect(rowTimes([], timed([[1, "a b c d"]]))).toBeNull();
    expect(rowTimes(["one two three four"], timed([[1, "completely different words here"]]))).toBeNull();
  });

  it("spelling drift still matches", () => {
    expect(similarity("how sweat the sound", "how sweet the sound")).toBeGreaterThanOrEqual(0.75);
  });

  it("a long chart aligns, to the line it was copied from", () => {
    const rows = Array.from({ length: 140 }, (_, i) => `row number ${i} with some words ${i % 9}`);
    const lines = rows.map((text, i) => ({ t: i * 2, text }));
    expect(rowTimes(rows, lines)).toEqual(rows.map((_, i) => i * 2));
  });
});

describe("the one-word row regression", () => {
  // The repo's test uses a one-word row of a song in Hindi; this is the same shape on public text.
  // Without the rule, "amen" is contained in the only line and would take it, leaving the row that
  // really says the line with nothing.
  const rows = ["amen", "how sweet the sound"];
  const lines = timed([[12, "amen how sweet the sound"]]);

  it("a one-word row has no similarity to anything", () => {
    expect(similarity("amen", "amen how sweet the sound")).toBe(0);
    expect("amen how sweet the sound".includes("amen")).toBe(true); // what a substring test alone would have taken
  });

  it("so the row that says the line gets it", () => {
    expect(align(rows, lines.map((l) => l.text))).toEqual([null, 0]);
    expect((rowTimes(rows, lines) as number[])[1]).toBe(12);
  });

  it("in the greedy scan too, which already carried the rule", () => {
    expect(greedyAlign(rows, lines.map((l) => l.text))).toEqual([null, 0]);
  });

  it("on the fixture, a one-word row scores zero against every line", () => {
    const edited = GRACE_ROWS.map((r, i) => (i === 3 ? "amen" : r));
    const d = alignDetail(edited, GRACE_LINES.map((l) => l.text));
    expect(d.similarity[3].every((x) => x === 0)).toBe(true);
    expect(d.match).toEqual([0, 1, 2, null, 4, 5, 6, 7, 8, 9, 10, 11]);
  });
});

describe("dropping a row from the chart", () => {
  const texts = GRACE_LINES.map((l) => l.text);
  const dropped = without(GRACE_ROWS, 4); // 'Twas grace that taught my heart to fear
  const c = compare(dropped, GRACE_LINES, GRACE_DURATION);

  it("leaves the alignment with every remaining row on its own line", () => {
    expect(c.alignmentRun.match).toEqual([0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11]);
    expect(c.alignmentRun.placed).toBe(11);
  });

  it("makes the greedy scan give the orphaned line to the next row, and lose its place", () => {
    // "'Twas grace that taught my heart to fear" has no row; "And grace my fears relieved" shares
    // grace, my and fear(s) with it: 3 hits over min(5, 8) words = 0.6, which the scan accepts.
    expect(greedyDetail(dropped, texts).picks[4]).toMatchObject({ line: 4, row: 4 });
    expect(greedyDetail(dropped, texts).picks[4].score).toBeCloseTo(0.6, 12);
    // Then line 5 ("And grace my fears relieved") has lost its row behind the cursor and takes the
    // last row ("And grace will lead me home"): 3 hits over min(6, 5) words, again 0.6.
    expect(greedyDetail(dropped, texts).picks[5]).toMatchObject({ line: 5, row: 10 });
    expect(greedyDetail(dropped, texts).picks[5].score).toBeCloseTo(0.6, 12);
    expect(greedyDetail(dropped, texts).picks).toHaveLength(6); // lines 6 to 11 find no row
    expect(c.greedyRun.match).toEqual([0, 1, 2, 3, 4, null, null, null, null, null, 5]);
    expect(c.greedyRun.placed).toBe(6);
  });

  it("which puts the last line of the song at 0:41 instead of 1:23", () => {
    const last = dropped.length - 1;
    expect(clock((c.alignmentRun.times as number[])[last])).toBe("1:23");
    expect(clock((c.greedyRun.times as number[])[last])).toBe("0:41");
  });

  it("and scores worse on the alignment's own measure", () => {
    expect(c.alignmentRun.agreement).toBeCloseTo(11 * (1 - MIN_SIMILARITY), 12);
    expect(c.greedyRun.agreement).toBeLessThan(c.alignmentRun.agreement);
  });

  it("only the two rows next to the similar line cause it: no other single drop splits the matchers", () => {
    const split = GRACE_ROWS.flatMap((_, i) => {
      const rows = without(GRACE_ROWS, i);
      return JSON.stringify(align(rows, texts)) === JSON.stringify(greedyAlign(rows, texts)) ? [] : [i];
    });
    expect(split).toEqual([4, 5]);
  });
});

describe("repeating a row", () => {
  const texts = GRACE_LINES.map((l) => l.text);

  it("ties, and the alignment gives the line to the later copy, the greedy scan to the earlier", () => {
    for (let i = 0; i < GRACE_ROWS.length; i++) {
      const rows = [...GRACE_ROWS.slice(0, i + 1), GRACE_ROWS[i], ...GRACE_ROWS.slice(i + 1)];
      const a = align(rows, texts);
      const g = greedyAlign(rows, texts);
      expect(a[i], `alignment, copy 1 of row ${i}`).toBeNull();
      expect(a[i + 1], `alignment, copy 2 of row ${i}`).toBe(i);
      expect(g[i], `greedy, copy 1 of row ${i}`).toBe(i);
      expect(g[i + 1], `greedy, copy 2 of row ${i}`).toBeNull();
    }
  });
});

describe("the matrices and the traceback", () => {
  const rows = without(GRACE_ROWS, 4);
  const d = alignDetail(rows, GRACE_LINES.map((l) => l.text));
  const n = rows.length;
  const m = GRACE_LINES.length;

  it("has the shape of the algorithm: (n+1) x (m+1) values, n x m scores", () => {
    expect(d.value).toHaveLength(n + 1);
    expect(d.value.every((r) => r.length === m + 1)).toBe(true);
    expect(d.similarity).toHaveLength(n);
    expect(d.substitution.every((r) => r.length === m)).toBe(true);
    expect(d.value[0].every((x) => x === 0) && d.value.every((r) => r[0] === 0)).toBe(true);
  });

  it("a pair is worth similarity minus the floor, or nothing under it", () => {
    d.similarity.forEach((r, i) => r.forEach((s, j) => expect(d.substitution[i][j]).toBe(s >= MIN_SIMILARITY ? s - MIN_SIMILARITY : 0)));
  });

  it("values never fall as rows or lines are added", () => {
    for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) expect(d.value[i][j]).toBeGreaterThanOrEqual(Math.max(d.value[i - 1][j], d.value[i][j - 1]));
  });

  it("the traceback starts in the corner, steps one cell at a time and yields exactly the pairing", () => {
    expect(d.path[0]).toMatchObject({ i: n, j: m });
    for (let k = 1; k < d.path.length; k++) {
      const a = d.path[k - 1];
      const b = d.path[k];
      expect([a.i - b.i, a.j - b.j]).toEqual(a.step === 1 ? [1, 1] : a.step === 2 ? [1, 0] : [0, 1]);
    }
    const rebuilt: (number | null)[] = new Array<number | null>(n).fill(null);
    for (const p of d.path) if (p.step === 1) rebuilt[p.i - 1] = p.j - 1;
    expect(rebuilt).toEqual(d.match);
  });

  it("is monotonic: matched lines strictly increase with the row", () => {
    const lines = d.match.filter((x): x is number => x !== null);
    expect(lines).toEqual([...lines].sort((a, b) => a - b));
    expect(new Set(lines).size).toBe(lines.length);
  });

  it("the corner value is the sum of the pair values on the path", () => {
    const sum = d.path.filter((p) => p.step === 1).reduce((s, p) => s + d.substitution[p.i - 1][p.j - 1], 0);
    expect(d.value[n][m]).toBeCloseTo(sum, 12);
  });
});

describe("the two matchers, scored alike", () => {
  // A small seeded generator, so the property is checked on inputs nobody picked.
  function rng(seed: number) {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  }
  const vocab = ["grace", "sweet", "sound", "wretch", "lost", "found", "blind", "see", "home", "fear", "now", "but", "was", "la", "oh", "graces", "swet"];

  it("the alignment is never beaten by the greedy scan on total agreement, and its corner is that total", () => {
    const rand = rng(11);
    const text = () =>
      Array.from({ length: Math.floor(rand() * 6) }, () => vocab[Math.floor(rand() * vocab.length)]).join(" ");
    for (let k = 0; k < 400; k++) {
      const rows = Array.from({ length: Math.floor(rand() * 12) }, text);
      const lines = Array.from({ length: Math.floor(rand() * 12) }, (_, j) => ({ t: j * 5, text: text() }));
      const c = compare(rows, lines, 80);
      expect(c.greedyRun.agreement, `case ${k}`).toBeLessThanOrEqual(c.alignmentRun.agreement + 1e-9);
      expect(c.alignment.value[rows.length][lines.length], `case ${k}`).toBeCloseTo(c.alignmentRun.agreement, 9);
    }
  });
});

describe("the fixture", () => {
  it("opens with the repo's own four test lines and times", () => {
    expect(GRACE_LINES.slice(0, 4)).toEqual([
      { t: 6, text: "Amazing grace how sweet the sound" },
      { t: 13, text: "That saved a wretch like me" },
      { t: 20, text: "I once was lost but now am found" },
      { t: 27, text: "Was blind but now I see" },
    ]);
  });

  it("an unedited chart lands every row on its own line, both ways", () => {
    const c = compare(GRACE_ROWS, GRACE_LINES, GRACE_DURATION);
    const identity = GRACE_ROWS.map((_, i) => i);
    expect(c.alignmentRun.match).toEqual(identity);
    expect(c.greedyRun.match).toEqual(identity);
    expect(c.alignmentRun.times).toEqual(GRACE_LINES.map((l) => l.t));
  });

  it("formats clock times", () => {
    expect(clock(6)).toBe("0:06");
    expect(clock(83)).toBe("1:23");
    expect(clock(40.6)).toBe("0:41");
  });
});

describe("the helpers", () => {
  it("tokens lowercase, drop diacritics and split on apostrophes and punctuation", () => {
    expect(tokens("'Twas grace, that  taught!")).toEqual(["twas", "grace", "that", "taught"]);
    expect(tokens("Brahmāstra")).toEqual(["brahmastra"]);
    expect(tokens("")).toEqual([]);
  });

  it("matches a word to itself, a longer form, or one edit away", () => {
    expect(tokenMatch("grace", "grace")).toBe(true);
    expect(tokenMatch("grace", "graces")).toBe(true);
    expect(tokenMatch("lost", "lose")).toBe(true);
    expect(tokenMatch("to", "too")).toBe(true);
    expect(tokenMatch("sound", "sweet")).toBe(false);
    expect(editDistance("ab", "abcd")).toBe(2);
    expect(editDistance("sound", "sounds")).toBe(1);
  });
});

describe("the note", () => {
  const note = getNote("chordist-chart-alignment")!;
  const source = noteSource("chordist-chart-alignment");

  it("is registered, and its title and summary follow the site's copy rules", () => {
    expect(note).toBeDefined();
    expect(note.title.length).toBeLessThan(43);
    expect(note.summary.length).toBeLessThanOrEqual(160);
    expect(note.title + note.summary + source).not.toMatch(/\u2014/); // no em dashes
  });

  it("opens with the figure, and has at most 450 words of prose", () => {
    expect(source.split("\n").filter((l) => l.trim() !== "").slice(0, 2)).toEqual([
      'import { ChordAlignment } from "@/components/figures/lazy";',
      "<ChordAlignment />",
    ]);
    expect(plainText(source).split(" ").length).toBeLessThanOrEqual(450);
  });

  it("has claim headings, none of them an uppercase label", () => {
    const headings = [...source.matchAll(/^## +(.+)$/gm)].map((m) => m[1]);
    expect(headings.length).toBeGreaterThanOrEqual(4);
    for (const h of headings) {
      expect(h, h).not.toBe(h.toUpperCase());
      expect(h.split(" ").length, h).toBeGreaterThanOrEqual(4);
    }
  });

  it("states the figures it quotes, and they are the ones computed above", () => {
    expect(source).toContain("0:41 instead of 1:23");
    expect(source).toContain("43 cases");
    expect(source).toContain("all twelve single-row repeats");
  });
});

describe("review: tokens folds case as the original does", () => {
  it("the sharp s becomes ss, as Python's casefold makes it", () => {
    expect(tokens("Straße über")).toEqual(["strasse", "uber"]);
  });
});
