// The Wobkey Crush 80 Pro as the firmware sees it: a 6×16 switch matrix,
// generated from the published ZMK board definition
// (gitlab.com/ritwick7/crush80-zmk, zmk/boards/crush80/crush80.dts: the
// `default_transform` RC map, the kscan GPIO lists and the physical layout,
// positions in key units). 88 keys, F13 included; the right Win cap is a
// layer key on the real board but lights for a visitor's own Win key here. Pure data and pure
// functions; crush80.test.ts cross-checks every matrix position against the
// transform copied from that file.
//
// Each key carries its matrix position, its label, and its physical
// geometry in key units (1u = one letter key) so a component can draw the
// board exactly and light the switch that a browser key event maps to.

export const ROWS = 6;
export const COLS = 16;

/** Column strobe lines, in matrix order (col-gpios in the dts). */
export const COL_GPIOS = ["PE0", "PE1", "PE2", "PE4", "PE5", "PE6", "PB0", "PB1", "PB2", "PB3", "PB4", "PB5", "PB6", "PC0", "PC1", "PC4"] as const;
/** Row sense lines, pulled up, in matrix order (row-gpios in the dts). */
export const ROW_GPIOS = ["PD7", "PD2", "PD3", "PD4", "PD5", "PD6"] as const;

export interface Key {
  /** Matrix row (0..5) and column (0..15), as in the RC() macro. */
  r: number;
  c: number;
  /** Cap legend. */
  label: string;
  /** `KeyboardEvent.code` values that light this switch. */
  codes: readonly string[];
  /** Left edge and top edge in key units; width and height in key units. */
  x: number;
  y: number;
  w: number;
  h?: number;
}

const K = (r: number, c: number, label: string, codes: string | readonly string[], x: number, y: number, w = 1): Key => ({
  r, c, label, codes: typeof codes === "string" ? [codes] : codes, x, y, w,
});


