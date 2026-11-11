"use client";

import { useState } from "react";
import { FigureFrame, Fold, Presets, Segmented, Verdict } from "./kit";
import {
  REF_WHITE, SDR_TABLE, chroma, clamp255, ignoredGrey, indexToNits, nitsToIndex, nitsToPq, toLed, type Rgb,
} from "@/lib/pq";

// A colour at a brightness goes in; the app's own arithmetic turns it into the three
// numbers an LED gets, once the way the app does it and once as if the TV's curve
// did not exist. The swatches are those numbers drawn as sRGB, nothing more.

const COLOURS = [
  { id: "grey", label: "Grey", rgb: [1, 1, 1] },
  { id: "orange", label: "Orange", rgb: [1, 0.33, 0.05] },
  { id: "sky", label: "Sky blue", rgb: [0.15, 0.5, 1] },
  { id: "green", label: "Deep green", rgb: [0, 1, 0] },
] as const satisfies readonly { id: string; label: string; rgb: Rgb }[];
type ColourId = (typeof COLOURS)[number]["id"];

const SCENES = [
  { id: "lamp", label: "A lamp, 100 nits", colour: "orange", nits: 100 },
  { id: "dark", label: "A dark film, 0.2 nits", colour: "grey", nits: 0.2 },
  { id: "sun", label: "Sunlight, 1000 nits", colour: "orange", nits: 1000 },
  { id: "green", label: "Neon green, 150 nits", colour: "green", nits: 150 },
] as const satisfies readonly { id: string; label: string; colour: ColourId; nits: number }[];
type SceneId = (typeof SCENES)[number]["id"];

const fmtNits = (n: number) => (n < 1 ? n.toFixed(2) : n < 10 ? n.toFixed(1) : String(Math.round(n)));
const rgbText = (v: readonly number[], f: (n: number) => string = (n) => String(Math.round(n))) => v.map(f).join(" ");
const css = (v: Rgb) => `rgb(${v[0]} ${v[1]} ${v[2]})`;
const brightness = (v: Rgb) => Math.max(...v);

const W = 255;
const REF_CODE = 255 * nitsToPq(REF_WHITE);
function curvePath(f: (c: number) => number) {
  let d = "";
  for (let c = 0; c <= 255; c++) d += `${c === 0 ? "M" : "L"}${c},${W - f(c)} `;
  return d;
}
const TONE_PATH = curvePath((c) => SDR_TABLE[c]);
const IGNORED_PATH = curvePath((c) => ignoredGrey(c));

