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
Vitest 4 + jsdom, pure logic only (no component or browser tests). Tests are `src/**/*.test.{ts,tsx}` (`vitest.config.mts`; `@` aliases `./src`). Verified 2026-11-10: 11 files / 104 tests pass.
```bash
npm run lint && npm run typecheck && npm test   # exactly what the CI `check` job runs
npm run test:watch
```
- `src/lib/notes.test.ts` fails if `src/content/notes/*.mdx` and the registry in `src/lib/notes.ts` disagree.
- `src/lib/status.test.ts` runs `tools/status-from-api.sh` via `sh` against `tools/fixtures/` (env `PVE_FIXTURE_DIR`, `OUT`) and feeds the result through `parseStatus`. No network.
- `src/lib/search.test.ts` pins the tokenizer, rewriter and ranking; `src/lib/corpus.test.ts` holds relevance checks against the real corpus (which document must come first for `fitment`, `caching`, `c++`, ...) and fails if `WORK_HEADLINES` and the generated `lib/resume.ts` bullets stop matching in count.
- `src/lib/theme.test.ts` checks both palettes against `globals.css` and for WCAG contrast.
- No test uses `vi.mock`/`vi.fn`/`vi.spyOn`; tests exercise pure functions and fixtures directly. Keep new logic pure so it stays testable this way.
- `npm run build` also renders OG cards and must pass; it is not part of CI `check` (verified locally, ~30 s).

## Source modules
| Path | Responsibility |
|---|---|
| `src/app/(site)/` | Home page, shared layout (nav, footer) and `/notes` index + `/notes/[slug]` pages with per-note OG card. |
| `src/app/resume/` | Print-optimised `/resume` rendered from `lib/data`, with its own OG card. |
| `src/app/{og.png,sitemap.ts,robots.ts,manifest.ts}` | Build-time OG image, sitemap, robots and web manifest. |
| `src/components/` | `Search` (the hero: client component over `lib/search`), the home sections (`Work`, `Projects`, `Keyboard`, `Notes`, `Homelab`, `Contact`) on the shared `Section` frame, `Crush80`, `Nav`, `Footer`. Only `Search`, `Homelab` and `Crush80` are client components. |
| `src/content/notes/*.mdx` | The engineering notes; each needs an entry in `src/lib/notes.ts` (newest first). |
| `src/lib/data.ts` | Single source for home, `/resume` and the search index: projects, experience, education, services, skills, links. |
| `src/lib/search.ts` | The search engine, pure and dependency-free: tokenizer and stemmer, query rewriter, inverted index, BM25 with field boosts and a static-rank prior, highlight and snippet helpers. |
| `src/lib/corpus.ts` | Builds the search documents from `lib/data`, `lib/resume` and `lib/notes`; owns the per-bullet headlines (`WORK_HEADLINES`), starting points and example queries. The Work section renders from `workRoles` here. |
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
- One typeface, three widths: `.wd-wide` for the name, `.wd-semi` for headings, `.wd-narrow` for facts about a thing (dates, roles, tech). Mono is for code, ids and the query plan only. No uppercase labels.
- There is no animation library. The three animations (`rank-in`, `landed`, the one-time demo query) are CSS in `globals.css` or timers in `Search.tsx`; all stop under reduced motion.
- The search box must find what the page says: new content goes in `lib/data`, `lib/notes` or `lib/corpus`, never straight into a component, or it will not be indexed.
- Every claim on the site must be one the owner can back (comment in `data.ts`); counts and stars are dated snapshots, re-check before editing.
- Page copy uses no em dashes in titles (`749af94`).
- Conventional commits (`feat:`, `fix(scope):`, `docs:`, `ci:`, `chore:`, `build(deps):`). No commit-lint job in `.gitlab-ci.yml`.
- No formatter config (no Prettier) is present.

## Pitfalls
1. Pushing to `master` deploys to production; CI `check` must pass first (`needs: check`).
2. Never leak private addresses or unverifiable facts in the client bundle or copy (`6bbbe8b`); the private Plutus link was dropped (`ce863eb`).
3. Same-page result links must be plain `<a href="#id">`, not `next/link`: a client-side hash navigation does not update `:target`, so the landing highlight never fires.
4. `performance.now()` is too coarse to time one query; `Search.tsx` times a batch and divides. Do not read the clock during render.
5. Tailwind utilities `text-fg/NN` generated nothing until `--color-fg` was defined in the theme (`37ae49e`).
6. `lib/resume.ts` is generated and still says "Present" after the role ends; `lib/corpus.ts` takes the current role's period from `lib/data` instead. Keep it that way.
7. Next.js 16.3.0 had RCE advisories (incl. `next/og`); stay on >= 16.4.0 (`bb477f4`).
8. `status.json` written with `mktemp` default mode made nginx return 403; the script sets 0644 before the atomic rename. A privilege-separated Proxmox token needs the role on both user and token (`5c853e8`).
9. Turbopack cannot take JS functions as MDX plugins; name them as strings in `next.config.ts`.
10. Martian Mono is wide: a mono string longer than about 40 characters wraps on phones. Keep mono for short tokens.
