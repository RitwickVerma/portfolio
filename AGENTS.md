<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

Public repo (www.ritwickverma.dev). Never commit internal IPs, hostnames, ports or tokens; `6bbbe8b` removed IPs/ports from the client bundle. `CLAUDE.md` only contains `@AGENTS.md`; edit this file, not that one.

## Run
```bash
npm ci
npm run dev        # local dev server
npm run build      # static export -> out/
```
**A push to `master` triggers a production deploy** (`deploy` job in `.gitlab-ci.yml`, `rules: $CI_COMMIT_BRANCH == "master"`, `needs: check`). Work on a branch and open an MR; never push to `master` without intent. The deploy job builds on the runner and runs `wrangler pages deploy out` to Cloudflare Pages (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` are CI variables). Do not run it locally.

## Test
Vitest 4 + jsdom, pure logic only; browser behaviour is covered by the Playwright suite below. Tests are `src/**/*.test.{ts,tsx}` (`vitest.config.mts`; `@` aliases `./src`). Verified 2026-11-10: 14 files / 191 tests pass.
```bash
npm run lint && npm run typecheck && npm test   # exactly what the CI `check` job runs
npm run test:watch
```
- `src/lib/notes.test.ts` fails if `src/content/notes/*.mdx` and the registry in `src/lib/notes.ts` disagree.
- `src/lib/status.test.ts` runs `tools/status-from-api.sh` via `sh` against `tools/fixtures/` (env `PVE_FIXTURE_DIR`, `OUT`) and feeds the result through `parseStatus`. No network.
- `src/lib/search.test.ts` pins the tokenizer, query language (phrases, `-term`, `kind:`, `tech:`), rewriter, spelling fallback, ranking and the score breakdown (the parts must multiply back to the score).
- `src/lib/corpus.test.ts` checks the corpus against the real data: every note section is a document whose anchor the page renders, and `WORK_HEADLINES` matches the generated `lib/resume.ts` bullets in count.
- `src/lib/eval.test.ts` is the relevance guard: the judged queries in `lib/eval.ts` must all return a relevant first result under `TREATMENT`, nDCG@5 must stay at 0.9 or better, and `TREATMENT` must beat `CONTROL`. A ranking change that fails this needs either a fix or a conscious edit to the judgments.
- `src/lib/theme.test.ts` checks both palettes against `globals.css` and for WCAG contrast.
- No test uses `vi.mock`/`vi.fn`/`vi.spyOn`; tests exercise pure functions and fixtures directly. Keep new logic pure so it stays testable this way.
- `npm run build` also renders OG cards and must pass; it is not part of CI `check` (verified locally, ~30 s). The `e2e` job runs it.

### Browser smoke tests
Playwright (`e2e/smoke.spec.ts`, `playwright.config.ts`) over the built export in `out/`, served by `e2e/serve.mjs` (no dependencies). Chromium, Firefox and WebKit. Run `npm run build` first; the suite tests what would deploy, not the dev server.
```bash
npm run build && npm run test:e2e                      # needs the browsers: npx playwright install
docker run --rm --ipc=host -e CI=1 -v "$PWD":/work -w /work mcr.microsoft.com/playwright:v1.65.0-noble npx playwright test   # what CI runs; WebKit needs this image on Debian
```
- Per page (home, `/engine`, `/design`, one note, `/resume`): no console errors, no failed or third-party requests, no sideways overflow at 320/390/768/1440, complete with JavaScript disabled.
- Search: the chunk hydrates and ranks, `?q=` links work, Ctrl K opens the palette, the demo query types once and does not run under reduced motion.
- `/resume` prints to one page on Letter and A4 (Chromium only: `page.pdf()`).
- axe (WCAG 2.2 AA plus best-practice) on each page in both palettes, and on the home page with a query on it. A violation is fixed in the component, never excluded from the scan.
- The image tag in `.gitlab-ci.yml` and `@playwright/test` in `package.json` are pinned to the same version; bump them together.
- The container writes `e2e-results/` as root; remove it through the container if a local run then fails with EACCES.

## Source modules
| Path | Responsibility |
|---|---|
| `src/app/(site)/` | Home page, shared layout (nav, footer, command palette), `/notes` index + `/notes/[slug]` pages with per-note OG card, `/engine` (the engine room) and `/design` (the design language). |
| `src/app/search-index.json/` | Static route: every note split at its `##` headings, as JSON. The client fetches it once idle and rebuilds the index with it. |
| `src/app/resume/` | Print-optimised `/resume` rendered from `lib/data`, with its own OG card. |
| `src/app/{og.png,sitemap.ts,robots.ts,manifest.ts}` | Build-time OG image, sitemap, robots and web manifest. |
| `src/components/` | `Search` (the hero), `Palette` (Ctrl K, every page), the home sections (`Work`, `Projects`, `Keyboard`, `Notes`, `Homelab`, `Contact`) on the shared `Section` frame, `Timeline`, `Crush80`, `NoteExtras` (contents rail, match highlighting), `Nav`, `Footer`. |
| `src/components/search/parts.tsx` | Shared by every search surface: result row, plan chips, score breakdown (`Explain`), `CorpusMap`. |
| `src/components/figures/` | `Ambilight` (canvas simulation; LEDs computed from the pixels), `InfiniteCanvas` (pan and zoom), `LabTopology` (SVG from `lib/data`). |
| `src/components/engine/`, `design/` | `XRay` and `Benchmark` for `/engine`; `WidthSpecimen` for `/design`. |
| `src/content/notes/*.mdx` | The engineering notes; each needs an entry in `src/lib/notes.ts` (newest first). |
| `src/lib/data.ts` | Single source for home, `/resume` and the search index: projects, experience, education, services, skills, links. |
| `src/lib/search.ts` | The search engine, pure and dependency-free: query parser, tokenizer (folds accents: "résumé" is "resume") and stemmer, rewriter, prefix and fuzzy expansion, inverted index with per-field counts, BM25 with field boosts and a static-rank prior, per-hit `explain`, highlight and snippet helpers. `TREATMENT` is what the site runs; `CONTROL` is plain BM25. |
| `src/lib/corpus.ts` | Builds the search documents from `lib/data`, `lib/resume`, `lib/notes` and (when given) the notes' sections; owns `WORK_HEADLINES`, the priors, starting points and example queries. The Work section renders from `workRoles` here. |
| `src/lib/eval.ts` | The judged query set and the metrics (P@1, MRR, nDCG@5). Read by `/engine` at build and by `eval.test.ts`. |
| `src/lib/searchUi.ts` | The hero box's rules that need no DOM: rows visible at a width, arrow-key clamping, where focus goes after Show all, keeping a selection through a re-rank. |
| `src/lib/useSearchIndex.ts` | Client store: one index per tab, record first, full text after idle. |
| `src/lib/timeline.ts`, `slug.ts`, `themeSwitch.ts` | Period parser for the career strip; heading slugs shared by MDX and the index; the light/dark switch. |
| `src/lib/status.ts`, `statusStore.ts` | `/status.json` schema 1, `parseStatus` validation, freshness helpers; the store fetches it once. |
| `src/fonts/` | Self-hosted variable fonts (Archivo with width and weight axes, Martian Mono) and their OFL licences; loaded with `next/font/local` in `src/app/layout.tsx`. The build needs no network. |
| `src/lib/{seo,og,theme,notes,notes.server}.ts*` | SEO helpers, OG rendering, theme tokens, notes registry and its server-side reader. |
| `tools/status-from-api.sh` | Produces a `/status.json` feed from the Proxmox API for a host that can run cron. Not wired on Cloudflare Pages (`NEXT_PUBLIC_STATUS_URL` unset). Fixtures in `tools/fixtures/`. |

## Data flow
- In-repo: all site content (`src/lib/data.ts`, `src/content/notes/`). Output is a static export in `out/` (`next.config.ts`: `output: "export"`, `trailingSlash: true`); no server runtime, no API routes, no third-party requests at view time.
- Runtime, not in repo: an optional status feed at `NEXT_PUBLIC_STATUS_URL` (build-time). Unset on the current Cloudflare Pages deploy, so nothing is fetched and readers show the static inventory. `parseStatus` rejects anything off-schema; stale after 15 min (`STALE_AFTER_MS`). The script reads env `PVE_URL`, `PVE_NODE`, `PVE_TOKEN`, `PVE_CACERT`, `OUT` from a root-only env file on that host (see the script header; do not put values in the repo).
- CI variables `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are used by the deploy job. Never print them.
- Deploy: `master` -> CI `deploy` -> `npm run build` on the runner -> `wrangler pages deploy out` (Cloudflare Pages). Headers come from `public/_headers`.
- Next.js is v16: read `node_modules/next/dist/docs/` before using Next APIs (block above).

## Code conventions
- TypeScript (strict config in `tsconfig.json`), ESLint 9 flat config `eslint.config.mjs` (`eslint-config-next` core-web-vitals + typescript); lint currently reports no issues, keep it at zero warnings.
- Tailwind CSS v4 via `@tailwindcss/postcss`; theme tokens in `src/app/globals.css`, mirrored from `src/lib/theme.ts` (light and dark; the test fails on drift). Use the tokens (`text-fg`, `text-muted`, `text-accent`, `bg-hit`), never a literal colour, so both schemes keep working.
- The design language is called Index and is documented at `/design` (`src/app/(site)/design/page.tsx`). Its five rules are binding: rows not cards; one typeface at three widths (`.wd-wide` name, `.wd-semi` headings, `.fact` for dates, roles, stacks; mono for code, ids and the query plan only); colour means something (blue = a place to go, yellow = a match, `ok`/`warn` only beside a measured change); headings are claims, never uppercase labels; nothing moves unless the visitor did something. If you add a token or a part, add it to that page.
- There is no animation library. Motion is CSS in `globals.css` (`rank-in`, `landed`, corpus-map ticks) plus the one-time demo query in `Search.tsx` and the `Ambilight` canvas loop; all stop under reduced motion.
- A figure must compute what it shows (the ambilight LEDs come from the canvas pixels; bars are drawn to scale from data) and its caption must say where it stops being the real thing.
- The search box must find what the page says: new content goes in `lib/data`, `lib/notes` or `lib/corpus`, never straight into a component, or it will not be indexed.
- Every claim on the site must be one the owner can back (comment in `data.ts`); counts and stars are dated snapshots, re-check before editing.
- Page copy uses no em dashes in titles (`749af94`).
- Conventional commits (`feat:`, `fix(scope):`, `docs:`, `ci:`, `chore:`, `build(deps):`). No commit-lint job in `.gitlab-ci.yml`.
- No formatter config (no Prettier) is present.

## Pitfalls
1. Pushing to `master` deploys to production; CI `check` must pass first (`needs: check`).
2. Never leak private addresses or unverifiable facts in the client bundle or copy (`6bbbe8b`); the private Plutus link was dropped (`ce863eb`).
3. Same-page result links must be plain `<a href="#id">`, not `next/link`: a client-side hash navigation does not update `:target`, so the landing highlight never fires.
4. `performance.now()` is too coarse to time one query; `timed()` in `useSearchIndex.ts` and `Benchmark.tsx` time a batch and divide. Do not read the clock during render.
5. Tailwind utilities `text-fg/NN` generated nothing until `--color-fg` was defined in the theme (`37ae49e`).
6. `lib/resume.ts` is generated and still says "Present" after the role ends; `lib/corpus.ts` takes the current role's period from `lib/data` instead. Keep it that way.
7. Next.js 16.3.0 had RCE advisories (incl. `next/og`); stay on >= 16.4.0 (`bb477f4`).
8. `status.json` written with `mktemp` default mode made nginx return 403; the script sets 0644 before the atomic rename. A privilege-separated Proxmox token needs the role on both user and token (`5c853e8`).
9. Turbopack cannot take JS functions as MDX plugins; name them as strings in `next.config.ts`.
11. Heading ids come from `slugify` in two places that must agree: `mdx-components.tsx` (rendered ids) and `notes.server.ts` (index links, contents rail). A raw `<h2>` written as JSX inside MDX bypasses the first; use markdown `##`.
13. No regex lookbehind (`(?<=`, `(?<!`) anywhere in `src/`: Safari before 16.4 fails to parse the whole chunk. `copy.test.ts` enforces it.
14. A figure must not trap the page: `InfiniteCanvas` uses `touch-action: pan-y`, never `none`.
12. Search results for notes link with `?q=`; `NoteHighlights` reads it and paints matches with the CSS Custom Highlight API. It must never mutate the note's DOM.
10. Martian Mono is wide: a mono string longer than about 40 characters wraps on phones. Keep mono for short tokens.
