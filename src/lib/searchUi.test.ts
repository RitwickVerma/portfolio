import { describe, it, expect } from "vitest";
import { SHOWN, SHOWN_PHONE, rowsInView, nextSelection, firstRevealed, reselect } from "./searchUi";

describe("rowsInView: the rows a visitor can actually see", () => {
  it("a phone shows three before Show all, a wide screen six, and Show all shows every one", () => {
    expect(rowsInView(20, false, false)).toBe(SHOWN_PHONE);
    expect(rowsInView(20, false, true)).toBe(SHOWN);
    expect(rowsInView(20, true, false)).toBe(20);
    expect(rowsInView(20, true, true)).toBe(20);
  });

  it("never more rows than there are hits", () => {
    expect(rowsInView(2, false, false)).toBe(2);
    expect(rowsInView(5, false, true)).toBe(5);
    expect(rowsInView(0, false, true)).toBe(0);
  });
});

describe("nextSelection: arrow keys clamp to the visible rows", () => {
  it("ArrowDown stops at the last visible row, ArrowUp goes back to the box", () => {
    let at = -1;
    for (let i = 0; i < 10; i++) at = nextSelection(at, "ArrowDown", rowsInView(12, false, false));
    expect(at).toBe(SHOWN_PHONE - 1);
    expect(nextSelection(at, "ArrowUp", 3)).toBe(1);
    expect(nextSelection(0, "ArrowUp", 3)).toBe(-1);
    expect(nextSelection(-1, "ArrowUp", 3)).toBe(-1);
  });

  it("a selection past the visible rows (the window got narrower) is pulled back in", () => {
    expect(nextSelection(5, "ArrowDown", 3)).toBe(2);
    expect(nextSelection(5, "ArrowUp", 3)).toBe(1);
  });

  it("does nothing with no rows", () => {
    expect(nextSelection(-1, "ArrowDown", 0)).toBe(-1);
  });
});

describe("firstRevealed: where focus goes after Show all", () => {
  it("is the first row that was hidden at this width", () => {
    expect(firstRevealed(false)).toBe(SHOWN_PHONE);
    expect(firstRevealed(true)).toBe(SHOWN);
  });
});

describe("reselect: a selection survives a re-rank", () => {
  it("follows the document to its new position", () => {
    expect(reselect(["a", "b", "c", "d"], "c", 4)).toBe(2);
    expect(reselect(["c", "a", "b", "d"], "c", 4)).toBe(0);
  });

  it("is lost when the document left the results or fell out of the visible rows", () => {
    expect(reselect(["a", "b"], "z", 2)).toBe(-1);
    expect(reselect(["a", "b", "c", "d"], "d", 3)).toBe(-1);
    expect(reselect(["a", "b"], null, 2)).toBe(-1);
  });
});
