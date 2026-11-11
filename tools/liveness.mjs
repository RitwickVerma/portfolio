#!/usr/bin/env node
// Build-time project liveness: for every project in src/lib/data.ts that links a public GitLab
// repo, ask the unauthenticated GitLab API for the star count, the last commit on the default
// branch, that branch's newest pipeline and the newest tag, and write src/lib/liveness.generated.json.
//
//   node tools/liveness.mjs            (npm run liveness; also runs in `prebuild`)
//   LIVENESS_SKIP=1 node tools/liveness.mjs     leave the file alone (offline work)
//   LIVENESS_FORCE=1 node tools/liveness.mjs    refetch even if the file is under an hour old
//
// Rules: build time only (nothing here ships to the browser); no dependencies; exit 0 always, so
// GitLab's weather never breaks a build. A project whose fetch fails keeps its previous entry,
// marked source "previous". HTTP 429 stops the whole run and keeps the file as it was. If no
// project could be refreshed the file is not touched at all.
import { readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "src/lib/data.ts");
const OUT = join(ROOT, "src/lib/liveness.generated.json");
const API = "https://gitlab.com/api/v4/projects/";
const TIMEOUT_MS = 15_000;

/** Raised for HTTP 429: the whole run stops and the file stays as it was. */
export class RateLimited extends Error {}

/**
 * [{slug, path}] for every project whose `links` has a gitlab URL, read from the source text of
 * data.ts so the list is never kept by hand. Only the `projects` array is scanned.
 */
export function gitlabProjects(dataSource) {
  const start = dataSource.indexOf("export const projects");
  const end = dataSource.indexOf("\n];", start);
  const body = dataSource.slice(start, end < 0 ? undefined : end);
  const found = [];
  const chunks = body.split(/\n\s*slug:\s*/).slice(1);
  for (const chunk of chunks) {
    const slug = /^"([^"]+)"/.exec(chunk)?.[1];
    const path = /gitlab:\s*"https:\/\/gitlab\.com\/([^"]+?)\/?"/.exec(chunk)?.[1];
    if (slug && path) found.push({ slug, path: path.replace(/\.git$/, "") });
  }
  return found;
}

/** GitLab pipeline status to the three words the site shows; anything else is "no verdict". */
export function pipelineWord(status) {
  if (status === "success") return "passed";
  if (status === "failed") return "failed";
  if (["running", "pending", "created", "preparing", "waiting_for_resource", "scheduled"].includes(status)) return "running";
  return null;
}

export function parseProject(json) {
  if (!json || typeof json !== "object" || typeof json.default_branch !== "string" || json.default_branch === "") {
    throw new Error("project response has no default_branch");
  }
  const stars = Number.isInteger(json.star_count) && json.star_count >= 0 ? json.star_count : null;
  return { defaultBranch: json.default_branch, stars };
}

function validDate(s) {
  return typeof s === "string" && !Number.isNaN(Date.parse(s)) ? new Date(s).toISOString() : null;
}

/** Newest commit's committed date as ISO (UTC), or null for an empty repository. */
export function parseCommits(json) {
  if (!Array.isArray(json)) throw new Error("commits response is not a list");
  return json.length === 0 ? null : validDate(json[0]?.committed_date ?? json[0]?.created_at);
}

export function parsePipelines(json) {
  if (!Array.isArray(json)) throw new Error("pipelines response is not a list");
  return json.length === 0 ? null : pipelineWord(json[0]?.status);
}

export function parseTags(json) {
  if (!Array.isArray(json)) throw new Error("tags response is not a list");
  const name = json[0]?.name;
  return typeof name === "string" && name !== "" ? name : null;
}

/**
 * One project's entry from four API calls. `get(url)` resolves to {status, json}. Commits and the
 * project itself must work; a pipelines or tags endpoint that is hidden (401/403/404) is "none".
 * 429 throws RateLimited; any other failure throws and the caller keeps the previous entry.
 */
export async function fetchEntry(path, get, now = new Date()) {
  const base = API + encodeURIComponent(path);
  const need = async (url) => {
    const r = await get(url);
    if (r.status === 429) throw new RateLimited(url);
    if (r.status < 200 || r.status > 299) throw new Error(`HTTP ${r.status} ${url}`);
    return r.json;
  };
  const optional = async (url) => {
    const r = await get(url);
    if (r.status === 429) throw new RateLimited(url);
    if ([401, 403, 404].includes(r.status)) return [];
    if (r.status < 200 || r.status > 299) throw new Error(`HTTP ${r.status} ${url}`);
    return r.json;
  };
  const { defaultBranch, stars } = parseProject(await need(base));
  const ref = encodeURIComponent(defaultBranch);
  const lastCommit = parseCommits(await need(`${base}/repository/commits?per_page=1&ref_name=${ref}`));
  const pipeline = parsePipelines(await optional(`${base}/pipelines?per_page=1&ref=${ref}`));
  const tag = parseTags(await optional(`${base}/repository/tags?per_page=1&order_by=version&sort=desc`));
  return { lastCommit, pipeline, tag, stars, source: "api", asOf: now.toISOString().slice(0, 10) };
}

