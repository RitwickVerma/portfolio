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
Vitest 4 + jsdom, pure logic only (no component or browser tests). Tests are `src/**/*.test.{ts,tsx}` (`vitest.config.mts`; `@` aliases `./src`). Verified: 13 files / 85 tests pass.
```bash
npm run lint && npm run typecheck && npm test   # exactly what the CI `check` job runs
npm run test:watch
```
- `src/lib/notes.test.ts` fails if `src/content/notes/*.mdx` and the registry in `src/lib/notes.ts` disagree.
- `src/lib/status.test.ts` runs `tools/status-from-api.sh` via `sh` against `tools/fixtures/` (env `PVE_FIXTURE_DIR`, `OUT`) and feeds the result through `parseStatus`. No network.
- No test uses `vi.mock`/`vi.fn`/`vi.spyOn`; tests exercise pure functions and fixtures directly. Keep new logic pure so it stays testable this way.
- `npm run build` also renders OG cards and must pass; it is not part of CI `check` (verified locally, ~30 s).

## Source modules
| Path | Responsibility |
|---|---|
| `src/app/(site)/` | Home page, shared layout (nav, footer, backdrop) and `/notes` index + `/notes/[slug]` pages with per-note OG card. |
| `src/app/resume/` | Print-optimised `/resume` rendered from `lib/data`, with its own OG card. |
| `src/app/{og.png,sitemap.ts,robots.ts,manifest.ts}` | Build-time OG image, sitemap, robots and web manifest. |
| `src/components/` | UI sections plus the three.js/R3F hero (`HeroScene`, `HeroSceneWrapper`, `HeroPoster`), xterm terminal (`Terminal*`), `Crush80`, `SectionReveal`. |
| `src/content/notes/*.mdx` | The engineering notes; each needs an entry in `src/lib/notes.ts` (newest first). |
| `src/lib/data.ts` | Single source for home, `/resume` and the terminal: projects, experience, education, services, skills, links. |
| `src/lib/terminal.ts` | Pure terminal command output built from `lib/data`. |
| `src/lib/status.ts`, `statusStore.ts` | `/status.json` schema 1, `parseStatus` validation, freshness helpers; the store fetches it once. |
| `src/lib/motion.ts` | Easing, duration, stagger and spring tokens; framer-motion is the only animation library. |
| `src/lib/{phaseMachine,labels,gpu,sceneState,shaders}.ts` | Hero phase machine, tooltip placement, WebGL2 and reduced-motion probes, scene state, shaders. |
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
- Tailwind CSS v4 via `@tailwindcss/postcss`; theme tokens in `src/app/globals.css`.
- Motion values come only from `src/lib/motion.ts`; do not hard-code curves/durations.
- Every claim on the site must be one the owner can back (comment in `data.ts`); counts and stars are dated snapshots, re-check before editing.
- Page copy uses no em dashes in titles (`749af94`).
- Conventional commits (`feat:`, `fix(scope):`, `docs:`, `ci:`, `chore:`, `build(deps):`). No commit-lint job in `.gitlab-ci.yml`.
- No formatter config (no Prettier) is present.

## Pitfalls
1. Pushing to `master` deploys to production; CI `check` must pass first (`needs: check`).
2. Never leak private addresses or unverifiable facts in the client bundle or copy (`6bbbe8b`); the private Plutus link was dropped (`ce863eb`).
3. The hero has one renderer, WebGL2. A WebGPU build once shipped as the default and blanked the hero on GPU Chrome (`eb6023d`); it was removed rather than kept as an unverified opt-in. If one returns, R3F v9 passes the `gl` factory its default props `{ canvas }`, not the bare canvas.
4. R3F canvases default to `pointer-events: auto` and blocked footer clicks (`18fb280`).
5. Tailwind utilities `text-fg/NN` generated nothing until `--color-fg` was defined in the theme (`37ae49e`).
6. `SectionReveal` with a 30% intersection threshold never fired for sections taller than a phone viewport; reveal on any intersection (`6753eee`).
7. Next.js 16.3.0 had RCE advisories (incl. `next/og`); stay on >= 16.4.0 (`bb477f4`).
8. `status.json` written with `mktemp` default mode made nginx return 403; the script sets 0644 before the atomic rename. A privilege-separated Proxmox token needs the role on both user and token (`5c853e8`).
9. Turbopack cannot take JS functions as MDX plugins; name them as strings in `next.config.ts`.
10. A banner or terminal output wider than 80 columns wraps on phones (`edfb255`, `e76b5eb`).
