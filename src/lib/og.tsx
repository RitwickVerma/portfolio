import { ImageResponse } from "next/og";

// 1200×630 social card in the datasheet style: paper, ink hairlines, one
// vermilion rule. Rendered at build time (static export) by a route handler.

export type OgText = { sheet: string; title: string; emphasis: string; footer: string };

const PAPER = "#f2efe8";
const INK = "#151412";
const INK2 = "#4c4a44";
const RULE = "#cdc8bb";
const SIGNAL = "#d9431c";

export function renderOg({ sheet, title, emphasis, footer }: OgText) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: PAPER,
          color: INK,
          padding: 56,
          fontFamily: "serif",
        }}
      >
        {/* title block */}
        <div style={{ display: "flex", borderBottom: `2px solid ${INK}`, paddingBottom: 16, fontSize: 22, fontFamily: "monospace", letterSpacing: 2 }}>
          <div style={{ display: "flex", flex: 1 }}>RITWICK VERMA</div>
          <div style={{ display: "flex", color: INK2, paddingLeft: 24, borderLeft: `1px solid ${RULE}` }}>{sheet}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
          <div style={{ display: "flex", fontSize: 84, lineHeight: 1.02, letterSpacing: -2 }}>{title}</div>
          <div style={{ display: "flex", fontSize: 84, lineHeight: 1.02, letterSpacing: -2, fontStyle: "italic", color: SIGNAL }}>
            {emphasis}
          </div>
        </div>

        <div style={{ display: "flex", borderTop: `1px solid ${RULE}`, paddingTop: 16, fontSize: 22, fontFamily: "monospace", color: INK2, letterSpacing: 1 }}>
          <div style={{ display: "flex", flex: 1 }}>{footer}</div>
          <div style={{ display: "flex" }}>ritwickverma.dev</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
