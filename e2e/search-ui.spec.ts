import { test, expect, type Page } from "@playwright/test";
import { sidewaysOverflow } from "./helpers";

// Regressions from the search UI review. Each one failed on the build before its fix.
// Reduced motion keeps the demo query from typing over these; `?q=` ranks after hydration,
// so once the stats line shows, the handlers exist.

const QUERY = "testing";
const LONG_WORD = "x".repeat(120);

/**
 * Open the home page on a query. Unless `settle` is false, wait for the notes' full text to arrive and
 * the query to be ranked against it: the order of the rows changes then, and a click before it
 * would land on a row that moves.
 */
async function open(page: Page, q = QUERY, width = 1440, settle = true) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`/?q=${encodeURIComponent(q)}`);
  await expect(page.getByText(/ranked in your browser/)).toBeVisible();
  if (!settle) return;
  await expect(page.getByText(/indexed in this tab in/)).toBeVisible();
  // The line above the list counts the documents it ranked against; the one below counts the index's.
  await expect
    .poll(async () => {
      const index = (await page.getByText(/^\d+ documents, [\d,]+ terms/).innerText()).match(/^(\d+) documents/)?.[1];
      const ranked = (await page.getByText(/ranked in your browser/).innerText()).match(/of (\d+) documents/)?.[1];
      return index === ranked;
    })
    .toBe(true);
}

/** The numbers of a displayed "a × b × c = d" line, with anything in brackets left out. */
function arithmetic(line: string) {
  const [lhs, rhs] = line.replace(/\([^)]*\)/g, "").split("=");
  const parts = lhs.split("×").map((s) => s.trim());
  const factors = parts.map((s) => parseFloat(s));
  return { parts, product: factors.reduce((p, n) => p * n, 1), total: parseFloat(rhs) };
}

test.describe("the full index arriving", () => {
  test("keeps the arrow-key selection and the open Why? panel", async ({ page }) => {
    // Hold /search-index.json until the visitor has selected a row and opened its explanation.
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    await page.route("**/search-index.json", async (route) => {
      await gate;
      await route.continue();
    });
    await open(page, QUERY, 1440, false);
    const stats = page.getByText(/ranked in your browser/);
    const total = async () => (await stats.innerText()).match(/of (\d+) documents/)?.[1];
    const before = await total();

    await page.locator("#q").click();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    const selected = page.locator('#hits > li[data-selected="true"]');
    await expect(selected).toHaveCount(1);
    const title = await selected.locator("h3").innerText();
    await selected.locator("button[aria-expanded]").click();
    await expect(selected.getByText("Why it ranks here")).toBeVisible();

    release();
    await expect(page.getByText(/indexed in this tab in/)).toBeVisible();
    // Wait for the query to run again against the notes' full text: the document count changes.
    await expect.poll(total).not.toBe(before);

    await expect(selected).toHaveCount(1);
    await expect(selected.locator("h3")).toHaveText(title);
    await expect(selected.locator("button[aria-expanded]")).toHaveAttribute("aria-expanded", "true");
    await expect(selected.getByText("Why it ranks here")).toBeVisible();
  });
});

test.describe("Show all results", () => {
  for (const [width, first] of [[1440, 6], [390, 3]] as const) {
    test(`moves focus to the first revealed row at ${width}px`, async ({ page }) => {
      await open(page, QUERY, width);
      await page.getByRole("button", { name: /^Show all \d+ results$/ }).click();
      await expect(page.locator(`#hit-${first} a`)).toBeFocused();
    });
  }
});