export const KEYS: readonly Key[] = [
  K(0, 0, "Esc", "Escape", 0, 0),
  K(0, 1, "F1", "F1", 1.25, 0),
  K(0, 2, "F2", "F2", 2.25, 0),
  K(0, 3, "F3", "F3", 3.25, 0),
  K(0, 4, "F4", "F4", 4.25, 0),
  K(0, 5, "F5", "F5", 5.5, 0),
  K(0, 6, "F6", "F6", 6.5, 0),
  K(0, 7, "F7", "F7", 7.5, 0),
  K(0, 8, "F8", "F8", 8.5, 0),
  K(0, 9, "F9", "F9", 9.75, 0),
  K(0, 10, "F10", "F10", 10.75, 0),
  K(0, 11, "F11", "F11", 11.75, 0),
  K(0, 12, "F12", "F12", 12.75, 0),
  K(4, 12, "F13", "F13", 14, 0),
  K(0, 13, "PrtSc", "PrintScreen", 15, 0),
  K(0, 14, "ScrLk", "ScrollLock", 16, 0),
  K(0, 15, "Pause", "Pause", 17, 0),
  K(1, 0, "`", "Backquote", 0, 1.1),
  K(1, 1, "1", "Digit1", 1, 1.1),
  K(1, 2, "2", "Digit2", 2, 1.1),
  K(1, 3, "3", "Digit3", 3, 1.1),
  K(1, 4, "4", "Digit4", 4, 1.1),
  K(1, 5, "5", "Digit5", 5, 1.1),
  K(1, 6, "6", "Digit6", 6, 1.1),
  K(1, 7, "7", "Digit7", 7, 1.1),
  K(1, 8, "8", "Digit8", 8, 1.1),
  K(1, 9, "9", "Digit9", 9, 1.1),
  K(1, 10, "0", "Digit0", 10, 1.1),
  K(1, 11, "-", "Minus", 11, 1.1),
  K(1, 12, "=", "Equal", 12, 1.1),
  K(1, 13, "Bksp", "Backspace", 13, 1.1, 2),
  K(1, 14, "Ins", "Insert", 15, 1.1),
  K(1, 15, "Home", "Home", 16, 1.1),
  K(3, 14, "PgUp", "PageUp", 17, 1.1),
  K(2, 0, "Tab", "Tab", 0, 2.1, 1.5),
  K(2, 1, "Q", "KeyQ", 1.5, 2.1),
  K(2, 2, "W", "KeyW", 2.5, 2.1),
  K(2, 3, "E", "KeyE", 3.5, 2.1),
  K(2, 4, "R", "KeyR", 4.5, 2.1),
  K(2, 5, "T", "KeyT", 5.5, 2.1),
  K(2, 6, "Y", "KeyY", 6.5, 2.1),
  K(2, 7, "U", "KeyU", 7.5, 2.1),
  K(2, 8, "I", "KeyI", 8.5, 2.1),
  K(2, 9, "O", "KeyO", 9.5, 2.1),
  K(2, 10, "P", "KeyP", 10.5, 2.1),
  K(2, 11, "[", "BracketLeft", 11.5, 2.1),
  K(2, 12, "]", "BracketRight", 12.5, 2.1),
  K(2, 13, "\\", "Backslash", 13.5, 2.1, 1.5),
  K(2, 14, "Del", "Delete", 15, 2.1),
  K(2, 15, "End", "End", 16, 2.1),
  K(3, 15, "PgDn", "PageDown", 17, 2.1),
  K(3, 0, "Caps", "CapsLock", 0, 3.1, 1.75),
  K(3, 1, "A", "KeyA", 1.75, 3.1),
  K(3, 2, "S", "KeyS", 2.75, 3.1),
  K(3, 3, "D", "KeyD", 3.75, 3.1),
  K(3, 4, "F", "KeyF", 4.75, 3.1),
  K(3, 5, "G", "KeyG", 5.75, 3.1),
  K(3, 6, "H", "KeyH", 6.75, 3.1),
  K(3, 7, "J", "KeyJ", 7.75, 3.1),
  K(3, 8, "K", "KeyK", 8.75, 3.1),
  K(3, 9, "L", "KeyL", 9.75, 3.1),
  K(3, 10, ";", "Semicolon", 10.75, 3.1),
  K(3, 11, "'", "Quote", 11.75, 3.1),
  K(3, 13, "Enter", "Enter", 12.75, 3.1, 2.25),
  K(4, 0, "Shift", "ShiftLeft", 0, 4.1, 2.25),
  K(4, 2, "Z", "KeyZ", 2.25, 4.1),
  K(4, 3, "X", "KeyX", 3.25, 4.1),
  K(4, 4, "C", "KeyC", 4.25, 4.1),
  K(4, 5, "V", "KeyV", 5.25, 4.1),
  K(4, 6, "B", "KeyB", 6.25, 4.1),
  K(4, 7, "N", "KeyN", 7.25, 4.1),
  K(4, 8, "M", "KeyM", 8.25, 4.1),
  K(4, 9, ",", "Comma", 9.25, 4.1),
  K(4, 10, ".", "Period", 10.25, 4.1),
  K(4, 11, "/", "Slash", 11.25, 4.1),
  K(4, 13, "Shift", "ShiftRight", 12.25, 4.1, 1.75),
  K(4, 14, "↑", "ArrowUp", 16, 4.1),
  K(5, 0, "Ctrl", "ControlLeft", 0, 5.1, 1.25),
  K(5, 1, "Win", "MetaLeft", 1.25, 5.1, 1.25),
  K(5, 2, "Alt", "AltLeft", 2.5, 5.1, 1.25),
  K(5, 5, "", "Space", 3.75, 5.1, 6.25),
  K(5, 9, "Alt", "AltRight", 10, 5.1, 1.25),
  K(5, 10, "Fn", [], 11.25, 5.1, 1.25),
  K(5, 11, "Win", "MetaRight", 12.5, 5.1, 1.25),
  K(5, 12, "Ctrl", "ControlRight", 13.75, 5.1, 1.25),
  K(5, 13, "←", "ArrowLeft", 15, 5.1),
  K(5, 14, "↓", "ArrowDown", 16, 5.1),
  K(5, 15, "→", "ArrowRight", 17, 5.1),
];

/** Board extent in key units. */
export const BOARD_W = 18;
export const BOARD_H = 6.1;

const byCode = new Map<string, Key>();
for (const k of KEYS) for (const code of k.codes) byCode.set(code, k);

/** The switch a `KeyboardEvent.code` lands on, or undefined for keys this board does not have. */
export function keyForCode(code: string): Key | undefined {
  return byCode.get(code);
}

export function keyId(k: Pick<Key, "r" | "c">): string {
  return `${k.r},${k.c}`;
}

/** Demo string the board types to itself when nobody is typing. */
export const DEMO_TEXT = "ritwickverma.dev";

/** Codes for a character of the demo string; letters, dot and nothing else. */
export function codesForChar(ch: string): string[] {
  if (/^[a-z]$/i.test(ch)) return [`Key${ch.toUpperCase()}`];
  if (ch === ".") return ["Period"];
  if (ch === " ") return ["Space"];
  return [];
}

/** The readout holds one line; older characters scroll off the left. */
export const LINE_MAX = 40;

/**
 * What a key does to the readout line. Printable keys append (the browser's
 * `key` already carries Shift and layout), Backspace deletes, Enter clears,
 * everything else leaves the line alone. Pure.
 */
export function applyKey(line: string, key: string, code: string): string {
  if (code === "Backspace") return line.slice(0, -1);
  if (code === "Enter" || code === "NumpadEnter") return "";
  if (key.length === 1) return (line + key).slice(-LINE_MAX);
  return line;
}

/** The character a tap on a cap inserts: letters lowercase, symbols as printed, Space a space. */
export function charForTap(k: Key): string | null {
  if (k.codes[0] === "Space") return " ";
  if (k.label.length === 1) return k.label.toLowerCase();
  return null;
}
