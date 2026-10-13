# www.ritwickverma.dev

Personal portfolio — [www.ritwickverma.dev](https://www.ritwickverma.dev)

A static site (`output: "export"`): HTML and CSS with a few small client islands,
served by nginx. No server runtime, no third-party requests at view time. Runtime
dependencies: `next`, `react`, `react-dom` — nothing else.

## Design

The site is set like an engineering datasheet: a title-block header, numbered
sheets (§), numbered figures, specification tables and line drawings. One signal
colour (drafting vermilion) marks only what matters. Type: Fraunces (display),
IBM Plex Sans (text), IBM Plex Mono (labels, figures, tables), self-hosted by
`next/font`. Light and dark themes follow `prefers-color-scheme`. All motion is
CSS, gated on a `.js` class, and disabled under `prefers-reduced-motion`.

Fig. 1 on the home page is an exploded isometric drawing of the homelab,
generated at render time from `services` in `src/lib/data.ts` by the pure
geometry in `src/lib/iso.ts` (projection, painter's order, convex-hull
silhouettes, separating-axis overlap tests — all unit-tested).

## Content rules

Every claim is a measured or verifiable fact. Shared numbers live in
`src/lib/data.ts` and `src/lib/cases.ts`; `cases.test.ts` fails if a headline
figure drifts from the measurement it quotes. Snapshots (stars, downloads,
guest counts) must be re-checked before editing.

## Layout

```
src/app/(site)/            index page, case studies (work/*), title block + colophon
src/app/resume/            /resume — prints as one Letter page
src/app/og.png/            Open Graph cards, rendered to real .png files at build
src/components/            HomelabDrawing (Fig. 1), case-study blocks, figures
src/lib/iso.ts             isometric projection + exploded-view layout
src/lib/cases.ts           case-study index and measured figure data
src/lib/data.ts            projects, experience, education, the 15 guests
```

## Development

```bash
npm ci
npm run dev      # local dev server
npm run lint     # ESLint (0 warnings expected)
npm test         # Vitest
npm run build    # static export → out/ (stamps the build receipt: commit, date, deps)
```

## Deploy

CI runs `lint + tsc + test` on every push; a push to `master` then has CI SSH
to the build host and run its `rebuild.sh` (pull, `npm ci`, `npm run build`,
copy `out/` into the nginx web root). Nothing is built on the runner.
