# www.ritwickverma.dev

Personal portfolio — [www.ritwickverma.dev](https://www.ritwickverma.dev)

A static site (`output: "export"`): pure HTML/JS/CSS on Cloudflare Pages. No
server runtime; the only third-party request at view time is Cloudflare's
own analytics beacon.

## The idea

I worked on a search engine for 5.5 years, so the site is one.

- **Search** (`src/lib/search.ts`): a query parser (`"phrases"`, `-term`,
  `kind:`, `tech:`), tokenizer, query rewriter, prefix and nearest-spelling
  expansion, an inverted index and BM25 with field weights and a static rank,
  in one dependency-free file. It indexes every resume bullet, project and
  lab guest, and every section of every note. Each result can show the
  arithmetic behind its score. `/?q=c%2B%2B` links to a ranked list;
  Ctrl K opens search on any page.
- **Fit check** (`src/lib/fit.ts`): paste a job description and the engine
  reports which named skills the record covers, which it only comes near,
  and which are missing. It runs in the browser.
- **The engine room** (`/engine`): one query taken apart stage by stage, a
  judged query set replayed against a plain-BM25 control with P@1, MRR and
  nDCG, and a latency benchmark that runs in the reader's tab.
- **Index**, the design language (`/design`): five rules, seven colours, one
  typeface at three widths, with live specimens.

## Stack

- **Next.js 16** (App Router, static export) + React 19 + TypeScript
- **Tailwind CSS v4**; a light and a dark palette in `src/lib/theme.ts`,
  mirrored in `globals.css` and checked for contrast by a test
- **Archivo** (variable, width and weight axes) and **Martian Mono**,
  self-hosted from `src/fonts/`; the build makes no network request
- **MDX** (`@next/mdx`, remark-gfm) — the notes. Add a file under
  `src/content/notes/` and an entry in `src/lib/notes.ts`; a test fails if
  the two disagree.
- **Vitest** — pure logic only: the search engine, a relevance regression
  guard over judged queries, the fit check, data integrity, copy guards,
  theme contrast, SEO helpers, the notes registry, the keyboard matrix, the
  status feed
- No animation library, no 3D, no component library, no runtime
  dependencies beyond Next, React and MDX.

## Layout

```
src/app/(site)/        home page + nav and footer
src/app/(site)/notes/  /notes index and /notes/[slug] pages, one OG card each
src/content/notes/     the notes themselves, MDX; registered in lib/notes.ts
src/app/resume/        /resume — print-optimised, rendered from lib/resume
src/app/apps/          landing pages for the Android apps, in their own design
src/app/(site)/engine/ the engine room; src/app/(site)/design/ the design language
src/lib/search.ts      the search engine
src/lib/corpus.ts      the documents it indexes, built from the data below
src/lib/eval.ts        judged queries and relevance metrics
src/lib/fit.ts         the fit check; lexicon.ts is the skills it recognises
src/components/figures the ambilight simulation, the infinite canvas, the lab diagram
src/lib/data.ts        single source for home, /resume and the index
src/lib/status.ts      /status.json contract (schema 1) + pure helpers
tools/                 status-from-api.sh (cron on a host) + fixtures + example
src/app/og.png/        Open Graph card, rendered to a real .png at build
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

The Homelab section can read a `/status.json` feed: guest ids, running/stopped, uptime, host load,
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
