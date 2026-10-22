# www.ritwickverma.dev

Personal portfolio — [www.ritwickverma.dev](https://www.ritwickverma.dev)

A static site (`output: "export"`): pure HTML/JS/CSS on Cloudflare Pages. No
server runtime; the only third-party request at view time is Cloudflare's
own analytics beacon.

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
src/app/(site)/    home page + nav, footer, backdrop shader
src/app/(site)/notes/  /notes index and /notes/[slug] pages, one OG card each
src/content/notes/ the notes themselves, MDX; registered in lib/notes.ts
src/app/resume/    /resume — print-optimised, rendered from lib/data
src/lib/status.ts  /status.json contract (schema 1) + pure helpers; statusStore.ts fetches it once
tools/             status-from-api.sh (cron on the web container) + fixtures + example
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

## Live status

The Homelab section, the hero's rack LEDs and the terminal's `status` command
can read a `/status.json` feed: guest ids, running/stopped, uptime, host load,
nothing that identifies a machine. `tools/status-from-api.sh` produces it
from the Proxmox API with a read-only token; `parseStatus` rejects anything
off-schema, and a test runs the script against recorded API fixtures.

The feed needs a host that can run a cron and serve a path. Cloudflare Pages
cannot, so the current deploy leaves `NEXT_PUBLIC_STATUS_URL` unset, nothing
is fetched, and every reader shows the static inventory. To bring it back,
serve the file from somewhere with CORS for this origin and set that URL as a
CI variable.

## Deploy

CI runs `lint + typecheck + test` on every push (the `check` job). A push to
`master` then runs `deploy`: `npm run build` on the runner and
`wrangler pages deploy out` to the Cloudflare Pages project. Response headers
(immutable hashed assets, frame and content-type protections) come from
`public/_headers`. Open a merge request for changes; merging to `master` is
the production deploy.
