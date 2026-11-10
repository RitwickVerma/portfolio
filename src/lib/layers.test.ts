import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { KEYS, keyForCode } from "./crush80";
import { KEYMAP_TODAY, KEYMAP_BEFORE_FIX } from "./crush80Keymaps";
import { bindingAt, expandLayer, layerArg, layerState, parseKeymap, resolve, tapKey, type KeymapData } from "./layers";
import { legend } from "./legend";
import { FN_KEY, RIGHT_WIN_KEY, SPACE_KEY, M_KEY, HOLDS, boardState, cells, capName, verdict, holdForKey, holdKeys, neighbour, toggleMac } from "./layerBoard";

// The two copies of config/crush80.keymap in lib/fixtures are byte for byte what
// gitlab.com/ritwick7/crush80-zmk has at those commits (`git show <sha>:config/crush80.keymap | sha256sum`).
const FILES = [
  { map: KEYMAP_TODAY, file: "crush80-22e7de2.keymap", sha256: "2415a3ca2597e0e720e7251fdcf78f143ef59b5d63562f57e98423c9088f4c5f" },
  { map: KEYMAP_BEFORE_FIX, file: "crush80-a4eaa5e.keymap", sha256: "2b51e2dd73eba54d1bd1eb7dae75410a29799a84784f6b91f97bc971dd1b24db" },
];
const read = (file: string) => readFileSync(join(__dirname, "fixtures", file), "utf8");

const idx = (code: string) => KEYS.indexOf(keyForCode(code)!);

describe("the keymap data is pinned to the repo's keymap", () => {
  for (const { map, file, sha256 } of FILES) {
    it(`${file}: copy is unedited (sha256 of ${map.commit}:config/crush80.keymap)`, () => {
      expect(createHash("sha256").update(read(file)).digest("hex")).toBe(sha256);
    });

    it(`${file}: the TypeScript parser reads exactly the data in crush80Keymaps.ts`, () => {
      const parsed = parseKeymap(read(file));
      expect(parsed.layers.map((l) => l.name)).toEqual(map.layers.map((l) => l.name));
      expect(parsed.layers.map((l) => l.bindings.length)).toEqual(map.layers.map(() => 88));
      parsed.layers.forEach((l, i) => {
        expect(expandLayer(map.layers[i]).map((b) => b.replace(/^&/, "")), `layer ${i} ${l.name}`).toEqual(
          l.bindings.map((b) => b.replace(/^&/, "")),
        );
      });
      expect(parsed.conditional).toEqual(map.conditional);
    });
  }

  it("today has six layers in ZMK's order and no conditional layer; the old file has the MacFn rule", () => {
    expect(KEYMAP_TODAY.layers.map((l) => l.name)).toEqual(["Base", "Mac", "Fn", "MacFn", "Num", "Macro"]);
    expect(KEYMAP_TODAY.conditional).toEqual([]);
    expect(KEYMAP_BEFORE_FIX.conditional).toEqual([{ ifLayers: [1, 2], thenLayer: 3 }]);
  });

  it("Base binds every key, and in the order of KEYS (plain keys carry the cap's own legend)", () => {
    for (let i = 0; i < 88; i++) {
      const b = bindingAt(KEYMAP_TODAY, 0, i);
      expect(b, `index ${i}`).not.toBeNull();
      if (b!.startsWith("kp ")) expect(legend(KEYMAP_TODAY, b!, 0).cap, `index ${i}`).toBe(KEYS[i].label || "Space");
    }
    expect(bindingAt(KEYMAP_TODAY, 0, FN_KEY)).toBe("mo FN");
    expect(bindingAt(KEYMAP_TODAY, 0, RIGHT_WIN_KEY)).toBe("mo MACFN");
    expect(bindingAt(KEYMAP_TODAY, 2, SPACE_KEY)).toBe("mo NUM");
    expect(bindingAt(KEYMAP_TODAY, 2, M_KEY)).toBe("tog MAC");
  });
});

