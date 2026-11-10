#!/usr/bin/env node
// Audit of what the build actually emits, read from out/ (run `npm run build` first).
// Prints one row per page and a list of problems; exits 1 if there is any problem.
//   node tools/seo-audit.mjs [--md]     --md prints a Markdown table
// No dependencies: the HTML is read with a small tag scanner, which is enough
// for the <head> Next.js writes.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

const OUT = join(process.cwd(), "out");
const SITE = "https://www.ritwickverma.dev";
const TITLE_MAX = 59; // "under 60"
const DESC_MAX = 159; // "under 160"
const DESC_MIN = 50;

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const unescapeHtml = (s) =>
  s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

function attrs(tag) {
  const out = {};
  const re = /([a-zA-Z:-]+)(?:="([^"]*)")?/g;
  let m;
  const body = tag.replace(/^<\w+\s*/, "").replace(/\/?>$/, "");
  while ((m = re.exec(body))) out[m[1]] = unescapeHtml(m[2] ?? "");
  return out;
}

function parse(html) {
  const head = html.slice(0, html.indexOf("</head>"));
  const metas = (head.match(/<meta\s[^>]*>/g) ?? []).map(attrs);
  const links = (head.match(/<link\s[^>]*>/g) ?? []).map(attrs);
  const title = unescapeHtml((head.match(/<title>([\s\S]*?)<\/title>/) ?? [, ""])[1]);
  const meta = (key) => metas.filter((m) => m.name === key || m.property === key).map((m) => m.content);
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  return { title, metas, links, meta, ld, canonical: links.filter((l) => l.rel === "canonical").map((l) => l.href) };
}

// PNG width/height straight from the IHDR chunk.
function pngSize(file) {
  const b = readFileSync(file);
  if (b.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

const ISO = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/;
const isUrl = (s) => typeof s === "string" && /^https:\/\/[^\s/]+\.[^\s]+$/.test(s);

// schema.org checks for the types this site uses. `req` are the properties the
// type needs to be meaningful (Google's required/recommended set for it).
const LD_RULES = {
  Person: { req: ["name", "url"], urls: ["url"], urlLists: ["sameAs"] },
  WebSite: { req: ["name", "url"], urls: ["url"] },
  Article: { req: ["headline", "datePublished", "author"], urls: ["url"], dates: ["datePublished", "dateModified"] },
  TechArticle: { req: ["headline", "datePublished", "author"], urls: ["url"], dates: ["datePublished", "dateModified"] },
  BlogPosting: { req: ["headline", "datePublished", "author"], urls: ["url"], dates: ["datePublished", "dateModified"] },
};

function checkLd(raw, problems) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    problems.push(`JSON-LD does not parse: ${e.message}`);
    return [];
  }
  const types = [];
  for (const node of Array.isArray(data) ? data : [data]) {
    if (node["@context"] !== "https://schema.org") problems.push(`JSON-LD ${node["@type"]}: @context is ${JSON.stringify(node["@context"])}`);
    const t = node["@type"];
    types.push(t);
    const rule = LD_RULES[t];
    if (!rule) {
      problems.push(`JSON-LD type ${t} has no rule in the audit`);
      continue;
    }
    for (const k of rule.req) if (node[k] == null || node[k] === "") problems.push(`${t}: missing ${k}`);
    for (const k of rule.urls ?? []) if (node[k] != null && !isUrl(node[k])) problems.push(`${t}.${k} is not an absolute https URL: ${node[k]}`);
    for (const k of rule.urlLists ?? []) for (const u of node[k] ?? []) if (!isUrl(u)) problems.push(`${t}.${k} entry is not an absolute https URL: ${u}`);
    for (const k of rule.dates ?? []) if (node[k] != null && !ISO.test(node[k])) problems.push(`${t}.${k} is not ISO 8601: ${node[k]}`);
    if (node.author && node.author["@type"] !== "Person" && node.author["@type"] !== "Organization") problems.push(`${t}.author has no @type`);
    if (node.author && !node.author.name) problems.push(`${t}.author has no name`);
    if (/Article|BlogPosting/.test(t) && !node.image) problems.push(`${t}: no image (recommended by Google for rich results)`);
  }
  return types;
}

// --- routes -----------------------------------------------------------------

const files = walk(OUT).filter((f) => f.endsWith(".html"));
const routeOf = (f) => {
  const rel = relative(OUT, f).split(sep).join("/");
  if (rel === "404.html") return "/404.html";
  if (rel === "_not-found/index.html") return null; // Next's internal copy of 404.html
  if (rel === "404/index.html") return null;
  return "/" + rel.replace(/index\.html$/, "");
};

const sitemapXml = existsSync(join(OUT, "sitemap.xml")) ? readFileSync(join(OUT, "sitemap.xml"), "utf8") : "";
const sitemap = [...sitemapXml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
  loc: (m[1].match(/<loc>(.*?)<\/loc>/) ?? [, ""])[1],
  lastmod: (m[1].match(/<lastmod>(.*?)<\/lastmod>/) ?? [, ""])[1],
}));
const inSitemap = new Map(sitemap.map((s) => [s.loc, s]));

