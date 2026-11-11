import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { OG_FIGURES, ogFigure, PANEL_W, PANEL_H } from "./ogFigures";
import { notes } from "./notes";
import { UNIVERSES, SPY, pctText } from "./plutusResults";
import { KEYS } from "./crush80";
import { KEYMAP_TODAY } from "./crush80Keymaps";
import { boardState, cells } from "./layerBoard";
import { bindingAt } from "./layers";
import { services } from "./data";
import { alignDetail } from "./chordAlign";
import { GRACE_ROWS, GRACE_LINES } from "./chordAlignFixture";
import { initialFigure, ruleSentence } from "./kwinFigure";
import { ALL_ON, REACH, replay, sec } from "./shutupStreams";
import { EXAMPLE, clockText, timeline } from "./sudostampSim";
import { pqToNits, REF_WHITE } from "./pq";
import { BG, FG, MUTED, ACCENT, HIT, WARN, OK } from "./theme";

const NOTES = Object.keys(OG_FIGURES);
const markup = (slug: string) => renderToStaticMarkup(<>{ogFigure(slug)!.figure}</>);
/** The words and numbers a reader sees: the markup without tags, the svg's attributes included in nothing. */
const text = (slug: string) =>
  markup(slug)
    .replace(/<svg[\s\S]*?<\/svg>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
const numbersIn = (s: string) => s.match(/\d[\d,]*(?:\.\d+)?/g) ?? [];

describe("card figures", () => {
  it("covers exactly the notes that have a lead figure, all real notes", () => {
    expect(NOTES).toHaveLength(8);
    for (const slug of NOTES) expect(notes.some((n) => n.slug === slug)).toBe(true);
    expect(ogFigure("colophon")).toBeNull();
  });

  for (const slug of NOTES) {
    it(`${slug}: renders an svg at the panel size with theme colours only`, () => {
      const html = markup(slug);
      expect(html).toContain("<svg");
      expect(html).toContain(`width="${PANEL_W}"`);
      expect(html).toContain(`height="${PANEL_H}"`);
      const allowed = new Set([BG, FG, MUTED, ACCENT, HIT, WARN, OK].map((c) => c.toLowerCase()));
      for (const hex of html.match(/#[0-9a-fA-F]{6}\b/g) ?? []) expect(allowed.has(hex.toLowerCase())).toBe(true);
      // Every flex child is placed by satori rules: text boxes are flex divs.
      for (const m of html.matchAll(/<div style="([^"]*)"/g)) expect(m[1]).toMatch(/display:flex/);
    });
  }

  it("plutus: the four percentages are the ones plutusResults exports, formatted the same way", () => {
    const t = text("plutus-what-the-backtest-cannot-tell-you");
    const expected = [...UNIVERSES.map((u) => pctText(u.cagr)), pctText(SPY.cagr)];
    for (const p of expected) expect(t).toContain(p);
    // And nothing else with a percent sign.
    expect(t.match(/[−-]?\d+(?:\.\d+)?%/g)).toEqual(expect.arrayContaining(expected));
    expect(t.match(/[−-]?\d+(?:\.\d+)?%/g)).toHaveLength(expected.length);
  });

  it("crush80: the printed count is the number of keys whose Fn binding differs from layer 0", () => {
    const cs = cells(KEYMAP_TODAY, boardState(KEYMAP_TODAY, "fn", []));
    const changed = cs.filter((c) => c.binding !== bindingAt(KEYMAP_TODAY, 0, c.index)).length;
    expect(changed).toBeGreaterThan(20);
    const t = text("crush80-open-firmware");
    expect(numbersIn(t)).toEqual([String(changed), String(KEYS.length)]);
    // One HIT-filled rect per changed key, one more for the legend swatch.
    expect((markup("crush80-open-firmware").match(new RegExp(`fill="${HIT}"`, "gi")) ?? []).length).toBe(changed + 1);
  });

  it("homelab: the guest count is read from the data, and every guest is drawn", () => {
    const t = text("homelab-git-is-the-truth");
    const others = services.filter((x) => x.name !== "Gateway").length;
    expect(t).toContain(`gateway + ${others} guests`);
    for (const s of services.filter((x) => x.name !== "Gateway")) expect(t).toContain(s.name);
    // The only number on the card is the count.
    expect(numbersIn(t)).toEqual([String(others)]);
  });

  it("tizen: the readout is pqToNits at the code where it reaches diffuse white", () => {
    const t = text("tizen-video-plane-ambilight");
    let code = 0;
    while (pqToNits(code / 1023) < REF_WHITE) code++;
    expect(t).toContain(`code ${code}`);
    expect(t).toContain(Math.round(pqToNits(code / 1023)).toLocaleString("en-US"));
    expect(t).toContain(Math.round((code / 1023) * 10000).toLocaleString("en-US"));
  });

  it("kwin: the card line is the classifier's own sentence for the first state", () => {
    const { played } = initialFigure();
    expect(ogFigure("kwin-canvas-frame-classifier")!.line).toBe(ruleSentence(played.result, played.final));
    expect(played.result.verdict).toBe("revert");
    expect(text("kwin-canvas-frame-classifier")).toContain("put");
  });

  it("chordist: one outlined square per matched row, and the matched count is the alignment's", () => {
    const rows = GRACE_ROWS.filter((r) => !r.startsWith("'Twas"));
    const a = alignDetail(rows, GRACE_LINES.map((l) => l.text));
    const matched = a.match.filter((j) => j !== null).length;
    const html = markup("chordist-chart-alignment");
    expect((html.match(new RegExp(`stroke="${ACCENT}"`, "gi")) ?? []).length).toBe(matched + 1);
    expect(numbersIn(text("chordist-chart-alignment"))).toEqual([String(matched), String(rows.length), String(GRACE_LINES.length)]);
  });

  it("shutup: the outcome word comes from replay(REACH, ALL_ON)", () => {
    const o = replay(REACH, ALL_ON).outcome;
    const t = text("shutup-wave-or-reach");
    if (o.kind === "ringing") expect(t).toContain("keeps ringing");
    else expect(t).toContain(sec(o.atMs));
  });

  it("sudostamp: one row per example request, with the simulator's decision", () => {
    const rows = timeline(EXAMPLE, "computer");
    const t = text("sudostamp-refuse-before-asking");
    expect(rows.length).toBe(EXAMPLE.length);
    expect(rows.some((r) => r.outcome === "refused")).toBe(true);
    expect(rows.some((r) => r.asked)).toBe(true);
    for (const r of rows) expect(t).toContain(clockText(r.atMs));
    expect((t.match(/Refused, phone stayed silent/g) ?? []).length).toBe(rows.filter((r) => r.outcome === "refused").length);
  });
});