/**
 * The whole run, pure but for `get`. `previous` is the parsed file (or null). Returns
 * {file, lines, changed}: `file` is what to write, `changed` is false when nothing was refreshed
 * (the caller then leaves the file on disk alone).
 */
export async function run(list, previous, get, now = new Date()) {
  const prev = previous && typeof previous === "object" && previous.projects ? previous.projects : {};
  const projects = {};
  const lines = [];
  let fresh = 0;
  let stopped = false;
  for (const { slug, path } of list) {
    const old = prev[slug];
    if (!stopped) {
      try {
        projects[slug] = await fetchEntry(path, get, now);
        fresh++;
        const e = projects[slug];
        lines.push(`${slug}: api  last commit ${e.lastCommit ?? "none"}  CI ${e.pipeline ?? "none"}  tag ${e.tag ?? "none"}  stars ${e.stars ?? "?"}`);
        continue;
      } catch (err) {
        if (err instanceof RateLimited) {
          stopped = true;
          lines.push(`${slug}: rate limited (429), stopping; keeping previous data`);
        } else {
          lines.push(`${slug}: failed (${err instanceof Error ? err.message : err}); keeping previous entry`);
        }
      }
    } else {
      lines.push(`${slug}: skipped after 429; keeping previous entry`);
    }
    if (old) projects[slug] = { ...old, source: "previous" };
  }
  if (stopped || fresh === 0) return { file: previous ?? null, lines, changed: false };
  return { file: { fetchedAt: now.toISOString(), projects }, lines, changed: true };
}

/**
 * True when the file already holds a fetch from the last hour that covers every project: a second
 * build minutes later (local gate runs, a retried CI job) then makes no requests. GitLab's
 * unauthenticated limit is per IP and per hour, and shared runners and shared dev boxes spend it
 * fast. LIVENESS_FORCE=1 ignores this.
 */
export function isFresh(previous, list, now = new Date(), maxAgeMs = 3_600_000) {
  const at = Date.parse(previous?.fetchedAt ?? "");
  if (Number.isNaN(at) || now.getTime() - at > maxAgeMs || at > now.getTime() + 60_000) return false;
  return list.every(({ slug }) => previous.projects?.[slug]?.source === "api");
}

async function main() {
  if (process.env.LIVENESS_SKIP) {
    console.log("liveness: LIVENESS_SKIP set, file left as it is");
    return;
  }
  const list = gitlabProjects(readFileSync(DATA, "utf8"));
  let previous = null;
  if (existsSync(OUT)) {
    try {
      previous = JSON.parse(readFileSync(OUT, "utf8"));
    } catch {
      previous = null;
    }
  }
  if (!process.env.LIVENESS_FORCE && isFresh(previous, list)) {
    console.log(`liveness: ${OUT.replace(ROOT + "/", "")} was fetched ${previous.fetchedAt}, under an hour ago; no requests (LIVENESS_FORCE=1 to refetch)`);
    return;
  }
  const get = async (url) => {
    const res = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    let json = null;
    try {
      json = await res.json();
    } catch {
      /* a non-JSON body is only a problem when the status was 2xx; fetchEntry's parsers throw then */
    }
    return { status: res.status, json };
  };
  const { file, lines, changed } = await run(list, previous, get);
  for (const l of lines) console.log(`liveness: ${l}`);
  if (!changed) {
    console.log(`liveness: nothing refreshed, ${OUT.replace(ROOT + "/", "")} kept as it is`);
    return;
  }
  const tmp = `${OUT}.tmp`;
  writeFileSync(tmp, JSON.stringify(file, null, 2) + "\n");
  renameSync(tmp, OUT);
  console.log(`liveness: wrote ${OUT.replace(ROOT + "/", "")} (${Object.keys(file.projects).length} projects, fetched ${file.fetchedAt})`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    // Exit 0 always: the build must not break on GitLab's weather.
    console.log(`liveness: unexpected failure (${err instanceof Error ? err.message : err}); file kept as it is`);
  });
}