const rows = [];
const global = [];
const warnings = [];
const titles = new Map();
const descs = new Map();

for (const f of files.sort()) {
  const route = routeOf(f);
  if (!route) continue;
  const p = parse(readFileSync(f, "utf8"));
  const problems = [];
  const is404 = route === "/404.html";
  const robots = [...new Set(p.meta("robots"))].join(",");
  const noindex = /noindex/.test(robots);
  const description = p.meta("description")[0] ?? "";
  const canonical = p.canonical[0] ?? "";
  const expected = is404 ? "" : SITE + route;

  if (!p.title) problems.push("no <title>");
  else if (p.title.length > TITLE_MAX) problems.push(`title is ${p.title.length} chars`);
  if (!description) problems.push("no meta description");
  else {
    if (description.length > DESC_MAX) problems.push(`description is ${description.length} chars`);
    if (description.length < DESC_MIN) problems.push(`description is only ${description.length} chars`);
  }
  if (p.canonical.length > 1) problems.push(`${p.canonical.length} canonical links`);
  if (is404) {
    if (canonical) problems.push(`404 carries a canonical (${canonical})`);
    if (!noindex) problems.push("404 is indexable");
  } else {
    if (!canonical) problems.push("no canonical");
    else if (!canonical.startsWith(SITE + "/")) problems.push(`canonical is not absolute on ${SITE}: ${canonical}`);
    else if (!canonical.endsWith("/")) problems.push(`canonical has no trailing slash: ${canonical}`);
    else if (canonical !== expected) problems.push(`canonical ${canonical} is not this page (${expected})`);
  }

  const og = (k) => p.meta(k)[0] ?? "";
  const tw = (k) => p.meta(k)[0] ?? "";
  const ogImage = og("og:image");
  const isPolicy = /\/privacy-policy\/$/.test(route);
  // A page that declares og:url must declare itself, indexable or not (a 404 or a
  // policy page inheriting the home page's og:url tells a scraper it is the home page).
  if (og("og:url") && og("og:url") !== expected) problems.push(`og:url is ${og("og:url")}, not this page`);
  if (!noindex) {
    for (const k of ["og:title", "og:description", "og:url", "og:image", "og:image:alt", "og:image:width", "og:image:height", "og:type", "og:site_name"])
      if (!og(k)) problems.push(`no ${k}`);
    if (og("og:description") && og("og:description") !== description) problems.push("og:description differs from the meta description");
    if (tw("twitter:card") !== "summary_large_image") problems.push(`twitter:card is ${JSON.stringify(tw("twitter:card"))}`);
    for (const k of ["twitter:title", "twitter:description", "twitter:image", "twitter:image:alt"]) if (!tw(k)) problems.push(`no ${k}`);
    if (tw("twitter:image") && tw("twitter:image") !== ogImage) problems.push("twitter:image differs from og:image");
    if (og("og:image:alt") && tw("twitter:image:alt") && og("og:image:alt") !== tw("twitter:image:alt")) problems.push("og and twitter image alt differ");
    if (ogImage) {
      if (!ogImage.startsWith(SITE + "/")) problems.push(`og:image is not absolute: ${ogImage}`);
      const file = join(OUT, ogImage.replace(SITE, ""));
      if (!existsSync(file)) problems.push(`og:image file missing from out/: ${ogImage}`);
      else {
        const s = pngSize(file);
        if (!s) problems.push(`og:image is not a PNG: ${ogImage}`);
        else if (s.w < 600 || s.w / s.h < 1.9 || s.w / s.h > 2.1) problems.push(`og:image is ${s.w}x${s.h}, want about 2:1 and 600px wide or more`);
        else if (!route.startsWith("/apps/") && (s.w !== 1200 || s.h !== 630)) problems.push(`og:image is ${s.w}x${s.h}, site cards are 1200x630`);
        else if (String(s.w) !== og("og:image:width") || String(s.h) !== og("og:image:height")) problems.push("og:image:width/height do not match the file");
      }
    }
  }
  if (isPolicy) {
    if (!/noindex/.test(robots) || !/nofollow/.test(robots)) problems.push(`policy page robots is ${JSON.stringify(robots)}, want noindex,nofollow`);
    if (inSitemap.has(expected)) problems.push("policy page is in sitemap.xml");
  } else if (!is404 && noindex) problems.push(`unexpected robots ${robots}`);
  else if (!is404 && /nofollow/.test(robots)) problems.push(`unexpected robots ${robots}`);

  const ldTypes = p.ld.flatMap((raw) => checkLd(raw, problems));
  // A note's sitemap lastmod must be the date its own JSON-LD gives.
  for (const raw of p.ld) {
    try {
      const d = JSON.parse(raw);
      if (/Article|BlogPosting/.test(d["@type"])) {
        if (d.image !== ogImage) problems.push(`${d["@type"]}.image ${d.image} is not the page's own card ${ogImage}`);
        const want = d.dateModified ?? d.datePublished;
        const got = (inSitemap.get(expected) ?? {}).lastmod ?? "";
        if (got.slice(0, 10) !== String(want).slice(0, 10)) problems.push(`sitemap lastmod ${got || "(none)"} differs from JSON-LD date ${want}`);
      }
    } catch {}
  }
  if (!noindex && !ldTypes.includes("Person")) problems.push("no Person JSON-LD");

  if (!noindex && !is404) {
    if (!inSitemap.has(expected)) problems.push("indexable page missing from sitemap.xml");
    if (p.title) titles.set(p.title, [...(titles.get(p.title) ?? []), route]);
    if (description) descs.set(description, [...(descs.get(description) ?? []), route]);
  }

  rows.push({ route, title: p.title, description, canonical, ogImage: ogImage.replace(SITE, ""), robots, ld: ldTypes.join("+"), problems });
}

