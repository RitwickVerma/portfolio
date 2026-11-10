// The model behind the layer figure: which keys the visitor holds, what every
// cap on the board resolves to, and the arrow-key walk between caps. Pure.

import { KEYS, keyForCode, keyId } from "./crush80";
import { bindingAt, layerState, resolve, tapKey, type KeymapData, type LayerState } from "./layers";
import { legend, type Legend } from "./legend";

function indexOf(r: number, c: number): number {
  return KEYS.findIndex((k) => k.r === r && k.c === c);
}

/** The keys that hold layers on the real board, by index into KEYS. */
export const FN_KEY = indexOf(5, 10);
export const RIGHT_WIN_KEY = indexOf(5, 11);
export const SPACE_KEY = indexOf(5, 5);
export const M_KEY = KEYS.indexOf(keyForCode("KeyM")!);

export type Hold = "none" | "fn" | "num" | "rwin" | "macro";

export const HOLDS: { id: Hold; label: string; keys: readonly number[]; hint: string }[] = [
  { id: "none", label: "Nothing", keys: [], hint: "" },
  { id: "fn", label: "Fn", keys: [FN_KEY], hint: "F" },
  { id: "num", label: "Fn + Space", keys: [FN_KEY, SPACE_KEY], hint: "N" },
  { id: "rwin", label: "Right Win", keys: [RIGHT_WIN_KEY], hint: "W" },
  { id: "macro", label: "Right Win + Space", keys: [RIGHT_WIN_KEY, SPACE_KEY], hint: "P" },
];

export function holdKeys(hold: Hold): readonly number[] {
  return HOLDS.find((h) => h.id === hold)!.keys;
}

/** What the real keyboard's own F, N, W and P do while the figure has focus. */
export function holdForKey(key: string): Hold | null {
  const h = HOLDS.find((x) => x.hint !== "" && x.hint.toLowerCase() === key.toLowerCase());
  return h ? h.id : null;
}

/** Fn+M: Mac mode is a toggle, so it is the resolver tapping M with Fn down, not a flag. */
export function toggleMac(map: KeymapData, toggled: readonly number[]): number[] {
  return tapKey(map, [FN_KEY], toggled, M_KEY);
}

export interface Cell {
  index: number;
  legend: Legend;
  /** The layer the binding was read from. */
  layer: number;
  binding: string;
  /** Active layers above `layer` that were transparent here. */
  passed: number[];
}

export function cells(map: KeymapData, state: LayerState): Cell[] {
  const active = new Set(state.active);
  return KEYS.map((_, index) => {
    const r = resolve(map, active, index);
    return { index, legend: legend(map, r.binding, r.layer), layer: r.layer, binding: r.binding, passed: r.passed };
  });
}

export function boardState(map: KeymapData, hold: Hold, toggled: readonly number[]): LayerState {
  return layerState(map, holdKeys(hold), toggled);
}

/** Accessible name of a cap: what it is, what it does, where that came from. */
export function capName(map: KeymapData, cell: Cell): string {
  const k = KEYS[cell.index];
  const phys = k.label || "Space";
  const from = cell.layer === 0 ? "the base layer" : `layer ${cell.layer}, ${map.layers[cell.layer].name}`;
  // Starts with the visible legend, so the name contains what is drawn on the cap.
  return `${cell.legend.cap} on the ${phys} key: ${cell.legend.text}, from ${from}`;
}

export type Dir = "left" | "right" | "up" | "down";

const centre = (i: number) => KEYS[i].x + KEYS[i].w / 2;

/** The cap an arrow key moves to: along the row, or to the nearest cap by centre in the next row. */
export function neighbour(from: number, dir: Dir): number {
  const y = KEYS[from].y;
  if (dir === "left" || dir === "right") {
    const row = KEYS.map((k, i) => ({ k, i })).filter((e) => e.k.y === y).sort((a, b) => a.k.x - b.k.x);
    const at = row.findIndex((e) => e.i === from);
    const to = Math.max(0, Math.min(row.length - 1, at + (dir === "left" ? -1 : 1)));
    return row[to].i;
  }
  const ys = [...new Set(KEYS.map((k) => k.y))].sort((a, b) => a - b);
  const at = ys.indexOf(y);
  const ny = ys[at + (dir === "up" ? -1 : 1)];
  if (ny === undefined) return from;
  let best = from;
  let dist = Infinity;
  KEYS.forEach((k, i) => {
    if (k.y !== ny) return;
    const d = Math.abs(centre(i) - centre(from));
    if (d < dist) {
      dist = d;
      best = i;
    }
  });
  return best;
}

/** What a held layer key is called to a visitor. */
export function keyTitle(i: number): string {
  return i === FN_KEY ? "Fn" : i === RIGHT_WIN_KEY ? "Right Win" : i === SPACE_KEY ? "Space" : KEYS[i].label;
}

function from(map: KeymapData, layer: number): string {
  return layer === 0 ? "base layer" : `layer ${layer}, ${map.layers[layer].name}`;
}

export interface Verdict {
  tone: "warn" | "plain";
  title: string;
  body: string;
  /** Keys whose meaning differs from the base layer. */
  changed: number;
}

/**
 * The outcome in a sentence. `warn` only for a computed failure: a layer key was
 * held, the layer it asks for turned on, and a conditional layer turned it off again.
 */
export function verdict(map: KeymapData, state: LayerState, cs: readonly Cell[], picked: number, anyHeld: boolean): Verdict {
  const changed = cs.filter((c) => c.binding !== bindingAt(map, 0, c.index)).length;
  const p = cs[picked];
  const lower = p.legend.text.charAt(0).toLowerCase() + p.legend.text.slice(1);
  const tail = `The ${keyTitle(picked)} key ${lower} (${from(map, p.layer)}).`;
  const killed = state.events.find(
    (e) => e.kind === "conditional-off" && state.events.some((h) => h.kind === "hold" && h.layer === e.layer),
  );
  if (killed && killed.kind === "conditional-off") {
    const hold = state.events.find((h) => h.kind === "hold" && h.layer === killed.layer);
    const rule = killed.ifLayers.map((l) => map.layers[l].name).join(" and ");
    return {
      tone: "warn",
      title: `${hold && hold.kind === "hold" ? keyTitle(hold.key) : "The key"} does nothing: layer ${killed.layer} switched itself off.`,
      body: `The keymap had a rule that keeps layer ${killed.layer} (${map.layers[killed.layer].name}) off unless ${rule} are both on, and it checks after every change. ${tail}`,
      changed,
    };
  }
  if (!anyHeld && changed === 0) return { tone: "plain", title: "Nothing is held, so every key does what its cap says.", body: tail, changed };
  return { tone: "plain", title: `${changed} of 88 keys now mean something else.`, body: tail, changed };
}

export { keyId };
