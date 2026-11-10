import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Regressions from the /engine, /design and command-palette review. Each one
// failed on the build before its fix.

const LONG_WORD = "x".repeat(120);

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

  test("two phrases show the 2.25 they multiply by, so stage 4 multiplies back", async ({ page }) => {
    await page.goto("/engine/");
    await page.waitForLoadState("networkidle"); // the key handlers exist only after hydration
    await page.locator("#xray-q").fill('"search engine" "c++"');
    await expect(page.locator("#xray li p.font-mono").first()).toContainText("× 2.25 phrase");
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
    await page.waitForLoadState("networkidle"); // the key handlers exist only after hydration
    await page.keyboard.press("Control+k");
    const dialog = page.getByRole("dialog", { name: "Search this site" });
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("combobox")).toBeFocused();
    await page.keyboard.type("cache");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("the box takes at most 120 characters, like the hero", async ({ page }) => {
    await page.goto("/design/");
    await page.waitForLoadState("networkidle"); // the key handlers exist only after hydration
    await page.keyboard.press("Control+k");
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
        await page.waitForLoadState("networkidle"); // the key handlers exist only after hydration
        await page.keyboard.press("Control+k");
        await expect(page.getByRole("combobox")).toBeFocused();
        if (typed) await page.keyboard.type(typed);
        await expect(page.getByRole("dialog", { name: "Search this site" })).toBeVisible();
        const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa", "best-practice"]).analyze();
        expect(violations.map((v) => v.id)).toEqual([]);
      });
    }
  }
});