for (const [t, r] of titles) if (r.length > 1) global.push(`duplicate <title> "${t}" on ${r.join(", ")}`);
for (const r of descs.values()) if (r.length > 1) global.push(`duplicate description on ${r.join(", ")}`);

// sitemap.xml
const routes = new Set(rows.map((r) => SITE + r.route));
for (const s of sitemap) {
  if (!s.loc.endsWith("/")) global.push(`sitemap URL without trailing slash: ${s.loc}`);
  if (!routes.has(s.loc)) global.push(`sitemap URL has no page in out/: ${s.loc}`);
  if (/privacy-policy/.test(s.loc)) global.push(`noindex page in sitemap: ${s.loc}`);
  if (!s.lastmod) warnings.push(`no lastmod: ${s.loc}`);
  else if (!ISO.test(s.lastmod)) global.push(`sitemap lastmod is not ISO 8601 for ${s.loc}: ${s.lastmod}`);
  else if (Date.parse(s.lastmod) > Date.now() + 864e5) global.push(`sitemap lastmod is in the future for ${s.loc}: ${s.lastmod}`);
}
if (new Set(sitemap.map((s) => s.loc)).size !== sitemap.length) global.push("sitemap has duplicate URLs");

// robots.txt
const robotsTxt = existsSync(join(OUT, "robots.txt")) ? readFileSync(join(OUT, "robots.txt"), "utf8") : "";
if (!/^User-Agent: \*$/im.test(robotsTxt)) global.push("robots.txt has no User-Agent: *");
if (!robotsTxt.includes(`Sitemap: ${SITE}/sitemap.xml`)) global.push("robots.txt does not point at the sitemap");
if (/^Disallow:\s*\/\s*$/im.test(robotsTxt)) global.push("robots.txt disallows everything");

// --- output -----------------------------------------------------------------
const md = process.argv.includes("--md");
const cell = (s) => String(s || "-").replace(/\|/g, "\\|");
if (md) {
  console.log("| route | title (len) | description (len) | canonical | og image | robots | JSON-LD | problems |");
  console.log("|---|---|---|---|---|---|---|---|");
  for (const r of rows)
    console.log(
      `| ${r.route} | ${cell(r.title)} (${r.title.length}) | ${cell(r.description)} (${r.description.length}) | ${cell(r.canonical.replace(SITE, "") || "")} | ${cell(r.ogImage)} | ${cell(r.robots)} | ${cell(r.ld)} | ${r.problems.length ? cell(r.problems.join("; ")) : "ok"} |`,
    );
} else {
  for (const r of rows) {
    console.log(`${r.route}`);
    console.log(`  title        ${r.title.length}  ${r.title}`);
    console.log(`  description  ${r.description.length}  ${r.description}`);
    console.log(`  canonical    ${r.canonical || "-"}`);
    console.log(`  og:image     ${r.ogImage || "-"}`);
    console.log(`  robots       ${r.robots || "-"}`);
    console.log(`  JSON-LD      ${r.ld || "-"}`);
    console.log(`  problems     ${r.problems.length ? "\n    - " + r.problems.join("\n    - ") : "none"}`);
  }
}
console.log(`\nsitemap.xml: ${sitemap.length} URLs; ${sitemap.filter((s) => s.lastmod).length} with lastmod`);
if (warnings.length) console.log(`\nwarnings (not failures; the repo holds no date for these pages):\n- ${warnings.join("\n- ")}`);
const n = rows.reduce((a, r) => a + r.problems.length, 0) + global.length;
if (global.length) console.log("\nsite-wide problems:\n- " + global.join("\n- "));
console.log(`\n${rows.length} pages, ${n} problem${n === 1 ? "" : "s"}`);
process.exit(n ? 1 : 0);
