import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { ImageResponse } from "next/og";
import { BG, FG, MUTED, ACCENT, HIT, INK } from "./theme";

// Shared 1200×630 social card in the site's own terms: ink on paper, the
// name set large, the one-line claim under the highlighter, and a search box
// along the bottom. Rendered at build time (static export).

// The card renderer takes static WOFF, not the variable WOFF2 the pages use.
const font = (file: string) => readFileSync(join(process.cwd(), "src/fonts", file));
const FONTS = [
  { name: "Archivo", data: font("Archivo-latin-400.woff"), weight: 400 as const, style: "normal" as const },
  { name: "Archivo", data: font("Archivo-latin-800.woff"), weight: 800 as const, style: "normal" as const },
];

export type OgText = {
  eyebrow: string;
  name: string;
  /** Name font size in px; the default suits a two-word name, notes pass a smaller one. */
  nameSize?: number;
  line: string;
  lineTwo: string;
  /** A figure panel (about 1056×260, from ogFigures.tsx). When given, the card is laid out around it. */
  figure?: ReactNode;
};

const FOOTER = (compact: boolean) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      border: `3px solid ${FG}`,
      borderRadius: 8,
      padding: compact ? "9px 22px" : "14px 22px",
      fontSize: compact ? 26 : 28,
    }}
  >
    <div style={{ display: "flex", color: MUTED }}>Search my record</div>
    <div style={{ display: "flex", color: ACCENT }}>ritwickverma.dev</div>
  </div>
);

/** The slim footer of a figure card: the address, nothing else, so the picture keeps the room. */
const SLIM_FOOTER = (
  <div style={{ display: "flex", fontSize: 24, color: ACCENT, lineHeight: 1 }}>ritwickverma.dev</div>
);

/** A note's card with its lead figure: title, picture, name. The summary is the muted line under the picture. */
function renderFigureOg({ eyebrow, name, nameSize = 56, line, lineTwo, figure }: OgText) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BG,
          color: FG,
          fontFamily: "Archivo",
          padding: "22px 72px 28px",
          borderTop: `14px solid ${FG}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 24, color: MUTED }}>{eyebrow}</div>
          <div style={{ display: "flex", fontSize: 28, background: HIT, color: INK, padding: "2px 10px" }}>{line}</div>
        </div>
        <div style={{ display: "flex", fontSize: nameSize, fontWeight: 800, lineHeight: 1.04, letterSpacing: -1.5, textWrap: "balance" }}>{name}</div>
        <div style={{ display: "flex" }}>{figure}</div>
        <div style={{ display: "flex", fontSize: 22, color: MUTED, lineHeight: 1.25 }}>{lineTwo}</div>
        {SLIM_FOOTER}
      </div>
    ),
    { width: 1200, height: 630, fonts: FONTS },
  );
}

export function renderOg(text: OgText) {
  if (text.figure) return renderFigureOg(text);
  const { eyebrow, name, nameSize = 124, line, lineTwo } = text;
  const big = nameSize >= 100;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BG,
          color: FG,
          fontFamily: "Archivo",
          padding: "56px 72px 60px",
          borderTop: `14px solid ${FG}`,
        }}
      >
        <div style={{ display: "flex", fontSize: 26, color: MUTED }}>{eyebrow}</div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: nameSize,
              fontWeight: 800,
              lineHeight: big ? 0.95 : 1.08,
              letterSpacing: big ? -5 : -1.5,
              textWrap: big ? "wrap" : "balance",
            }}
          >
            {name}
          </div>
          <div style={{ display: "flex", marginTop: big ? 34 : 26 }}>
            <div style={{ display: "flex", fontSize: 34, background: HIT, color: INK, padding: "4px 12px", marginLeft: -12 }}>
              {line}
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 26, color: MUTED, marginTop: 14, lineHeight: 1.3, maxWidth: 1000 }}>
            {lineTwo}
          </div>
        </div>

        {FOOTER(false)}
      </div>
    ),
    { width: 1200, height: 630, fonts: FONTS },
  );
}
