import { describe, it, expect } from "vitest";
import { KEYS, ROWS, COLS, COL_GPIOS, ROW_GPIOS, BOARD_W, BOARD_H, LINE_MAX, keyForCode, keyId, codesForChar, applyKey, charForTap, DEMO_TEXT } from "./crush80";

// `default_transform` from the published crush80.dts (gitlab.com/ritwick7/crush80-zmk),
// verbatim. The data file must use exactly these matrix positions and no others.
const DTS_TRANSFORM = `
RC(0,0)  RC(0,1)  RC(0,2)  RC(0,3)  RC(0,4)  RC(0,5)  RC(0,6)  RC(0,7)
RC(0,8)  RC(0,9)  RC(0,10) RC(0,11) RC(0,12) RC(4,12)
RC(0,13) RC(0,14) RC(0,15)
RC(1,0)  RC(1,1)  RC(1,2)  RC(1,3)  RC(1,4)  RC(1,5)  RC(1,6)  RC(1,7)
RC(1,8)  RC(1,9)  RC(1,10) RC(1,11) RC(1,12) RC(1,13)
RC(1,14) RC(1,15) RC(3,14)
RC(2,0)  RC(2,1)  RC(2,2)  RC(2,3)  RC(2,4)  RC(2,5)  RC(2,6)  RC(2,7)
RC(2,8)  RC(2,9)  RC(2,10) RC(2,11) RC(2,12) RC(2,13)
RC(2,14) RC(2,15) RC(3,15)
RC(3,0)  RC(3,1)  RC(3,2)  RC(3,3)  RC(3,4)  RC(3,5)  RC(3,6)  RC(3,7)
RC(3,8)  RC(3,9)  RC(3,10) RC(3,11)                    RC(3,13)
RC(4,0)           RC(4,2)  RC(4,3)  RC(4,4)  RC(4,5)  RC(4,6)  RC(4,7)
RC(4,8)  RC(4,9)  RC(4,10) RC(4,11)           RC(4,13) RC(4,14)
RC(5,0)  RC(5,1)  RC(5,2)                     RC(5,5)
RC(5,9)  RC(5,10) RC(5,11) RC(5,12) RC(5,13) RC(5,14) RC(5,15)
`;
const dtsPositions = [...DTS_TRANSFORM.matchAll(/RC\((\d+),(\d+)\)/g)].map((m) => `${m[1]},${m[2]}`);

