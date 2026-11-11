"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { KEYS, BOARD_W, BOARD_H, keyForCode } from "@/lib/crush80";
import { KEYMAP_TODAY, KEYMAP_BEFORE_FIX } from "@/lib/crush80Keymaps";
import { bindingAt, type KeymapData, type LayerEvent } from "@/lib/layers";
import { HOLDS, RIGHT_WIN_KEY, boardState, capName, cells, holdForKey, keyTitle, neighbour, toggleMac, verdict, type Cell, type Dir, type Hold } from "@/lib/layerBoard";
import { FigureFrame, Fold, Presets, Segmented, Toggle, Verdict } from "./kit";

// The real keymap, resolved by the real rule. Hold a layer key and every cap
// shows what it now does; a yellow cap changed, and its small number is the
// layer it was read from. The legends come from lib/legend.ts reading
// lib/crush80Keymaps.ts, which a test pins to config/crush80.keymap in the
// firmware repo.

type Which = "today" | "before";
const MAPS: Record<Which, KeymapData> = { today: KEYMAP_TODAY, before: KEYMAP_BEFORE_FIX };
const idx = (code: string) => KEYS.indexOf(keyForCode(code)!);

/** One-tap scenarios: the keymap, what is held, and the key worth looking at first. */
const SCENARIOS = {
  fn: { label: "Hold Fn", which: "today", hold: "fn", look: idx("KeyH") },
  num: { label: "Fn + Space", which: "today", hold: "num", look: idx("KeyJ") },
  rwin: { label: "Hold right Win", which: "today", hold: "rwin", look: idx("Home") },
  bug: { label: "Right Win, before the fix", which: "before", hold: "rwin", look: RIGHT_WIN_KEY },
} as const satisfies Record<string, { label: string; which: Which; hold: Hold; look: number }>;
type Scenario = keyof typeof SCENARIOS;
const PRESETS = (Object.keys(SCENARIOS) as Scenario[]).map((id) => ({ id, label: SCENARIOS[id].label }));

const HOLD_OPTIONS = HOLDS.map((h) => ({ id: h.id, label: h.hint ? `${h.label} (${h.hint})` : h.label }));
const WHICH_OPTIONS = [
  { id: "today" as const, label: `Today, ${KEYMAP_TODAY.commit}` },
  { id: "before" as const, label: `Before the fix, ${KEYMAP_BEFORE_FIX.commit}` },
];

function names(map: KeymapData, layers: readonly number[]): string {
  return layers.map((l) => map.layers[l].name).join(" and ");
}

function sentence(map: KeymapData, e: LayerEvent): string {
  if (e.kind === "hold") return `${keyTitle(e.key)} is &${bindingAt(map, e.from, e.key)} on layer ${e.from}, so layer ${e.layer} (${map.layers[e.layer].name}) turns on.`;
  const rule = names(map, map.conditional.find((c) => c.thenLayer === e.layer)?.ifLayers ?? []);
  return e.kind === "conditional-on"
    ? `The conditional layer sees ${rule} both on and turns layer ${e.layer} (${map.layers[e.layer].name}) on.`
    : `The conditional layer re-checks after every change: ${rule} are not both on, so it turns layer ${e.layer} (${map.layers[e.layer].name}) off again.`;
}

function Cap({ cell, selected, tab, onPick, onKeyDown, map, innerRef }: {
  cell: Cell;
  selected: boolean;
  tab: boolean;
  onPick: () => void;
  onKeyDown: (e: KeyboardEvent) => void;
  map: KeymapData;
  innerRef: (el: HTMLButtonElement | null) => void;
}) {
  const k = KEYS[cell.index];
  const lifted = cell.layer > 0;
  // The layer number is generated content, so it is drawn but not part of the button's text.
  const tone = lifted ? "border-fg bg-hit text-ink" : cell.legend.kind === "layer" ? "border-fg/30 text-accent" : "border-fg/30 text-fg/80";
  return (
    <button
      ref={innerRef}
      type="button"
      tabIndex={tab ? 0 : -1}
      aria-label={capName(map, cell)}
      aria-current={selected ? "true" : undefined}
      onClick={onPick}
      onFocus={onPick}
      onKeyDown={onKeyDown}
      data-layer={lifted ? cell.layer : undefined}
      className={`absolute flex flex-col justify-between after:self-end after:font-semibold after:content-[attr(data-layer)] overflow-hidden rounded-[3px] border p-px pl-[2px] text-left text-[0.75rem] leading-none tracking-tighter outline-none focus-visible:ring-2 focus-visible:ring-accent ${tone} ${selected ? "z-10 ring-2 ring-fg" : ""}`}
      style={{
        left: `calc(${(k.x / BOARD_W) * 100}% + 1.5px)`,
        top: `calc(${(k.y / BOARD_H) * 100}% + 1.5px)`,
        width: `calc(${(k.w / BOARD_W) * 100}% - 3px)`,
        height: `calc(${((k.h ?? 1) / BOARD_H) * 100}% - 3px)`,
      }}
    >
      <span>{cell.legend.cap}</span>
    </button>
  );
}