export default function PqToLed() {
  const [scene, setScene] = useState<SceneId | null>("lamp");
  const [colour, setColour] = useState<ColourId>("orange");
  const [nits, setNits] = useState<number>(100);

  const pick = (id: SceneId) => {
    const s = SCENES.find((x) => x.id === id)!;
    setScene(id);
    setColour(s.colour);
    setNits(s.nits);
  };

  const sample = COLOURS.find((c) => c.id === colour)!;
  const light = sample.rgb.map((c) => c * nits) as Rgb;
  const built = toLed(light, "luma");
  const channel = toLed(light, "channel");
  const ignored = toLed(light, "ignored");
  const lumaCode = clamp255(built.luma);
  const code = Math.round(Math.max(...built.pq));

  const bB = brightness(built.led);
  const bI = brightness(ignored.led);
  const diff = bB === 0 ? 0 : Math.round(((bB - bI) / bB) * 100);
  const same = Math.abs(diff) < 5;
  const name = sample.label.toLowerCase();
  const title = same
    ? `Read as ordinary colour, this ${name} would come out about the same.`
    : diff > 0
      ? `Read as ordinary colour, this ${name} would reach the LED strip ${diff}% darker.`
      : `Read as ordinary colour, this ${name} would reach the LED strip ${-diff}% brighter.`;
  const clipped = built.toneLuma === 255 && nits > REF_WHITE;

  return (
    <FigureFrame
      claim="HDR video stores brightness on a curve of its own, and the strip only looks right if the app undoes it."
      how="Press a scene. Nits are units of brightness; the curve is called PQ."
      caption={<>The app&apos;s own arithmetic run on a colour you pick, not on a frame from a TV; the swatches are the LED numbers drawn as sRGB on your screen, not what the strip emits.</>}
      about={
        <>
          <p>
            The code is a port of the colour functions in the app (ST 2084 transfer, BT.2020 matrix in the code domain, a table that maps 203 nits to full scale, then the 2020 to 709 gamut step). A stand-in encodes
            your colour into the plane&apos;s three bytes; nothing is read from a TV.
          </p>
          <p>Left out: the app&apos;s adaptive gamma, its smoothing, the averaging of a zone, and anything the TV does to the plane before the app sees it.</p>
        </>
      }
    >
      <Presets items={SCENES} active={scene} onPick={pick} />

      <div>
        <p className="text-[0.95rem] leading-snug text-fg/75 mb-2">
          The picture says {name} at {fmtNits(nits)} nits. The TV stores that as PQ code {code} of 255.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { k: "built", label: "What the app sends", v: built.led },
            { k: "ignored", label: "If the curve were ignored", v: ignored.led },
          ].map(({ k, label, v }) => (
            <div key={k}>
              <div className={`h-24 sm:h-28 rounded-[3px] border ${k === "built" ? "border-2 border-fg" : "border-border"}`} style={{ background: css(v as Rgb) }} role="img" aria-label={`${label}: LED value ${rgbText(v)}`} />
              <p className="mt-1.5 text-[0.95rem] font-semibold leading-tight sm:min-h-0 min-h-[2.4em]">{label}</p>
              <p className="fact tabular-nums">{rgbText(v)}</p>
            </div>
          ))}
        </div>
      </div>

      <Verdict tone={same ? "plain" : "warn"} title={title}>
        <p>
          The app sends {rgbText(built.led)} to the LED; ignoring the curve would send {rgbText(ignored.led)}.
          {clipped ? ` Above ${REF_WHITE} nits the app's table is full, so a bright colour drifts toward white.` : ""}
        </p>
      </Verdict>

      <Fold summary="More controls">
        <div className="space-y-4">
          <Segmented
            label="Colour"
            value={colour}
            options={COLOURS}
            onChange={(c) => {
              setColour(c);
              setScene(null);
            }}
          />
          <div>
            <label htmlFor="pq-nits" className="text-[0.95rem] leading-snug text-fg/75 flex items-baseline justify-between gap-3">
              <span>Brightness of the brightest channel</span>
              <span className="text-fg tabular-nums">{fmtNits(nits)} nits</span>
            </label>
            <input
              id="pq-nits"
              type="range"
              min={0}
              max={100}
              step="any"
              value={nitsToIndex(nits)}
              onChange={(e) => {
                setNits(indexToNits(Number(e.target.value)));
                setScene(null);
              }}
              aria-valuetext={`${fmtNits(nits)} nits`}
              className="block w-full h-11 sm:h-9 accent-fg"
            />
          </div>
        </div>
      </Fold>

      <Fold summary="The numbers, step by step">
        <dl className="text-[0.95rem]">
          {(
            [
              ["Light in, BT.2020, nits", rgbText(light, fmtNits)],
              ["PQ code of each channel", rgbText(built.pq)],
              ["Plane bytes Y U V", rgbText(built.yuv)],
              ["Luma, then tone-mapped", `${Math.round(built.luma)} gives ${built.toneLuma}${built.scale ? `, so R, G and B are scaled by ${built.scale.toFixed(2)}` : ""}`],
              ["After the gamut step, to the LED", rgbText(built.led)],
              ["Colourfulness (0 grey, 1 pure): app; red, green and blue mapped one by one; ignored", `${chroma(built.led).toFixed(2)}, ${chroma(channel.led).toFixed(2)}, ${chroma(ignored.led).toFixed(2)}`],
            ] as [string, string][]
          ).map(([k, v]) => (
            <div key={k} className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] gap-x-3 py-1.5 border-b border-border last:border-0">
              <dt className="text-[0.95rem] leading-snug text-fg/75">{k}</dt>
              <dd className="tabular-nums text-fg/90">{v}</dd>
            </div>
          ))}
        </dl>
        <svg
          viewBox="-34 -16 310 306"
          role="img"
          aria-label={`Curve from the plane's luma code to the LED value. This colour sits at code ${lumaCode} and the app sends ${SDR_TABLE[lumaCode]}. The curve reaches 255 at code 148, which is ${REF_WHITE} nits.`}
          className="mt-4 block w-full max-w-[22rem]"
        >
          <rect x="0" y="0" width="255" height="255" fill="none" className="stroke-border" />
          <line x1={REF_CODE} y1="0" x2={REF_CODE} y2="255" className="stroke-muted" strokeDasharray="3 3" />
          <text x={REF_CODE - 4} y="14" textAnchor="end" className="fill-muted" fontSize="13">{REF_WHITE} nits</text>
          <path d={IGNORED_PATH} fill="none" className="stroke-muted" strokeWidth="1.5" strokeDasharray="4 3" />
          <path d={TONE_PATH} fill="none" className="stroke-fg" strokeWidth="2" />
          <circle cx={lumaCode} cy={W - SDR_TABLE[lumaCode]} r="6" className="fill-background stroke-fg" strokeWidth="2.5" />
          <text x="0" y="278" className="fill-muted" fontSize="13">Plane luma code, 0 to 255</text>
          <text x="-8" y="127" textAnchor="middle" transform="rotate(-90 -8 127)" className="fill-muted" fontSize="13">LED value</text>
          <text x="250" y="244" textAnchor="end" className="fill-fg" fontSize="13">solid: the app</text>
          <text x="250" y="228" textAnchor="end" className="fill-muted" fontSize="13">dashed: PQ ignored</text>
        </svg>
      </Fold>
    </FigureFrame>
  );
}
