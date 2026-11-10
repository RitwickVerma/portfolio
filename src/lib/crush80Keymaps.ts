// The Crush 80 keymap, as data. Generated from config/crush80.keymap in
// gitlab.com/ritwick7/crush80-zmk by an independent script (Python), then pinned:
// keymap.test.ts parses the verbatim copies in lib/fixtures/ with the TypeScript
// parser in lib/layers.ts and fails if either differs from what is below, or if a
// copy's SHA-256 is no longer the one the repo's commit has.
//
// Bindings keep ZMK's own spelling without the ampersand ("kp ESC", "mo FN").
// Base lists all 88 in matrix-transform order, which is the order of KEYS in
// crush80.ts. Every other layer lists only the keys that are not &trans.

import type { KeymapData } from "./layers";

/** config/crush80.keymap at 22e7de2, the tip of main when this was written. */
export const KEYMAP_TODAY: KeymapData = {
  commit: "22e7de2",
  layers: [
    { name: "Base", keys: ["kp ESC", "kp F1", "kp F2", "kp F3", "kp F4", "kp F5", "kp F6", "kp F7", "kp F8", "kp F9", "kp F10", "kp F11", "kp F12", "kp F13", "kp PSCRN", "kp SLCK", "kp PAUSE_BREAK", "kp GRAVE", "kp N1", "kp N2", "kp N3", "kp N4", "kp N5", "kp N6", "kp N7", "kp N8", "kp N9", "kp N0", "kp MINUS", "kp EQUAL", "kp BSPC", "kp INS", "kp HOME", "kp PG_UP", "kp TAB", "kp Q", "kp W", "kp E", "kp R", "kp T", "kp Y", "kp U", "kp I", "kp O", "kp P", "kp LBKT", "kp RBKT", "kp BSLH", "kp DEL", "kp END", "kp PG_DN", "kp CAPS", "kp A", "kp S", "kp D", "kp F", "kp G", "kp H", "kp J", "kp K", "kp L", "kp SEMI", "kp SQT", "kp RET", "kp LSHFT", "kp Z", "kp X", "kp C", "kp V", "kp B", "kp N", "kp M", "kp COMMA", "kp DOT", "kp FSLH", "kp RSHFT", "kp UP", "kp LCTRL", "kp LGUI", "kp LALT", "kp SPACE", "kp RALT", "mo FN", "mo MACFN", "kp RCTRL", "kp LEFT", "kp DOWN", "kp RIGHT"] },
    { name: "Mac", keys: {14: "kp LS(LG(N4))", 32: "kp LG(LEFT)", 49: "kp LG(RIGHT)", 78: "kp LALT", 79: "kp LGUI", 81: "kp RGUI"} },
    { name: "Fn", keys: {0: "bootloader", 12: "studio_unlock", 14: "kp C_MUTE", 15: "kp C_VOL_UP", 16: "kp C_BRI_UP", 18: "bt BT_SEL 0", 19: "bt BT_SEL 1", 20: "bt BT_SEL 2", 21: "out OUT_USB", 22: "out OUT_TOG", 23: "bt BT_SEL 3", 24: "bt BT_SEL 4", 28: "rgb RGB_SPD", 29: "rgb RGB_SPI", 30: "rgb RGB_TOG", 31: "kp C_PREV", 32: "kp C_PP", 33: "kp C_NEXT", 36: "kp LC(UP)", 40: "kp PG_UP", 41: "kp HOME", 43: "kp END", 45: "rgb RGB_HUD", 46: "rgb RGB_HUI", 47: "rgb RGB_EFF", 48: "bt BT_CLR", 49: "kp C_VOL_DN", 50: "kp C_BRI_DN", 52: "kp LC(LEFT)", 53: "kp LC(DOWN)", 54: "kp LC(RIGHT)", 57: "kp LEFT", 58: "kp DOWN", 59: "kp UP", 60: "kp RIGHT", 61: "kp DEL", 63: "rgb RGB_EFF", 66: "kp BSPC", 69: "rgb RGB_BAT", 70: "kp PG_DN", 71: "tog MAC", 76: "rgb RGB_BRI", 80: "mo NUM", 86: "rgb RGB_BRD"} },
    { name: "MacFn", keys: {13: "kp N0", 14: "kp N7", 15: "kp N8", 16: "kp N9", 31: "kp N4", 32: "kp N5", 33: "kp N6", 36: "kp LA(UP)", 41: "kp LG(LEFT)", 43: "kp LG(RIGHT)", 48: "kp N1", 49: "kp N2", 50: "kp N3", 52: "kp LA(LEFT)", 53: "kp LA(DOWN)", 54: "kp LA(RIGHT)", 80: "mo MACRO"} },
    { name: "Num", keys: {35: "kp LS(GRAVE)", 36: "kp LS(N1)", 37: "kp LS(N2)", 38: "kp LS(N3)", 39: "kp LS(N4)", 41: "kp N7", 42: "kp N8", 43: "kp N9", 44: "kp MINUS", 45: "kp LS(N8)", 46: "kp FSLH", 52: "kp LS(N9)", 53: "kp LS(N0)", 54: "kp LS(LBKT)", 55: "kp LS(RBKT)", 56: "kp LS(BSLH)", 58: "kp N4", 59: "kp N5", 60: "kp N6", 61: "kp LS(EQUAL)", 62: "kp EQUAL", 63: "kp RET", 65: "kp LBKT", 66: "kp RBKT", 67: "kp LS(COMMA)", 68: "kp LS(DOT)", 69: "kp BSLH", 70: "kp N0", 71: "kp N1", 72: "kp N2", 73: "kp N3", 74: "kp DOT"} },
    { name: "Macro", keys: {37: "vmacro 1", 44: "vmacro 0"} },
  ],
  conditional: [],
};

