import { test, expect, type Page, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Regressions from the /engine, /design and command-palette review. Each one
// failed on the build before its fix.

const LONG_WORD = "x".repeat(120);
/**
 * Open the command palette with Ctrl+K. `networkidle` says the network is quiet, not that React has
 * hydrated, and on a slow CI runner the first keypress landed before the key handler existed, so the
 * palette never opened ("element(s) not found" on the combobox). Press again until the dialog shows.
 */
async function openPalette(page: Page): Promise<Locator> {
  const dialog = page.getByRole("dialog", { name: "Search this site" });
  await expect(async () => {
    if (!(await dialog.isVisible())) await page.keyboard.press("Control+k");
    await expect(dialog).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  return dialog;
}


test.describe("engine room", () => {
  test("a link in the replay table takes that query apart in the X-ray, and the address follows", async ({ page }) => {
    await page.goto("/engine/");
    await page.waitForLoadState("networkidle"); // the key handlers exist only after hydration
    await expect(page.locator("#xray-q")).toHaveValue("performance testing");
    await page.locator("#replay a", { hasText: "kotlin" }).first().click();
    // The replay ran finished words, so the X-ray takes the same query, trailing space and all.
    await expect(page.locator("#xray-q")).toHaveValue("kotlin ");
    await expect(page).toHaveURL(/\/engine\/\?q=kotlin\+$/);
    await page.locator("#xray-q").fill("");
    await expect(page).toHaveURL(/\/engine\/$/);
  });

  test("the replay shows the queries where the rankers differ and folds the rest into a details", async ({ page }) => {
    await page.goto("/engine/");
    await page.waitForLoadState("networkidle");
    const differ = page.locator("[data-replay-differ] tbody tr");
    const agree = page.locator("[data-replay-agree] tbody tr");
    const nDiffer = await differ.count();
    const nAgree = await agree.count();
    expect(nDiffer).toBeGreaterThan(0);
    expect(nAgree).toBeGreaterThan(0);
    // The lede counts the differing ones; the summary counts the folded ones; no row was dropped.
    await expect(page.locator("#replay")).toContainText(`${nDiffer} of ${nDiffer + nAgree} come out differently`);
    await expect(page.locator("#replay h2")).toContainText(`${nDiffer + nAgree} judged queries`);
    const details = page.locator("[data-replay-agree]");
    await expect(details.locator("summary")).toHaveText(`Show the other ${nAgree} queries, where both rankers agree`);
    expect(await details.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(false);
    await expect(agree.first()).toBeHidden();
    // Visible rows each differ: a different first rank, or a different nDCG.
    for (let i = 0; i < nDiffer; i++) {
      const cells = await differ.nth(i).locator("td").allInnerTexts();
      const [c, t] = cells[3].split(",").map((x) => Number(x.trim()));
      expect(cells[1] !== cells[2] || Math.abs(c - t) > 0.005, `row ${cells[0]} differs`).toBe(true);
    }
    await details.locator("summary").click();
    await expect(agree.first()).toBeVisible();
    for (let i = 0; i < nAgree; i++) {
      const cells = await agree.nth(i).locator("td").allInnerTexts();
      const [c, t] = cells[3].split(",").map((x) => Number(x.trim()));
      expect(cells[1] === cells[2] && Math.abs(c - t) <= 0.005, `row ${cells[0]} agrees`).toBe(true);
    }
  });

  test("the folded replay rows open without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/engine/");
    const agree = page.locator("[data-replay-agree] tbody tr");
    await expect(agree.first()).toBeHidden();
    await page.locator("[data-replay-agree] summary").click();
    await expect(agree.first()).toBeVisible();
    await context.close();
  });

  test("two phrases show the 2.25 they multiply by, so stage 3 multiplies back", async ({ page }) => {
    await page.goto("/engine/");
    await page.waitForLoadState("networkidle"); // the key handlers exist only after hydration
    // Filled again until it takes: a fill that lands before hydration is overwritten by the first render.
    await expect(async () => {
      await page.locator("#xray-q").fill('"search engine" "c++"');
      await expect(page.locator("#xray li p.font-mono").first()).toContainText("× 2.25 phrase", { timeout: 2000 });
    }).toPass({ timeout: 20_000 });
  });

  test("an unbroken 120-character word does not widen the page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/engine/");
    await page.waitForLoadState("networkidle"); // the key handlers exist only after hydration
    await page.locator("#xray-q").fill(LONG_WORD);
    const widths = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, view: document.documentElement.clientWidth }));
    expect(widths.doc).toBeLessThanOrEqual(widths.view);
  });

  test("the benchmark's throughput comes from search time, not wall time", async ({ page }) => {
    await page.goto("/engine/");
    await page.waitForLoadState("networkidle"); // the key handlers exist only after hydration
    await page.getByRole("button", { name: /Run 6,000 queries/ }).click();
    await expect(page.locator("#latency")).toContainText("ms of search time");
  });
});

test.describe("command palette", () => {
  test("Esc closes it even with text in the box", async ({ page }) => {
    await page.goto("/design/");
    await page.waitForLoadState("networkidle");
    const dialog = await openPalette(page);
    await expect(page.getByRole("combobox")).toBeFocused();
    await page.keyboard.type("cache");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("the box takes at most 120 characters, like the hero", async ({ page }) => {
    await page.goto("/design/");
    await page.waitForLoadState("networkidle");
    await openPalette(page);
    await expect(page.getByRole("combobox")).toBeFocused();
    await page.keyboard.type("y".repeat(200));
    await expect(page.getByRole("combobox")).toHaveValue("y".repeat(120));
  });

  for (const scheme of ["light", "dark"] as const) {
    for (const typed of ["", "cache", LONG_WORD]) {
      test(`passes axe in ${scheme} with ${typed ? `“${typed.slice(0, 8)}”` : "nothing"} typed`, async ({ page }) => {
        // Reduced motion: the palette settles open, and a scan taken mid-fade reads the half-faded text as low contrast.
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
        await page.goto("/design/");
        await page.waitForLoadState("networkidle");
        await openPalette(page);
        await expect(page.getByRole("combobox")).toBeFocused();
        if (typed) await page.keyboard.type(typed);
        const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa", "best-practice"]).analyze();
        expect(violations.map((v) => v.id)).toEqual([]);
      });
    }
  }
});