test.describe("the Why? control", () => {
  for (const width of [320, 390, 1440]) {
    test(`opens the arithmetic at ${width}px, from a 44px target`, async ({ page }) => {
      await open(page, QUERY, width);
      const why = page.locator("#hit-0 button[aria-expanded]");
      await expect(why).toBeVisible();
      const box = (await why.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(width < 640 ? 44 : 40);
      expect(box.height).toBeGreaterThanOrEqual(width < 640 ? 44 : 20);
      await expect(why).toHaveAttribute("aria-expanded", "false");
      await why.click();
      await expect(why).toHaveAttribute("aria-expanded", "true");
      await expect(page.locator("#hit-0").getByText("Why it ranks here")).toBeVisible();
      const { scroll, client, widest } = await sidewaysOverflow(page);
      expect(scroll, `page scrolls sideways; widest element: ${widest}`).toBeLessThanOrEqual(client);
      await why.click();
      await expect(why).toHaveAttribute("aria-expanded", "false");
    });

    test(`the arithmetic fits its panel at ${width}px, nothing scrolls sideways`, async ({ page }) => {
      await open(page, QUERY, width);
      await page.locator("#hit-0 button[aria-expanded]").click();
      const panel = page.locator("#hit-0 [data-explain]");
      await expect(panel).toBeVisible();
      const fit = await panel.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
      expect(fit.scroll, "the panel scrolls sideways").toBe(fit.client);
      if (width < 640) {
        // Phone: each term is a stacked item whose line multiplies back: weight x idf x saturation = score.
        const items = panel.getByRole("list", { name: "Score by term" }).getByRole("listitem");
        expect(await items.count()).toBeGreaterThan(0);
        for (let i = 0; i < (await items.count()); i++) {
          const item = items.nth(i);
          const [w, idf, sat, score] = ((await item.innerText()).match(/(-?\d+\.\d+)\s*weight\s*×\s*(-?\d+\.\d+)\s*idf\s*×\s*(-?\d+\.\d+)\s*saturation\s*=\s*(-?\d+\.\d+)/)?.slice(1) ?? []).map(Number);
          expect(score, `term ${i} shows its four numbers`).toBeDefined();
          // The row prints as many decimals of the last factor as it takes: the product is the printed score to under half a cent.
          expect(Math.abs(w * idf * sat - score), `term ${i} multiplies back`).toBeLessThan(0.005);
          const box = (await item.boundingBox())!;
          expect(box.x + box.width).toBeLessThanOrEqual(width);
        }
      } else {
        await expect(panel.locator("table")).toBeVisible();
      }
    });

    test(`the help text names what is on screen at ${width}px`, async ({ page }) => {
      await open(page, QUERY, width);
      await page.getByRole("button", { name: "Query syntax" }).click();
      const help = page.locator("search dl");
      await expect(help).toContainText("Why?");
      await expect(help).not.toContainText("Click a score");
      await expect(page.locator("#hit-0 button[aria-expanded]")).toBeVisible();
    });
  }
});

test.describe("keyboard selection", () => {
  test("ArrowDown stays on the rows a phone can see", async ({ page }) => {
    await open(page, QUERY, 390);
    await page.locator("#q").click();
    for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowDown");
    const selected = page.locator('#hits > li[data-selected="true"]');
    await expect(selected).toHaveCount(1);
    await expect(selected).toHaveAttribute("id", "hit-2");
    await expect(selected).toBeVisible();
    await expect(page.getByRole("status")).toContainText("Result 3 of 3");
  });

  test("a wide screen walks all six rows before Show all", async ({ page }) => {
    await open(page, QUERY, 1440);
    await page.locator("#q").click();
    for (let i = 0; i < 9; i++) await page.keyboard.press("ArrowDown");
    await expect(page.locator('#hits > li[data-selected="true"]')).toHaveAttribute("id", "hit-5");
    await expect(page.getByRole("status")).toContainText("Result 6 of 6");
  });
});

test.describe("an unbroken 120-character word", () => {
  for (const width of [320, 390]) {
    test(`does not widen the home page at ${width}px, and its plan chip stays inside`, async ({ page }) => {
      await open(page, LONG_WORD, width);
      await expect(page.getByText(/No document matches/)).toBeVisible();
      const { scroll, client, widest } = await sidewaysOverflow(page);
      expect(scroll, `page scrolls sideways; widest element: ${widest}`).toBeLessThanOrEqual(client);
      expect(widest, "an element pokes out of the viewport").toBe("");
      const plan = page.locator('ul[aria-label^="Query plan"]');
      const list = (await plan.boundingBox())!;
      expect(await plan.locator("li").count(), "plan chips to measure").toBeGreaterThan(0);
      for (const chip of await plan.locator("li").all()) {
        const b = (await chip.boundingBox())!;
        expect(b.x + b.width, "a plan chip is wider than its list").toBeLessThanOrEqual(list.x + list.width + 0.5);
      }
    });
  }
});

test.describe("the arithmetic under a result", () => {
  const cases = ["kind:note", "performance testing", '"search engine" "c++"', "fitment", "tech:kotlin"];
  for (const q of cases) {
    test(`multiplies back as displayed for “${q}”`, async ({ page }) => {
      await open(page, q);
      await page.locator("#hit-0 button[aria-expanded]").click();
      const line = page.locator("#hit-0 p.font-mono").last();
      const text = await line.innerText();
      const { parts, product, total } = arithmetic(text);
      expect(Math.abs(product - total), `“${text}” does not multiply back`).toBeLessThan(0.0105);
      for (const p of parts) expect(p, "factors are shown to at most three decimals").not.toMatch(/\.\d{4,}/);
      if (q.startsWith("kind:") || q.startsWith("tech:")) {
        expect(text).toMatch(/listed by the filter/);
        expect(text).not.toMatch(/^0\.00/);
      }
    });
  }
});

test.describe("plan chips for a screen reader", () => {
  test("read the term, then the document count, with a separator", async ({ page }) => {
    await open(page, "search ");
    const first = page.locator('ul[aria-label^="Query plan"] li').first();
    await expect(first).toHaveText(/^search, in \d+ documents?$/);
  });

  test("a filter chip reads kind and its value apart", async ({ page }) => {
    await open(page, "kind:note ");
    await expect(page.locator('ul[aria-label^="Query plan"] li[data-source="filter"]')).toHaveText("kind: Note");
  });
});

test.describe("aria-controls", () => {
  test("names an element that exists with results, with none, and before any query", async ({ page }) => {
    await open(page, "zzzzqqqqq");
    await expect(page.getByText(/No document matches/)).toBeVisible();
    await expect(page.locator("#q")).toHaveAttribute("aria-controls", "hits");
    await expect(page.locator("#hits")).toHaveCount(1);
    await page.locator("#q").fill(QUERY);
    await expect(page.locator("#hits > li").first()).toBeVisible();
    await expect(page.locator("#hits")).toHaveCount(1);
  });
});

test.describe("facet chips, the cases a review broke", () => {
  test("a chip closes an open quote, so the filter is a filter and not part of the phrase", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const box = page.locator("#q");
    await expect(async () => {
      await box.fill('"reverse engineering');
      await expect(page.getByRole("group", { name: "Narrow by kind" })).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 20_000 });
    // The first chip after "All": whatever kind leads for this phrase.
    const chip = page.getByRole("group", { name: "Narrow by kind" }).getByRole("button").nth(1);
    const kind = ((await chip.innerText()).match(/^(.*?)\s+\d+$/) ?? [])[1];
    expect(kind, "a kind chip to click").toBeTruthy();
    await chip.click();
    await expect(box).toHaveValue(/^"reverse engineering" kind:[a-z]+ $/);
    const rows = page.locator("#hits > li");
    await expect(rows.first()).toBeVisible();
    const labels = await rows.evaluateAll((els) => els.map((el) => (el.textContent ?? "").trim()));
    expect(labels.length).toBeGreaterThan(0);
    for (const text of labels) expect(text.startsWith(kind!), `${text.slice(0, 30)} is a ${kind}`).toBe(true);
  });

  test("a chip replaces a negated kind filter instead of leaving it behind", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const box = page.locator("#q");
    await expect(async () => {
      await box.fill("testing -kind:note ");
      await expect(page.getByRole("group", { name: "Narrow by kind" })).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 20_000 });
    await page.getByRole("group", { name: "Narrow by kind" }).getByRole("button", { name: /^Project \d+$/ }).click();
    await expect(box).toHaveValue("testing kind:project ");
  });
});
