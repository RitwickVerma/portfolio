import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { NO_SOURCE, SOURCES } from "../src/lib/sources";
import { sidewaysOverflow, unfold } from "./helpers";

// Every note figure names where its code comes from: a "Source" fold under the figure with a link to
// the site's module and one to the upstream file at its pinned commit. The table is src/lib/sources.ts;
// whether each upstream path, symbol and line is real, and whether each URL answers 200, is checked
// against GitLab by hand when the table is written (not here: this suite makes no third-party request).

const SLUGS = [...new Set(SOURCES.map((s) => s.slug))];
const BLOB = /^https:\/\/gitlab\.com\/ritwick7\/[\w.-]+\/-\/blob\/[0-9a-f]{40}\/[\w./-]+#L\d+$/;
const SITE_BLOB = /^https:\/\/gitlab\.com\/ritwick7\/portfolio\/-\/blob\/master\/src\/[\w./-]+$/;

test("the table covers eight notes and every figure in them", () => {
  expect(SLUGS).toHaveLength(8);
  expect(Object.keys(NO_SOURCE)).toEqual([]);
});

for (const slug of SLUGS) {
  const entries = SOURCES.filter((s) => s.slug === slug);
  const path = `/notes/${slug}/`;

  test.describe(slug, () => {
    test("every figure has a Source fold; each opens to a site link and an upstream link that match the blob pattern", async ({ page }) => {
      await page.goto(path);
      const folds = page.locator("[data-sources]");
      await expect(folds).toHaveCount(entries.length);
      for (const e of entries) {
        const fold = page.locator(`[data-sources="${e.figure}"]`);
        const details = fold.locator("details");
        await expect(details).not.toHaveAttribute("open", /.*/);
        await unfold(fold.locator("summary").filter({ hasText: "Source" }));
        await expect(details).toHaveAttribute("open", "");
        const links = fold.getByRole("link");
        const site = links.first();
        await expect(site).toBeVisible();
        expect(await site.getAttribute("href")).toMatch(SITE_BLOB);
        expect(await site.getAttribute("href")).toBe(`https://gitlab.com/ritwick7/portfolio/-/blob/master/${e.site.file}`);
        if (e.upstream.repo === null) {
          await expect(links).toHaveCount(1);
          await expect(fold).toContainText("Upstream: none;");
          if (e.slug.startsWith("plutus-")) await expect(fold).toContainText("private repository");
        } else {
          await expect(links).toHaveCount(2);
          const href = await links.nth(1).getAttribute("href");
          expect(href).toMatch(BLOB);
          expect(href).toContain(`/${e.upstream.repo}/-/blob/${e.upstream.commit}/${e.upstream.path}#L${e.upstream.line}`);
          await expect(fold).toContainText(e.upstream.symbol);
          await expect(fold).toContainText(`at ${e.upstream.commit.slice(0, 7)}`);
        }
      }
    });

    test("the links are in the page with JavaScript off, and the fold still opens", async ({ browser }) => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();
      await page.goto(path);
      for (const e of entries) {
        const fold = page.locator(`[data-sources="${e.figure}"]`);
        await expect(fold.locator("a")).toHaveCount(e.upstream.repo === null ? 1 : 2);
        const hrefs = await fold.locator("a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
        expect(hrefs[0]).toMatch(SITE_BLOB);
        if (e.upstream.repo !== null) expect(hrefs[1]).toMatch(BLOB);
        await unfold(fold.locator("summary").filter({ hasText: "Source" }));
        await expect(fold.locator("details")).toHaveAttribute("open", "");
      }
      await context.close();
    });

    for (const scheme of ["light", "dark"] as const) {
      test(`axe finds no violations with every Source fold open, ${scheme}`, async ({ browser, browserName }) => {
        test.skip(browserName !== "chromium", "axe results do not depend on the engine; run once");
        const context = await browser.newContext({ colorScheme: scheme, reducedMotion: "reduce", viewport: { width: 390, height: 844 } });
        const page = await context.newPage();
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        const details = page.locator("[data-sources] details");
        await expect(details).toHaveCount(entries.length);
        // The scan must see the links, or this proves nothing.
        await page.evaluate(() => document.querySelectorAll("[data-sources] details").forEach((d) => d.setAttribute("open", "")));
        await expect(page.locator("[data-sources] a").first()).toBeVisible();
        const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
        expect(violations.map((v) => `${v.id} (${v.impact}): ${v.help} -> ${v.nodes.map((n) => n.target.join(" ")).slice(0, 4).join(" | ")}`)).toEqual([]);
        // The long upstream paths wrap; nothing makes the page scroll sideways at 390 px.
        const o = await sidewaysOverflow(page);
        expect(o.scroll, `sideways overflow: ${o.widest}`).toBeLessThanOrEqual(o.client);
        await context.close();
      });
    }
  });
}