/** config/crush80.keymap at a4eaa5e: the file b18bf3c fixed, with the MacFn conditional layer. */
export const KEYMAP_BEFORE_FIX: KeymapData = {
  commit: "a4eaa5e",
  layers: [
    { name: "Base", keys: ["kp ESC", "kp F1", "kp F2", "kp F3", "kp F4", "kp F5", "kp F6", "kp F7", "kp F8", "kp F9", "kp F10", "kp F11", "kp F12", "kp F13", "kp PSCRN", "kp SLCK", "kp PAUSE_BREAK", "kp GRAVE", "kp N1", "kp N2", "kp N3", "kp N4", "kp N5", "kp N6", "kp N7", "kp N8", "kp N9", "kp N0", "kp MINUS", "kp EQUAL", "kp BSPC", "kp INS", "kp HOME", "kp PG_UP", "kp TAB", "kp Q", "kp W", "kp E", "kp R", "kp T", "kp Y", "kp U", "kp I", "kp O", "kp P", "kp LBKT", "kp RBKT", "kp BSLH", "kp DEL", "kp END", "kp PG_DN", "kp CAPS", "kp A", "kp S", "kp D", "kp F", "kp G", "kp H", "kp J", "kp K", "kp L", "kp SEMI", "kp SQT", "kp RET", "kp LSHFT", "kp Z", "kp X", "kp C", "kp V", "kp B", "kp N", "kp M", "kp COMMA", "kp DOT", "kp FSLH", "kp RSHFT", "kp UP", "kp LCTRL", "kp LGUI", "kp LALT", "kp SPACE", "kp RALT", "mo FN", "mo MACFN", "kp RCTRL", "kp LEFT", "kp DOWN", "kp RIGHT"] },
    { name: "Mac", keys: {14: "kp LS(LG(N4))", 32: "kp LG(LEFT)", 49: "kp LG(RIGHT)", 78: "kp LALT", 79: "kp LGUI", 81: "kp RGUI"} },
    { name: "Fn", keys: {0: "bootloader", 12: "studio_unlock", 14: "kp C_MUTE", 15: "kp C_VOL_UP", 16: "kp C_BRI_UP", 18: "bt BT_SEL 0", 19: "bt BT_SEL 1", 20: "bt BT_SEL 2", 21: "out OUT_USB", 22: "out OUT_TOG", 23: "bt BT_SEL 3", 24: "bt BT_SEL 4", 28: "rgb RGB_SPD", 29: "rgb RGB_SPI", 30: "rgb RGB_TOG", 31: "kp C_PREV", 32: "kp C_PP", 33: "kp C_NEXT", 36: "kp LC(UP)", 40: "kp PG_UP", 41: "kp HOME", 43: "kp END", 45: "rgb RGB_HUD", 46: "rgb RGB_HUI", 47: "rgb RGB_EFF", 48: "bt BT_CLR", 49: "kp C_VOL_DN", 50: "kp C_BRI_DN", 52: "kp LC(LEFT)", 53: "kp LC(DOWN)", 54: "kp LC(RIGHT)", 57: "kp LEFT", 58: "kp DOWN", 59: "kp UP", 60: "kp RIGHT", 61: "kp DEL", 63: "rgb RGB_EFF", 66: "kp BSPC", 69: "rgb RGB_BAT", 70: "kp PG_DN", 71: "tog MAC", 76: "rgb RGB_BRI", 80: "mo NUM", 86: "rgb RGB_BRD"} },
    { name: "MacFn", keys: {13: "kp N0", 14: "kp N7", 15: "kp N8", 16: "kp N9", 31: "kp N4", 32: "kp N5", 33: "kp N6", 36: "kp LA(UP)", 41: "kp LG(LEFT)", 43: "kp LG(RIGHT)", 48: "kp N1", 49: "kp N2", 50: "kp N3", 52: "kp LA(LEFT)", 53: "kp LA(DOWN)", 54: "kp LA(RIGHT)", 80: "mo MACRO"} },
    { name: "Num", keys: {35: "kp LS(GRAVE)", 36: "kp LS(N1)", 37: "kp LS(N2)", 38: "kp LS(N3)", 39: "kp LS(N4)", 41: "kp N7", 42: "kp N8", 43: "kp N9", 44: "kp MINUS", 45: "kp LS(N8)", 46: "kp FSLH", 52: "kp LS(N9)", 53: "kp LS(N0)", 54: "kp LS(LBKT)", 55: "kp LS(RBKT)", 56: "kp LS(BSLH)", 58: "kp N4", 59: "kp N5", 60: "kp N6", 61: "kp LS(EQUAL)", 62: "kp EQUAL", 63: "kp RET", 65: "kp LBKT", 66: "kp RBKT", 67: "kp LS(COMMA)", 68: "kp LS(DOT)", 69: "kp BSLH", 70: "kp N0", 71: "kp N1", 72: "kp N2", 73: "kp N3", 74: "kp DOT"} },
    { name: "Macro", keys: {44: "vmacro 0"} },
  ],
  conditional: [{ ifLayers: [1, 2], thenLayer: 3 }],
};
