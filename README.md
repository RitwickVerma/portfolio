# www.ritwickverma.dev

Personal portfolio — [www.ritwickverma.dev](https://www.ritwickverma.dev)

A static site (`output: "export"`): pure HTML/JS/CSS, served by nginx. No
server runtime, no third-party requests at view time.

## Stack

- **Next.js 16** (App Router, static export) + React 19 + TypeScript
- **three.js / React Three Fiber** — the 3D datacenter hero (WebGL2), loaded
  lazily after idle behind a static SVG poster. A WebGPU build with a TSL
  compute airflow layer exists behind `?renderer=webgpu`; it stays opt-in
  until it has been verified on real GPUs.
- **framer-motion** — the only animation library; every curve and duration
  comes from `src/lib/motion.ts`
- **xterm.js** — the terminal section; mounted when it nears the viewport
- **Tailwind CSS v4**
- **MDX** (`@next/mdx`, remark-gfm) — the notes. Add a file under
  `src/content/notes/` and an entry in `src/lib/notes.ts`; a test fails if
  the two disagree.
- **Vitest** — pure logic only (data integrity, terminal output, motion
  tokens, SEO helpers, the hero phase machine, hero label layout, the notes
  registry)

## Layout

```
src/app/(site)/    home page + nav, footer, backdrop, cursor trail
src/app/(site)/notes/  /notes index and /notes/[slug] pages, one OG card each
src/content/notes/ the notes themselves, MDX; registered in lib/notes.ts
src/app/resume/    /resume — print-optimised, rendered from lib/data
src/app/og.png/    Open Graph card, rendered to a real .png at build
src/lib/data.ts    single source for home, /resume and the terminal
src/lib/motion.ts  easing, duration, stagger, spring tokens
```

Everything the site claims lives in `src/lib/data.ts`. Counts (guests, tests,
stars) are snapshots — re-check them before editing.

## Development

```bash
npm ci
npm run dev      # local dev server
npm run lint     # ESLint (0 warnings expected)
npm run typecheck
npm test         # Vitest
npm run build    # static export → out/
```

## Deploy

CI runs `lint + typecheck + test` on every push; a push to `master` then has CI SSH
to the build host and run its `rebuild.sh` (pull, `npm ci`, `npm run build`,
copy `out/` into the nginx web root). Nothing is built on the runner.
