// What a ZMK binding is called on a keycap and in a sentence. Covers exactly the
// behaviours config/crush80.keymap uses; anything else shows its own spelling,
// so an unknown binding is visible rather than silently renamed.

import { layerArg, type KeymapData } from "./layers";

export type LegendKind = "key" | "layer" | "other";

export interface Legend {
  /** Short enough for a 1u cap. */
  cap: string;
  /** One sentence for the readout and the accessible name. */
  text: string;
  /** "layer" keys lead somewhere (blue); the rest do something. */
  kind: LegendKind;
}

const NAMES: Record<string, string> = {
  ESC: "Esc", GRAVE: "`", MINUS: "-", EQUAL: "=", BSPC: "Bksp", INS: "Ins", HOME: "Home", PG_UP: "PgUp", TAB: "Tab",
  LBKT: "[", RBKT: "]", BSLH: "\\", DEL: "Del", END: "End", PG_DN: "PgDn", CAPS: "Caps", SEMI: ";", SQT: "'",
  RET: "Enter", LSHFT: "Shift", RSHFT: "Shift", COMMA: ",", DOT: ".", FSLH: "/", UP: "↑", DOWN: "↓", LEFT: "←", RIGHT: "→",
  LCTRL: "Ctrl", RCTRL: "Ctrl", LGUI: "Win", RGUI: "Win", LALT: "Alt", RALT: "Alt", SPACE: "Space",
  PSCRN: "PrtSc", SLCK: "ScrLk", PAUSE_BREAK: "Pause",
  C_MUTE: "Mute", C_VOL_UP: "Vol+", C_VOL_DN: "Vol-", C_BRI_UP: "Bri+", C_BRI_DN: "Bri-", C_PREV: "Prev", C_PP: "Play", C_NEXT: "Next",
};

/** Keys whose Shifted character is a different cap on a US layout. */
const SHIFTED: Record<string, string> = {
  GRAVE: "~", N1: "!", N2: "@", N3: "#", N4: "$", N8: "*", N9: "(", N0: ")", LBKT: "{", RBKT: "}", BSLH: "|", COMMA: "<", DOT: ">", EQUAL: "+",
};

const MODS: Record<string, { cap: string; word: string }> = {
  LC: { cap: "⌃", word: "Ctrl" },
  LS: { cap: "⇧", word: "Shift" },
  LA: { cap: "⌥", word: "Alt" },
  LG: { cap: "⌘", word: "Win" },
};

function keyName(code: string, mac: boolean): string {
  if (mac && (code === "LALT" || code === "RALT")) return "Opt";
  if (mac && (code === "LGUI" || code === "RGUI")) return "Cmd";
  if (NAMES[code]) return NAMES[code];
  if (/^N\d$/.test(code)) return code.slice(1);
  if (/^[A-Z]$/.test(code) || /^F\d{1,2}$/.test(code)) return code;
  return code;
}

/** `LS(LG(N4))` → mods LS, LG and key N4. */
function unwrap(code: string): { mods: string[]; key: string } {
  const mods: string[] = [];
  let rest = code;
  for (;;) {
    const m = /^(LC|LS|LA|LG)\((.*)\)$/.exec(rest);
    if (!m) break;
    mods.push(m[1]);
    rest = m[2];
  }
  return { mods, key: rest };
}

function keyLegend(code: string, mac: boolean): Legend {
  const { mods, key } = unwrap(code);
  if (mods.length === 0) {
    const n = keyName(key, mac);
    return { cap: n, text: n === "Space" ? "Sends Space" : `Sends ${n}`, kind: "key" };
  }
  if (mods.length === 1 && mods[0] === "LS" && SHIFTED[key]) {
    return { cap: SHIFTED[key], text: `Sends ${SHIFTED[key]} (Shift+${keyName(key, mac)})`, kind: "key" };
  }
  const word = (m: string) => (m === "LG" ? (mac ? "Cmd" : "Win") : m === "LA" && mac ? "Opt" : MODS[m].word);
  const cap = mods.map((m) => MODS[m].cap).join("") + keyName(key, mac);
  return { cap, text: `Sends ${[...mods.map(word), keyName(key, mac)].join("+")}`, kind: "key" };
}

const RGB: Record<string, [string, string]> = {
  RGB_TOG: ["RGB", "Lighting on or off"],
  RGB_SPD: ["Spd-", "Lighting effect slower"],
  RGB_SPI: ["Spd+", "Lighting effect faster"],
  RGB_HUD: ["Hue-", "Lighting hue down"],
  RGB_HUI: ["Hue+", "Lighting hue up"],
  RGB_EFF: ["Fx", "Next lighting effect"],
  RGB_BAT: ["Batt", "Shows the battery level"],
  RGB_BRI: ["Lum+", "Lighting brighter"],
  RGB_BRD: ["Lum-", "Lighting dimmer"],
};

/** The legend for one binding as it sits on `layer` of `map`. */
export function legend(map: KeymapData, binding: string, layer: number): Legend {
  const mac = map.layers[layer].name === "Mac" || map.layers[layer].name === "MacFn";
  const [name, ...args] = binding.split(" ");
  const lay = layerArg(map, binding);
  if (lay) {
    const n = map.layers[lay.layer].name;
    return lay.op === "mo"
      ? { cap: n, text: `Holds layer ${lay.layer}, ${n}, while it is down`, kind: "layer" }
      : { cap: n, text: `Switches layer ${lay.layer}, ${n}, on or off`, kind: "layer" };
  }
  switch (name) {
    case "kp":
      return keyLegend(args[0], mac);
    case "bt": {
      if (args[0] === "BT_SEL") return { cap: `BT${Number(args[1]) + 1}`, text: `Switches to Bluetooth profile ${Number(args[1]) + 1}`, kind: "other" };
      if (args[0] === "BT_CLR") return { cap: "BTclr", text: "Clears the pairing of the current Bluetooth profile", kind: "other" };
      break;
    }
    case "out":
      if (args[0] === "OUT_USB") return { cap: "USB", text: "Sends keys over USB", kind: "other" };
      if (args[0] === "OUT_TOG") return { cap: "U/B", text: "Switches output between USB and Bluetooth", kind: "other" };
      break;
    case "rgb":
      if (RGB[args[0]]) return { cap: RGB[args[0]][0], text: RGB[args[0]][1], kind: "other" };
      break;
    case "bootloader":
      return { cap: "Rec", text: "Recovery: erases the image header and resets, so MCUboot waits on USB", kind: "other" };
    case "studio_unlock":
      return { cap: "Stud", text: "Unlocks ZMK Studio", kind: "other" };
    case "vmacro":
      return { cap: `M${args[0]}`, text: `Plays macro ${args[0]}`, kind: "other" };
    default:
  }
  return { cap: binding, text: `&${binding}`, kind: "other" };
}