describe("resolution", () => {
  const at = (map: KeymapData, hold: Parameters<typeof boardState>[1], toggled: number[], code: string) => {
    const s = boardState(map, hold, toggled);
    return resolve(map, new Set(s.active), idx(code));
  };

  it("with nothing held every key is its base binding", () => {
    expect(boardState(KEYMAP_TODAY, "none", []).active).toEqual([0]);
    expect(at(KEYMAP_TODAY, "none", [], "KeyH")).toMatchObject({ layer: 0, binding: "kp H", passed: [] });
  });

  it("Fn turns HJKL into arrows", () => {
    expect(boardState(KEYMAP_TODAY, "fn", []).active).toEqual([2, 0]);
    expect(at(KEYMAP_TODAY, "fn", [], "KeyH")).toMatchObject({ layer: 2, binding: "kp LEFT" });
    expect(at(KEYMAP_TODAY, "fn", [], "KeyL")).toMatchObject({ layer: 2, binding: "kp RIGHT" });
    // F1 is not bound on Fn: transparent, so the base layer answers.
    expect(at(KEYMAP_TODAY, "fn", [], "F1")).toMatchObject({ layer: 0, binding: "kp F1", passed: [2] });
  });

  it("Fn then Space holds Num on top; Num's transparent keys fall through to Fn", () => {
    expect(boardState(KEYMAP_TODAY, "num", []).active).toEqual([4, 2, 0]);
    expect(at(KEYMAP_TODAY, "num", [], "KeyJ")).toMatchObject({ layer: 4, binding: "kp N4" });
    expect(at(KEYMAP_TODAY, "num", [], "KeyH")).toMatchObject({ layer: 2, binding: "kp LEFT", passed: [4] });
    expect(at(KEYMAP_TODAY, "num", [], "F1")).toMatchObject({ layer: 0, passed: [4, 2] });
  });

  it("Space alone is only Space: the Num key exists on the Fn layer, not on Base", () => {
    expect(at(KEYMAP_TODAY, "none", [], "Space").binding).toBe("kp SPACE");
    // Order matters: Space went down first, so it was read from Base and holds nothing.
    expect(layerState(KEYMAP_TODAY, [SPACE_KEY, FN_KEY], []).active).toEqual([2, 0]);
  });

  it("right Win holds MacFn (the numpad on the nav cluster) and, with Space, Macro", () => {
    expect(boardState(KEYMAP_TODAY, "rwin", []).active).toEqual([3, 0]);
    expect(at(KEYMAP_TODAY, "rwin", [], "Home")).toMatchObject({ layer: 3, binding: "kp N5" });
    expect(boardState(KEYMAP_TODAY, "macro", []).active).toEqual([5, 3, 0]);
    expect(at(KEYMAP_TODAY, "macro", [], "KeyP")).toMatchObject({ layer: 5, binding: "vmacro 0" });
  });

  it("Fn+M toggles Mac through the resolver, and Mac swaps Alt and Win and rewrites Home", () => {
    const on = toggleMac(KEYMAP_TODAY, []);
    expect(on).toEqual([1]);
    expect(toggleMac(KEYMAP_TODAY, on)).toEqual([]);
    expect(boardState(KEYMAP_TODAY, "none", on).active).toEqual([1, 0]);
    expect(at(KEYMAP_TODAY, "none", on, "AltLeft")).toMatchObject({ layer: 1, binding: "kp LGUI" });
    expect(at(KEYMAP_TODAY, "none", on, "Home")).toMatchObject({ layer: 1, binding: "kp LG(LEFT)" });
    // Mac sits below Fn, so it cannot hide Fn's keys.
    expect(at(KEYMAP_TODAY, "fn", on, "KeyH")).toMatchObject({ layer: 2, binding: "kp LEFT" });
    // The right Win key is left alone by Mac, so the numpad survives Mac mode.
    expect(at(KEYMAP_TODAY, "none", on, "MetaRight")).toMatchObject({ layer: 0, binding: "mo MACFN" });
    expect(boardState(KEYMAP_TODAY, "rwin", on).active).toEqual([3, 1, 0]);
  });

  it("tapping a non-toggle key changes nothing", () => {
    expect(tapKey(KEYMAP_TODAY, [FN_KEY], [], idx("KeyH"))).toEqual([]);
  });
});

