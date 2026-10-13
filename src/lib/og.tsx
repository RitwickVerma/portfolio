import { ImageResponse } from "next/og";

// Shared 1200×630 social card: dark house style, one accent, the same uneven
// rack silhouettes as the hero. Rendered at build time (static export).

export type OgText = { eyebrow: string; name: string; line: string; lineTwo: string };

const ACCENT = "#64ffda";
const WARN = "#ff4444";

// Hand-placed, deliberately uneven — the same rack silhouettes as the hero.
const RACKS = [
  { x: 690, w: 74, h: 250 },
  { x: 788, w: 82, h: 205 },
  { x: 896, w: 70, h: 168 },
  { x: 988, w: 86, h: 232 },
  { x: 1090, w: 72, h: 188, warn: true },
];
const FLOOR = 150; // px from the bottom

export function renderOg({ eyebrow, name, line, lineTwo }: OgText) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#0a0a0f",
          color: "#e4e4e7",
          fontFamily: "Geist",
        }}
      >
        {RACKS.map((r, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: r.x,
              bottom: FLOOR,
              width: r.w,
              height: r.h,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 10,
              background: "#17171f",
              border: `1px solid ${ACCENT}44`,
              borderRadius: 4,
            }}
          >
            <div style={{ display: "flex", width: "100%", height: r.h * 0.55, background: `${ACCENT}1f`, borderRadius: 2 }} />
            <div style={{ display: "flex", gap: 8 }}>
              {[0, 1, 2].map((d) => (
                <div
                  key={d}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    background: r.warn && d === 0 ? WARN : ACCENT,
                    opacity: d === 2 ? 0.45 : 1,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
        <div
          style={{
            position: "absolute",
            left: 650,
            right: 50,
            bottom: FLOOR - 2,
            height: 2,
            background: `${ACCENT}55`,
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "72px 20px 72px 80px",
            width: 680,
            height: "100%",
          }}
        >
          <div style={{ display: "flex", fontSize: 28, color: ACCENT }}>{eyebrow}</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 92, lineHeight: 1.02, letterSpacing: -3 }}>
              {name}
            </div>
            <div style={{ display: "flex", fontSize: 36, color: ACCENT, marginTop: 28 }}>
              {line}
            </div>
            <div style={{ display: "flex", fontSize: 28, color: "#8892b0", marginTop: 10, lineHeight: 1.3 }}>
              {lineTwo}
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
