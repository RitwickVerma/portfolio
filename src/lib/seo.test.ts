import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { personJsonLd, jsonLdString, cardMetadata, ogAlt, OG_CARDS, TITLE_MAX, DESCRIPTION_MAX, SITE_TITLE, SITE_DESCRIPTION } from "./seo";
import { EBAY_ENDED, SITE_URL } from "./data";
import { notes, noteUrl } from "./notes";
import { apps } from "./apps";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";

const APP_DIR = join(__dirname, "..", "app");
const read = (...p: string[]) => readFileSync(join(APP_DIR, ...p), "utf8");
const SUFFIX = " · Ritwick Verma";

describe("personJsonLd", () => {
  const p = personJsonLd();

  it("is a schema.org Person with the required fields", () => {
    expect(p["@context"]).toBe("https://schema.org");
    expect(p["@type"]).toBe("Person");
    expect(p.name).toBe("Ritwick Verma");
    expect(p.url).toBe("https://www.ritwickverma.dev");
    expect(p.jobTitle).toBeTruthy();
    // The employer is claimed only while the role is current (EBAY_SEPARATION in lib/data).
    if (EBAY_ENDED) expect(p.worksFor).toBeUndefined();
    else expect(p.worksFor?.name).toBe("eBay");
  });

  it("lists both alma maters and the three profiles", () => {
    expect(p.alumniOf.map((a) => a.name)).toEqual([
      "University of California, Irvine",
      "SRM Institute of Science and Technology",
    ]);
    expect(p.sameAs).toHaveLength(3);
    for (const url of p.sameAs) expect(url).toMatch(/^https:\/\//);
    expect(p.sameAs).toContain("https://www.linkedin.com/in/ritwick-verma/");
  });

  it("exposes no contact details", () => {
    expect(JSON.stringify(p)).not.toMatch(/@gmail|phone|tel:/i);
  });
});

describe("jsonLdString", () => {
  it("escapes < so the payload cannot close its script tag", () => {
    expect(jsonLdString({ a: "</script><b>" })).not.toContain("<");
  });
});

describe("Person JSON-LD as shipped", () => {
  const p = personJsonLd();

  it("survives serialisation: what a crawler parses is what we built", () => {
    expect(JSON.parse(jsonLdString(p))).toEqual(JSON.parse(JSON.stringify(p)));
  });

  it("uses absolute https URLs for every url, sameAs and employer link", () => {
    const urls = [p.url, ...p.sameAs, ...(p.worksFor ? [p.worksFor.url] : [])];
    for (const u of urls) {
      expect(() => new URL(u), u).not.toThrow();
      expect(new URL(u).protocol, u).toBe("https:");
    }
    expect(new Set(p.sameAs).size).toBe(p.sameAs.length);
  });

  it("types every nested object, so none is read as a bare string", () => {
    for (const a of p.alumniOf) expect(a["@type"]).toBe("CollegeOrUniversity");
    if (p.worksFor) expect(p.worksFor["@type"]).toBe("Organization");
  });
});

describe("page-specific social cards", () => {
  for (const [key, card] of Object.entries(OG_CARDS)) {
    describe(key, () => {
      const description = "x";
      const m = cardMetadata(card, { socialTitle: "T", description });
      const og = m.openGraph as { url: string; images: { url: string; width: number; height: number; alt: string }[]; type: string; title: string; description: string };
      const tw = m.twitter as { card: string; images: { url: string; alt: string }[]; title: string; description: string };

      it("points canonical, og:url and the image at this page's own paths", () => {
        expect(card.path).toMatch(/^\/[a-z]+\/$/);
        expect(m.alternates?.canonical).toBe(card.path);
        expect(og.url).toBe(card.path);
        expect(card.image).toBe(`${card.path}og.png`);
        expect(og.images[0].url).toBe(card.image);
        expect(og.images[0]).toMatchObject({ width: 1200, height: 630 });
      });

      it("says in the alt text what the card says, and uses the same image and alt on twitter", () => {
        const alt = og.images[0].alt;
        expect(alt).toBe(ogAlt(card));
        for (const part of [card.name, card.line, card.lineTwo]) expect(alt).toContain(part);
        expect(tw.images[0]).toEqual({ url: card.image, alt });
        expect(tw.card).toBe("summary_large_image");
        expect([tw.title, tw.description]).toEqual([og.title, og.description]);
      });

      it("is not typed as an article: there is no author or published time to go with it", () => {
        expect(og.type).toBe("website");
      });

      it("has a card route that renders it, and a page that uses it", () => {
        const route = read("(site)", key, "og.png", "route.tsx");
        expect(route).toContain(`renderOg(OG_CARDS.${key})`);
        expect(route).toContain('dynamic = "force-static"');
        expect(read("(site)", key, "page.tsx")).toContain(`cardMetadata(OG_CARDS.${key},`);
      });

      it("only says what its page already says", () => {
        const page = read("(site)", key, "page.tsx");
        // Sentence-initial capitals aside, each line must be a stretch of the page's own text.
        const lower = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
        for (const part of [card.line, card.lineTwo]) {
          expect(page.includes(part) || page.includes(lower(part)), part).toBe(true);
        }
        // The name is the page's <h1> (or its title string).
        expect(page.includes(`>${card.name}<`) || page.includes(`"${card.name}"`), card.name).toBe(true);
        expect(card.eyebrow).toBe(`ritwickverma.dev${card.path.slice(0, -1)}`);
      });
    });
  }
});

describe("titles and descriptions", () => {
  const pageSource = (key: string) => read("(site)", key, "page.tsx");
  const constDescription = (src: string) => /const DESCRIPTION =\s*"([^"]+)"/.exec(src)?.[1] ?? "";

  it("engine and design keep the meta description under 160 characters", () => {
    for (const key of Object.keys(OG_CARDS)) {
      const d = constDescription(pageSource(key));
      expect(d.length, key).toBeGreaterThan(50);
      expect(d.length, `${key}: ${d.length} chars`).toBeLessThanOrEqual(DESCRIPTION_MAX);
    }
  });

  it("every <title> stays under 60 characters, with the suffix the layout adds", () => {
    expect(SITE_TITLE.length).toBeLessThanOrEqual(TITLE_MAX);
    for (const key of Object.keys(OG_CARDS)) {
      const title = /^\s*title: "([^"]+)"/m.exec(pageSource(key))?.[1] ?? "";
      expect(title, key).not.toBe("");
      expect((title + SUFFIX).length, title).toBeLessThanOrEqual(TITLE_MAX);
    }
    // Mirrors generateMetadata in notes/[slug]: past 43 characters a note drops the suffix.
    for (const n of notes) {
      const shown = n.title.length > 43 ? n.title : n.title + SUFFIX;
      expect(shown.length, n.slug).toBeLessThanOrEqual(TITLE_MAX);
    }
    for (const a of Object.values(apps)) expect((a.name + SUFFIX).length, a.slug).toBeLessThanOrEqual(TITLE_MAX);
  });

  it("every other description is under 160 characters", () => {
    expect(SITE_DESCRIPTION.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    for (const n of notes) expect(n.summary.length, n.slug).toBeLessThanOrEqual(DESCRIPTION_MAX);
    for (const a of Object.values(apps)) expect(a.tagline.length, a.slug).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });

  it("no two indexable pages share a title or a description", () => {
    const seen = [
      SITE_DESCRIPTION,
      ...Object.keys(OG_CARDS).map((k) => constDescription(pageSource(k))),
      ...notes.map((n) => n.summary),
      ...Object.values(apps).map((a) => a.tagline),
    ];
    expect(new Set(seen).size).toBe(seen.length);
    const titles = [...notes.map((n) => n.title), ...Object.values(apps).map((a) => a.name)];
    expect(new Set(titles).size).toBe(titles.length);
  });
});