describe("the conditional layer that killed the right Win key (b18bf3c)", () => {
  it("held right Win turns layer 3 on and the rule turns it straight off again", () => {
    const s = boardState(KEYMAP_BEFORE_FIX, "rwin", []);
    expect(s.active).toEqual([0]);
    expect(s.events).toEqual([
      { kind: "hold", layer: 3, key: RIGHT_WIN_KEY, from: 0 },
      { kind: "conditional-off", layer: 3, ifLayers: [1, 2] },
    ]);
    expect(resolve(KEYMAP_BEFORE_FIX, new Set(s.active), idx("Home"))).toMatchObject({ layer: 0, binding: "kp HOME" });
  });

  it("so the macro layer behind it is unreachable too", () => {
    expect(boardState(KEYMAP_BEFORE_FIX, "macro", []).active).toEqual([0]);
  });

  it("in Mac mode, Fn alone switched MacFn on (the rule's own condition)", () => {
    const s = boardState(KEYMAP_BEFORE_FIX, "fn", [1]);
    expect(s.active).toEqual([3, 2, 1, 0]);
    expect(s.events.map((e) => e.kind)).toEqual(["hold", "conditional-on"]);
    // Mac mode with Fn held: MacFn's numpad keys sit above Fn's arrows.
    expect(resolve(KEYMAP_BEFORE_FIX, new Set(s.active), idx("Home")).layer).toBe(3);
  });

  it("the same keys after the fix: right Win works with and without Mac", () => {
    expect(boardState(KEYMAP_TODAY, "rwin", []).active).toEqual([3, 0]);
    expect(boardState(KEYMAP_TODAY, "rwin", [1]).active).toEqual([3, 1, 0]);
    expect(boardState(KEYMAP_TODAY, "fn", [1]).active).toEqual([2, 1, 0]);
  });
});

