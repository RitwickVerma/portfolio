import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { notes } from "../src/lib/notes";
import { sidewaysOverflow } from "./helpers";

// The Related section at the foot of a note: computed at build by the engine (lib/similar.ts), shown
// only when at least two other documents clear the minimum score. Which notes have it follows the
// notes' text, so no test names one: each says what a page must look like if it has the section, and
// "at least some have it" keeps the file from passing on an empty site. The threshold itself, and the
// null it returns, are pinned in similar.test.ts.

const PATHS = notes.map((n) => `/notes/${n.slug}/`);
const HEADING = "What else here is about the same things, by the engine's reckoning.";
const SCORE = /^\d+\.\d{2}$/;

/** The note pages whose built HTML carries the section. */
async function withSection(request: APIRequestContext) {
  const found: string[] = [];
  for (const path of PATHS) {
    const html = await (await request.get(path)).text();
    if (html.includes("data-related")) found.push(path);
  }
  return found;
}

/** What the section says, read from a page that has it. */
async function readRelated(page: Page) {
  const section = page.locator("[data-related]");
  const rows = section.locator("[data-related-row]");
  const caption = (await section.locator("p.fact").first().innerText()).trim();
  const query = caption.replace(/^The engine used this note as the query:\s*/, "").replace(/\.$/, "");
  const links = await rows.locator("h3 a").evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute("href") ?? ""));
  const scores = (await rows.locator("[data-related-score]").allInnerTexts()).map((s) => s.trim());
  return { section, rows, caption, query, links, scores };
}

/** The shape every page with the section must have. */
async function expectWellFormed(page: Page, path: string) {
  const { section, rows, caption, query, links, scores } = await readRelated(page);
  await expect(section).toHaveCount(1);
  await expect(section.getByRole("heading", { level: 2 })).toHaveText(HEADING);
  const n = await rows.count();
  expect(n).toBeGreaterThanOrEqual(2);
  expect(n).toBeLessThanOrEqual(4);
  for (let i = 0; i < n; i++) {
    await expect(rows.nth(i).locator("[data-related-score]")).toBeVisible();
    await expect(rows.nth(i).getByRole("link", { name: /^Why\?/ })).toBeVisible();
  }
  for (const s of scores) expect(s).toMatch(SCORE);
  // Best first, and the note is not among its own links, nor does one place appear twice.
  const numbers = scores.map(Number);
  expect([...numbers].sort((a, b) => b - a)).toEqual(numbers);
  const where = links.map((h) => new URL(h, "http://x"));
  for (const u of where) expect(u.pathname).not.toBe(path);
  expect(new Set(where.map((u) => u.pathname + u.hash)).size).toBe(links.length);
  expect(caption).toMatch(/^The engine used this note as the query: \S+( \S+)+\.$/);
  expect(query.length).toBeLessThanOrEqual(120);
}

