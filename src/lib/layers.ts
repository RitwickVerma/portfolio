// ZMK layer resolution, the part that decides what a key does.
//
// ZMK keeps a set of active layers. A key press is read from the highest active
// layer that has something other than `&trans` at that position; `&trans` falls
// through to the layer below. Holding a layer key (`&mo N`) turns layer N on,
// `&tog N` flips it, and a *conditional layer* (`zmk,conditional-layers`) is
// re-checked after every layer change and forces its `then-layer` on exactly
// when all its `if-layers` are on. That last rule once made the right Win key
// dead (crush80-zmk b18bf3c).
//
// Pure functions over the keymap as data (lib/crush80Keymaps.ts) so the figure,
// the tests and the build agree. Layer numbers are the ones VIA and ZMK Studio show.

export interface LayerData {
  name: string;
  /** Base lists all 88 bindings in order; the others list only what is not `&trans`. */
  keys: readonly string[] | Readonly<Record<number, string>>;
}

export interface ConditionalLayer {
  ifLayers: readonly number[];
  thenLayer: number;
}

export interface KeymapData {
  /** The crush80-zmk commit the data was taken from. */
  commit: string;
  layers: readonly LayerData[];
  conditional: readonly ConditionalLayer[];
}

/** The binding at a position on one layer, or null when the layer is transparent there. */
export function bindingAt(map: KeymapData, layer: number, index: number): string | null {
  const keys = map.layers[layer].keys as Readonly<Record<number, string>>;
  const b = keys[index];
  return b === undefined || b === "" || b === "trans" ? null : b;
}

export interface Resolved {
  /** The layer the key was read from. */
  layer: number;
  binding: string;
  /** Active layers above it that were transparent here, highest first. */
  passed: number[];
}

/** Read a key from the highest active layer that binds it. Base never falls through. */
export function resolve(map: KeymapData, active: ReadonlySet<number>, index: number): Resolved {
  const passed: number[] = [];
  for (let l = map.layers.length - 1; l >= 0; l--) {
    if (!active.has(l)) continue;
    const b = bindingAt(map, l, index);
    if (b === null) passed.push(l);
    else return { layer: l, binding: b, passed };
  }
  // Unreachable for a keymap whose Base binds every key (the tests check that).
  return { layer: 0, binding: "trans", passed };
}

export type LayerEvent =
  | { kind: "hold"; layer: number; key: number; from: number }
  | { kind: "conditional-on"; layer: number; ifLayers: readonly number[] }
  | { kind: "conditional-off"; layer: number; ifLayers: readonly number[] };

export interface LayerState {
  /** Active layers, highest first. */
  active: number[];
  events: LayerEvent[];
}

/** ZMK re-runs every conditional after each layer change. */
function settle(map: KeymapData, on: Set<number>, events: LayerEvent[]): void {
  for (const c of map.conditional) {
    const want = c.ifLayers.every((l) => on.has(l));
    if (want && !on.has(c.thenLayer)) {
      on.add(c.thenLayer);
      events.push({ kind: "conditional-on", layer: c.thenLayer, ifLayers: c.ifLayers });
    } else if (!want && on.has(c.thenLayer)) {
      on.delete(c.thenLayer);
      events.push({ kind: "conditional-off", layer: c.thenLayer, ifLayers: c.ifLayers });
    }
  }
}

/** The number a layer behaviour points at; names are looked up in the keymap's own layer list. */
export function layerArg(map: KeymapData, binding: string): { op: "mo" | "tog"; layer: number } | null {
  const m = /^(mo|tog) (\w+)$/.exec(binding);
  if (!m) return null;
  const arg = m[2];
  const named = map.layers.findIndex((l) => l.name.toUpperCase() === arg.toUpperCase());
  const layer = named >= 0 ? named : /^\d+$/.test(arg) ? Number(arg) : -1;
  return layer >= 0 ? { op: m[1] as "mo" | "tog", layer } : null;
}

/**
 * The layers that are on after the keys in `held` went down in that order, with
 * the layers in `toggled` already on. Each held key is read through the layers
 * that were active when it went down; `&mo` keys add their layer.
 */
export function layerState(map: KeymapData, held: readonly number[], toggled: readonly number[]): LayerState {
  const on = new Set<number>([0, ...toggled]);
  const events: LayerEvent[] = [];
  settle(map, on, events);
  for (const key of held) {
    const r = resolve(map, on, key);
    const op = layerArg(map, r.binding);
    if (op && op.op === "mo") {
      on.add(op.layer);
      events.push({ kind: "hold", layer: op.layer, key, from: r.layer });
      settle(map, on, events);
    }
  }
  return { active: [...on].sort((a, b) => b - a), events };
}

/** Tap a key while `held` is down. Only `&tog` changes anything that outlasts the tap. */
export function tapKey(map: KeymapData, held: readonly number[], toggled: readonly number[], index: number): number[] {
  const { active } = layerState(map, held, toggled);
  const r = resolve(map, new Set(active), index);
  const op = layerArg(map, r.binding);
  if (!op || op.op !== "tog") return [...toggled];
  return toggled.indexOf(op.layer) >= 0 ? toggled.filter((l) => l !== op.layer) : [...toggled, op.layer];
}

// ---------------------------------------------------------------------------
// Reading a .keymap file. This is the second implementation the data file is
// checked against; it understands only what config/crush80.keymap uses.

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/** Layers in file order (reserved ones have no bindings and are skipped) and conditional layers. */
export function parseKeymap(src: string): { layers: { name: string; bindings: string[] }[]; conditional: ConditionalLayer[] } {
  const text = stripComments(src);
  const defs = new Map<string, number>();
  for (const m of text.matchAll(/#define\s+(\w+)\s+(\d+)/g)) defs.set(m[1], Number(m[2]));
  const layers: { name: string; bindings: string[] }[] = [];
  for (const m of text.matchAll(/display-name\s*=\s*"([^"]+)";\s*bindings\s*=\s*<([^>]*)>/g)) {
    const bindings = m[2].split("&").slice(1).map((b) => b.trim());
    layers.push({ name: m[1], bindings });
  }
  const conditional: ConditionalLayer[] = [];
  for (const m of text.matchAll(/if-layers\s*=\s*<([^>]*)>;\s*then-layer\s*=\s*<([^>]*)>/g)) {
    conditional.push({ ifLayers: m[1].trim().split(/\s+/).map((n) => defs.get(n) ?? Number(n)), thenLayer: defs.get(m[2].trim()) ?? Number(m[2]) });
  }
  return { layers, conditional };
}

/** The binding list of a layer in `KeymapData`, expanded to 88 with "trans" where it is transparent. */
export function expandLayer(layer: LayerData, size = 88): string[] {
  const out: string[] = [];
  for (let i = 0; i < size; i++) {
    const keys = layer.keys as Readonly<Record<number, string>>;
    out.push(keys[i] === undefined || keys[i] === "" ? "trans" : keys[i]);
  }
  return out;
}