describe("sitemap.xml", () => {
  const entries = sitemap();
  const urls = entries.map((e) => e.url);

  // Pages that exist under src/app, by walking for page.tsx; [slug] routes expand to the registry.
  function pageRoutes(dir: string, prefix = ""): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (!statSync(path).isDirectory()) return name === "page.tsx" ? [prefix || "/"] : [];
      if (name.startsWith("(")) return pageRoutes(path, prefix);
      return pageRoutes(path, `${prefix}/${name}`);
    });
  }

  it("lists every indexable page once, as an absolute URL with a trailing slash", () => {
    const expected = pageRoutes(APP_DIR).flatMap((r) => {
      if (r === "/notes/[slug]") return notes.map((n) => noteUrl(n));
      if (r === "/apps/[slug]") return Object.values(apps).map((a) => `/apps/${a.slug}/`);
      if (r.endsWith("/privacy-policy")) return [];
      return [r === "/" ? "/" : `${r}/`];
    });
    expect(expected.length).toBeGreaterThan(5);
    expect([...urls].sort()).toEqual(expected.map((r) => `${SITE_URL}${r}`).sort());
    expect(new Set(urls).size).toBe(urls.length);
    for (const u of urls) expect(u.endsWith("/"), u).toBe(true);
  });

  it("leaves the noindex privacy-policy pages out, and they stay noindex,nofollow", () => {
    for (const u of urls) expect(u).not.toContain("privacy-policy");
    expect(read("apps", "[slug]", "privacy-policy", "page.tsx")).toContain("robots: { index: false, follow: false }");
  });

  it("gives lastmod only where the repo has a date, as YYYY-MM-DD, never in the future", () => {
    const today = new Date().toISOString().slice(0, 10);
    const withDate = entries.filter((e) => e.lastModified !== undefined);
    for (const e of withDate) {
      expect(typeof e.lastModified, e.url).toBe("string");
      expect(e.lastModified as string, e.url).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect((e.lastModified as string) <= today, e.url).toBe(true);
    }
    for (const n of notes) {
      expect(entries.find((e) => e.url === `${SITE_URL}${noteUrl(n)}`)?.lastModified, n.slug).toBe(n.updated ?? n.date);
    }
    const newest = notes.map((n) => n.updated ?? n.date).sort().at(-1);
    expect(entries.find((e) => e.url === `${SITE_URL}/notes/`)?.lastModified).toBe(newest);
    // No build-time stamp on anything else: it would change every deploy.
    expect(withDate).toHaveLength(notes.length + 1);
  });
});

describe("robots.txt", () => {
  const r = robots();

  it("allows crawling and names the sitemap", () => {
    expect(r.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
    expect(r.rules).toEqual({ userAgent: "*", allow: "/" });
  });

  it("does not disallow the noindex pages: a crawler that cannot fetch them never sees the noindex", () => {
    expect(JSON.stringify(r.rules)).not.toContain("disallow");
  });
});