describe("legends and the board model", () => {
  it("names layer behaviours by the keymap's own layer names", () => {
    expect(layerArg(KEYMAP_TODAY, "mo MACFN")).toEqual({ op: "mo", layer: 3 });
    expect(layerArg(KEYMAP_TODAY, "tog MAC")).toEqual({ op: "tog", layer: 1 });
    expect(layerArg(KEYMAP_TODAY, "kp A")).toBeNull();
    expect(legend(KEYMAP_TODAY, "mo NUM", 2)).toMatchObject({ cap: "Num", kind: "layer" });
  });

  it("writes Shifted symbols, modifiers and Mac names", () => {
    expect(legend(KEYMAP_TODAY, "kp LS(N9)", 4).cap).toBe("(");
    expect(legend(KEYMAP_TODAY, "kp LC(LEFT)", 2)).toMatchObject({ cap: "⌃←", text: "Sends Ctrl+←" });
    expect(legend(KEYMAP_TODAY, "kp LA(UP)", 3).text).toBe("Sends Opt+↑");
    expect(legend(KEYMAP_TODAY, "kp LS(LG(N4))", 1)).toMatchObject({ cap: "⇧⌘4", text: "Sends Shift+Cmd+4" });
    expect(legend(KEYMAP_TODAY, "bt BT_SEL 4", 2).cap).toBe("BT5");
    expect(legend(KEYMAP_TODAY, "weird thing", 0).cap).toBe("weird thing");
  });

  it("every binding in both keymaps gets a short cap, none of them its raw spelling", () => {
    for (const map of [KEYMAP_TODAY, KEYMAP_BEFORE_FIX]) {
      map.layers.forEach((l, li) => {
        for (let i = 0; i < 88; i++) {
          const b = bindingAt(map, li, i);
          if (b === null) continue;
          const lg = legend(map, b, li);
          expect(lg.cap, `${l.name} ${i} ${b}`).not.toBe(b);
          expect(lg.cap.length, `${l.name} ${i} ${b}`).toBeLessThanOrEqual(6);
        }
      });
    }
  });

  it("cells name the layer each cap came from", () => {
    const s = boardState(KEYMAP_TODAY, "num", []);
    const c = cells(KEYMAP_TODAY, s);
    expect(c).toHaveLength(88);
    expect(capName(KEYMAP_TODAY, c[idx("KeyH")])).toBe("← on the H key: Sends ←, from layer 2, Fn");
    expect(capName(KEYMAP_TODAY, c[idx("KeyJ")])).toBe("4 on the J key: Sends 4, from layer 4, Num");
    expect(capName(KEYMAP_TODAY, c[idx("KeyA")])).toBe("( on the A key: Sends ( (Shift+9), from layer 4, Num");
  });

  it("hold shortcuts and arrow-key walking", () => {
    expect(holdForKey("f")).toBe("fn");
    expect(holdForKey("N")).toBe("num");
    expect(holdForKey("x")).toBeNull();
    expect(holdKeys("macro")).toEqual([RIGHT_WIN_KEY, SPACE_KEY]);
    expect(HOLDS.map((h) => h.id)).toEqual(["none", "fn", "num", "rwin", "macro"]);
    const q = idx("KeyQ");
    expect(neighbour(q, "right")).toBe(idx("KeyW"));
    expect(neighbour(idx("Escape"), "left")).toBe(idx("Escape"));
    expect(neighbour(idx("Escape"), "up")).toBe(idx("Escape"));
    expect(KEYS[neighbour(q, "up")].label).toBe("1");
    expect(neighbour(q, "down")).toBe(idx("KeyA"));
    expect(neighbour(idx("Space"), "up")).toBe(idx("KeyB"));
  });
});

describe("the verdict sentence", () => {
  const v = (map: KeymapData, hold: Parameters<typeof boardState>[1], toggled: number[], code: string) => {
    const state = boardState(map, hold, toggled);
    return verdict(map, state, cells(map, state), idx(code), hold !== "none");
  };

  it("is plain when nothing is held", () => {
    expect(v(KEYMAP_TODAY, "none", [], "KeyH")).toMatchObject({ tone: "plain", changed: 0, title: "Nothing is held, so every key does what its cap says." });
  });

  it("counts the keys Fn changes and says what the picked one became", () => {
    const r = v(KEYMAP_TODAY, "fn", [], "KeyH");
    const state = boardState(KEYMAP_TODAY, "fn", []);
    const expected = cells(KEYMAP_TODAY, state).filter((c) => c.layer > 0).length;
    expect(r.changed).toBe(expected);
    expect(r.changed).toBeGreaterThan(30);
    expect(r.title).toBe(`${expected} of 88 keys now mean something else.`);
    expect(r.body).toBe("The H key sends ← (layer 2, Fn).");
    expect(r.tone).toBe("plain");
  });

  it("warns only for the computed failure, and names the key and the rule", () => {
    const bad = v(KEYMAP_BEFORE_FIX, "rwin", [], "Home");
    expect(bad.tone).toBe("warn");
    expect(bad.title).toBe("Right Win does nothing: layer 3 switched itself off.");
    expect(bad.body).toContain("unless Mac and Fn are both on");
    expect(bad.body).toContain("The Home key sends Home (base layer).");
    expect(v(KEYMAP_TODAY, "rwin", [], "Home").tone).toBe("plain");
    expect(v(KEYMAP_BEFORE_FIX, "fn", [], "KeyH").tone).toBe("plain");
  });
});