export default function KeymapLayers() {
  const [which, setWhich] = useState<Which>("today");
  const [latched, setLatched] = useState<Hold>("fn");
  const [down, setDown] = useState<Hold | null>(null);
  const [toggled, setToggled] = useState<number[]>([]);
  const [sel, setSel] = useState(SCENARIOS.fn.look);
  const [stop, setStop] = useState(SCENARIOS.fn.look);
  const caps = useRef<(HTMLButtonElement | null)[]>([]);
  const scroller = useRef<HTMLDivElement>(null);
  // Whether the board overflows its frame and how much of it is out of sight on each side; null until measured.
  const [edges, setEdges] = useState<{ over: boolean; left: boolean; right: boolean } | null>(null);

  // Phones show part of the board: start on the key the first scenario is about.
  useEffect(() => {
    const box = scroller.current;
    const cap = caps.current[SCENARIOS.fn.look];
    if (box && cap) box.scrollLeft = cap.offsetLeft + cap.offsetWidth / 2 - box.clientWidth / 2;
  }, []);

  // The cue follows the scroll: a fade on each side that has more board behind it, and the hint only while the board overflows.
  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    const read = () =>
      setEdges({
        over: box.scrollWidth > box.clientWidth + 1,
        left: box.scrollLeft > 1,
        right: box.scrollLeft + box.clientWidth < box.scrollWidth - 1,
      });
    read();
    box.addEventListener("scroll", read, { passive: true });
    const ro = new ResizeObserver(read);
    ro.observe(box);
    return () => {
      box.removeEventListener("scroll", read);
      ro.disconnect();
    };
  }, []);

  const map = MAPS[which];
  const hold = down ?? latched;
  const state = boardState(map, hold, toggled);
  const cs = cells(map, state);
  const mac = toggled.indexOf(1) >= 0;
  const v = verdict(map, state, cs, sel, hold !== "none");
  const active = (Object.keys(SCENARIOS) as Scenario[]).find((s) => SCENARIOS[s].which === which && SCENARIOS[s].hold === latched) ?? null;

  const pick = (i: number) => {
    setSel(i);
    setStop(i);
  };
  /** On a phone the board scrolls sideways: bring the key worth looking at to the middle. */
  const centre = (i: number) => {
    const box = scroller.current;
    const cap = caps.current[i];
    if (!box || !cap) return;
    box.scrollLeft = cap.offsetLeft + cap.offsetWidth / 2 - box.clientWidth / 2;
  };
  const scenario = (s: Scenario) => {
    const sc = SCENARIOS[s];
    setWhich(sc.which);
    setLatched(sc.hold);
    pick(sc.look);
    centre(sc.look);
  };
  const walk = (e: KeyboardEvent, i: number) => {
    const dir: Dir | null = e.key === "ArrowLeft" ? "left" : e.key === "ArrowRight" ? "right" : e.key === "ArrowUp" ? "up" : e.key === "ArrowDown" ? "down" : null;
    if (!dir) return;
    e.preventDefault();
    caps.current[neighbour(i, dir)]?.focus();
  };

  // The visitor's own F, N, W and P are held-down Fn, Fn+Space, Right Win and Right Win+Space; M is Fn+M.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if (e.key.toLowerCase() === "m") {
      setToggled((t) => toggleMac(map, t));
      return;
    }
    const h = holdForKey(e.key);
    if (h) setDown(h);
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (holdForKey(e.key) !== null) setDown(null);
  };

  const trace: { layer: number; binding: string | null; wins: boolean }[] = [];
  for (const l of state.active) {
    const b = bindingAt(map, l, sel);
    trace.push({ layer: l, binding: b, wins: l === cs[sel].layer });
    if (l === cs[sel].layer) break;
  }

  return (
    <FigureFrame
      claim="Hold Fn and the same keys mean something else."
      how="Press a button to hold keys down. Yellow keys changed. A layer is one full set of key meanings; the number is the layer each key came from."
      caption={
        <>
          It reads the keymap file as of commit {KEYMAP_TODAY.commit}, which a test pins to the firmware repo; changes made live in VIA or ZMK Studio are stored on the keyboard instead, and this does not know them.
        </>
      }
      about={
        <>
          <p>
            The rule is ZMK&rsquo;s: the board keeps a set of layers that are on, and a key is read from the highest one that has something on that key. A transparent key (<code className="font-mono text-[0.85em] [overflow-wrap:anywhere]">&amp;trans</code>) falls through to the layer below. Holding Fn turns layer 2 on, and Space on that layer turns on layer 4, so Fn then Space reads the number pad.
          </p>
          <p>
            &ldquo;Old file&rdquo; isldquo;Before the fix&ldquo;Old file&rdquo; isrdquo; is <code className="font-mono text-[0.85em] [overflow-wrap:anywhere]">config/crush80.keymap</code> at {KEYMAP_BEFORE_FIX.commit}, the commit before b18bf3c. It had a conditional layer, a rule ZMK re-checks after every layer change, which kept layer 3 off unless Mac mode and Fn were both on. Holding right Win turned layer 3 on and the rule turned it off at once.
          </p>
          <p>
            Both files are copied unedited into the site&rsquo;s tests, and a test parses them with a second reader and compares the result with the data this figure uses. Mac mode here is the resolver tapping M with Fn down, which is what the real key does. You can also hold F, N, W or P on your own keyboard (Fn, Fn+Space, right Win, right Win+Space) while the figure has focus, and tap M for Mac mode.
          </p>
        </>
      }
    >
      <Presets items={PRESETS} active={active} onPick={scenario} />

      <div>
      <div className="relative" onKeyDown={onKeyDown} onKeyUp={onKeyUp} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDown(null); }}>
        <div ref={scroller} role="region" aria-label="Crush 80 keys. Scrolls sideways on a narrow screen." tabIndex={0} className="relative overflow-x-auto rounded-md glass outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <div className="relative m-1 min-w-[640px] max-md:min-w-[720px]" style={{ aspectRatio: `${BOARD_W} / ${BOARD_H}` }}>
            {cs.map((c) => (
              <Cap
                key={c.index}
                cell={c}
                map={map}
                selected={c.index === sel}
                tab={c.index === stop}
                onPick={() => pick(c.index)}
                onKeyDown={(e) => walk(e, c.index)}
                innerRef={(el) => {
                  caps.current[c.index] = el;
                }}
              />
            ))}
          </div>
        </div>
        {/* The board scrolls sideways when it does not fit; a fade on the side with more of it says so. Until measured, the right one shows below a tablet. */}
        <div aria-hidden="true" className={`pointer-events-none absolute inset-y-0 right-0 w-8 rounded-r-md bg-gradient-to-l from-background to-transparent transition-opacity duration-[var(--dur-tap)] ${edges ? (edges.right ? "opacity-100" : "opacity-0") : "md:hidden"}`} />
        <div aria-hidden="true" className={`pointer-events-none absolute inset-y-0 left-0 w-8 rounded-l-md bg-gradient-to-r from-background to-transparent transition-opacity duration-[var(--dur-tap)] ${edges?.left ? "opacity-100" : "opacity-0"}`} />
      </div>
      {(edges ? edges.over : true) && <p className={`mt-1.5 text-[0.8125rem] leading-snug text-fg/75 ${edges ? "" : "md:hidden"}`}>Swipe the board sideways</p>}
      </div>

      <Verdict tone={v.tone} title={v.title}>
        {v.body}
      </Verdict>

      <div className="space-y-1">
        <Fold summary="More controls">
          <div className="space-y-3">
            <Segmented label="Hold" options={HOLD_OPTIONS} value={latched} onChange={setLatched} />
            <Toggle label="Mac mode" checked={mac} onChange={(on) => on !== mac && setToggled((t) => toggleMac(map, t))} />
            <Segmented label="Keymap" options={WHICH_OPTIONS} value={which} onChange={setWhich} />
          </div>
        </Fold>
        <Fold summary="How the keyboard reached that answer">
          <div className="space-y-3 text-[0.95rem]" data-testid="layer-log">
            <p>
              Layers on, highest wins:{" "}
              {state.active.map((l, i) => (
                <span key={l}>
                  {i > 0 && <span aria-hidden="true"> › </span>}
                  <span className="font-semibold">{l}</span> {map.layers[l].name}
                </span>
              ))}
            </p>
            {state.events.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-fg/85">
                {state.events.map((e, i) => (
                  <li key={i}>{sentence(map, e)}</li>
                ))}
              </ul>
            )}
            <div>
              <p>
                Looking up <span className="font-semibold">{KEYS[sel].label || "Space"}</span>, from the top:
              </p>
              <ol className="mt-1 font-mono text-[0.8rem] leading-relaxed">
                {trace.map((t) => (
                  <li key={t.layer} className={t.wins ? "text-fg" : "text-muted"}>
                    {t.layer} {map.layers[t.layer].name} {t.binding === null ? "&trans, falls through" : `&${t.binding}`}
                    {t.wins && " ← used"}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Fold>
      </div>
    </FigureFrame>
  );
}