describe("Crush 80 matrix", () => {
  it("is the 88-key 6×16 board the dts declares", () => {
    expect(dtsPositions).toHaveLength(88);
    expect(KEYS).toHaveLength(88);
    expect(ROWS).toBe(6);
    expect(COLS).toBe(16);
    expect(COL_GPIOS).toHaveLength(COLS);
    expect(ROW_GPIOS).toHaveLength(ROWS);
  });

  it("uses exactly the matrix positions in the dts transform, each once", () => {
    expect([...KEYS.map(keyId)].sort()).toEqual([...dtsPositions].sort());
  });

  it("physical rows hold 17, 17, 17, 13, 13 and 11 keys", () => {
    const rowsByY = new Map<number, number>();
    for (const k of KEYS) rowsByY.set(k.y, (rowsByY.get(k.y) ?? 0) + 1);
    expect([...rowsByY.entries()].sort((a, b) => a[0] - b[0]).map(([, n]) => n)).toEqual([17, 17, 17, 13, 13, 11]);
  });

  it("keys never overlap and stay inside the board", () => {
    for (let i = 0; i < KEYS.length; i++) {
      for (let j = i + 1; j < KEYS.length; j++) {
        const a = KEYS[i], b = KEYS[j];
        if (a.y !== b.y) continue;
        const overlap = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        expect(overlap, `${a.label} vs ${b.label}`).toBeLessThanOrEqual(0);
      }
      expect(KEYS[i].x + KEYS[i].w).toBeLessThanOrEqual(BOARD_W);
      expect(KEYS[i].y + (KEYS[i].h ?? 1)).toBeLessThanOrEqual(BOARD_H);
    }
  });

  it("widths follow the dts physical layout: 2u Backspace, 1.5u Tab and \\, 1.75u Caps and RShift, 2.25u Enter and LShift, 6.25u Space", () => {
    const w = (code: string) => keyForCode(code)?.w;
    expect(w("Backspace")).toBe(2);
    expect(w("Tab")).toBe(1.5);
    expect(w("Backslash")).toBe(1.5);
    expect(w("CapsLock")).toBe(1.75);
    expect(w("ShiftRight")).toBe(1.75);
    expect(w("Enter")).toBe(2.25);
    expect(w("ShiftLeft")).toBe(2.25);
    expect(w("Space")).toBe(6.25);
    // Bottom row: Ctrl Win Alt Space Alt Fn Win Ctrl fill the 15u main block exactly.
    expect(KEYS.filter((k) => k.y === 5.1 && k.x < 15).reduce((s, k) => s + k.w, 0)).toBe(15);
  });

  it("maps browser key codes onto switches; PgUp/PgDn live on row 3 as the transform says", () => {
    expect(keyForCode("KeyA")).toMatchObject({ r: 3, c: 1 });
    expect(keyForCode("Space")).toMatchObject({ r: 5, c: 5 });
    expect(keyForCode("PageUp")).toMatchObject({ r: 3, c: 14 });
    expect(keyForCode("PageDown")).toMatchObject({ r: 3, c: 15 });
    expect(keyForCode("F13")).toMatchObject({ r: 4, c: 12 });
    expect(keyForCode("MetaRight")).toMatchObject({ r: 5, c: 11 });
    expect(keyForCode("ControlRight")).toMatchObject({ r: 5, c: 12 });
    expect(keyForCode("NumpadEnter")).toBeUndefined();
    expect(keyForCode("Fn")).toBeUndefined();
  });

  it("the demo string is typeable on this board", () => {
    for (const ch of DEMO_TEXT) {
      const codes = codesForChar(ch);
      expect(codes.length, ch).toBeGreaterThan(0);
      for (const c of codes) expect(keyForCode(c), c).toBeDefined();
    }
  });

  it("the readout line appends printable keys, deletes on Backspace, clears on Enter, scrolls at the cap", () => {
    let line = "";
    for (const ch of "Hi, there") line = applyKey(line, ch, ch === " " ? "Space" : `Key${ch.toUpperCase()}`);
    expect(line).toBe("Hi, there");
    expect(applyKey(line, "Backspace", "Backspace")).toBe("Hi, ther");
    expect(applyKey(line, "Enter", "Enter")).toBe("");
    expect(applyKey(line, "Shift", "ShiftLeft")).toBe(line);
    expect(applyKey(line, "ArrowUp", "ArrowUp")).toBe(line);
    const long = applyKey("x".repeat(LINE_MAX), "y", "KeyY");
    expect(long).toHaveLength(LINE_MAX);
    expect(long.endsWith("y")).toBe(true);
  });

  it("a tap inserts the cap's character: lowercase letters, symbols as printed, no text for modifiers", () => {
    expect(charForTap(keyForCode("KeyQ")!)).toBe("q");
    expect(charForTap(keyForCode("Semicolon")!)).toBe(";");
    expect(charForTap(keyForCode("Space")!)).toBe(" ");
    expect(charForTap(keyForCode("ShiftLeft")!)).toBeNull();
    expect(charForTap(keyForCode("F1")!)).toBeNull();
  });

  it("typing the demo string through applyKey reproduces it", () => {
    let line = "";
    for (const ch of DEMO_TEXT) line = applyKey(line, ch, codesForChar(ch)[0]);
    expect(line).toBe(DEMO_TEXT);
  });
});