test.describe("related: at the foot of a note", () => {
  test("some notes have the section, so the checks below are not empty", async ({ request }) => {
    expect((await withSection(request)).length).toBeGreaterThanOrEqual(4);
  });

  for (const path of PATHS) {
    test(`${path} has the section with 2 to 4 scored rows, or none`, async ({ page }) => {
      await page.goto(path);
      const count = await page.locator("[data-related]").count();
      expect(count).toBeLessThanOrEqual(1);
      if (count === 0) {
        await expect(page.getByText("The engine used this note as the query")).toHaveCount(0);
        return;
      }
      await expectWellFormed(page, path);
      // It sits after the article's text and before the footer.
      const order = await page.evaluate(() => {
        const rel = document.querySelector("[data-related]")!;
        const footer = document.querySelector("article > footer")!;
        const body = document.querySelector(".note")!;
        return {
          afterBody: !!(body.compareDocumentPosition(rel) & Node.DOCUMENT_POSITION_FOLLOWING),
          beforeFooter: !!(rel.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING),
        };
      });
      expect(order).toEqual({ afterBody: true, beforeFooter: true });
    });

    test(`${path}: the section is there with JavaScript off (it is server HTML)`, async ({ browser, request }) => {
      const built = (await (await request.get(path)).text()).includes("data-related");
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();
      await page.goto(path);
      expect(await page.locator("[data-related]").count()).toBe(built ? 1 : 0);
      if (built) await expectWellFormed(page, path);
      await context.close();
    });
  }

  test("every link resolves: 200, and the target's heading or section is there", async ({ page, request, browserName }) => {
    test.skip(browserName !== "chromium", "links do not depend on the engine; run once");
    test.setTimeout(180_000);
    let checked = 0;
    for (const path of await withSection(request)) {
      await page.goto(path);
      const { links } = await readRelated(page);
      for (const href of links) {
        // The status from a fresh request: a page.goto between two "/#..." links is a same-page jump and has no response.
        expect((await request.get(href.split("#")[0])).status(), href).toBe(200);
        await page.goto("about:blank");
        await page.goto(href);
        await expect(page.locator("h1").first(), href).toBeVisible();
        const hash = new URL(href, "http://x").hash.slice(1);
        if (hash) await expect(page.locator(`[id="${decodeURIComponent(hash)}"]`), href).toHaveCount(1);
        checked++;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(8);
  });

  test("Why? opens the search box with the terms in it, a hit, and each row's own score", async ({ page, request, browserName }) => {
    test.skip(browserName !== "chromium", "the arithmetic does not depend on the engine; run once");
    test.setTimeout(240_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const path of await withSection(request)) {
      await page.goto(path);
      const { query, links, scores, rows } = await readRelated(page);
      const why = await rows.first().getByRole("link", { name: /^Why\?/ }).getAttribute("href");
      expect(why).toBe(`/?q=${encodeURIComponent(query)}`);
      await page.goto(why!);
      await expect(page.locator("#q")).toHaveValue(query);
      await expect(page.locator("#hits > li").first()).toBeVisible();
      // Every row's score is the one the box gives its document for this query. The box ranks the
      // record first and the notes' text after idle, so retry until the full index has arrived.
      for (const [i, href] of links.entries()) {
        await expect(async () => {
          const row = page.locator("#hits > li").filter({ has: page.locator(`a[href="${href}"]`) });
          if ((await row.count()) === 0) await page.getByRole("button", { name: /^Show all/ }).click({ timeout: 1_000 });
          await expect(row.first().locator(".font-mono").first()).toHaveText(scores[i], { timeout: 1_000 });
        }, `${path} row ${i}`).toPass({ timeout: 20_000 });
      }
    }
  });
});

test.describe("related: the page around it", () => {
  for (const path of PATHS) {
    for (const scheme of ["light", "dark"] as const) {
      test(`axe finds no violations on ${path} with its Related section, ${scheme}`, async ({ browser, browserName, request }) => {
        test.skip(browserName !== "chromium", "axe results do not depend on the engine; run once");
        test.skip(!(await withSection(request)).includes(path), "this note has no Related section");
        const context = await browser.newContext({ colorScheme: scheme, reducedMotion: "reduce" });
        const page = await context.newPage();
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        await expect(page.locator("[data-related]")).toBeVisible();
        const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
        expect(violations.map((v) => `${v.id} (${v.impact}): ${v.help} -> ${v.nodes.map((n) => n.target.join(" ")).slice(0, 4).join(" | ")}`)).toEqual([]);
        await context.close();
      });
    }
  }

  for (const width of [320, 390] as const) {
    test(`no sideways overflow at ${width} px on any note with the section`, async ({ page, request }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height: 800 });
      const found = await withSection(request);
      expect(found.length).toBeGreaterThan(0);
      for (const path of found) {
        await page.goto(path);
        await page.locator("[data-related]").scrollIntoViewIfNeeded();
        const o = await sidewaysOverflow(page);
        expect(o.scroll, `${path} ${o.widest}`).toBeLessThanOrEqual(o.client);
        expect(o.widest, path).toBe("");
      }
    });
  }
});
