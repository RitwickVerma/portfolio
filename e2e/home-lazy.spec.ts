import { test, expect, type Page } from "@playwright/test";

// The home page's three below-the-fold figures (keyboard, ambilight, infinite
// canvas) are separate chunks fetched when their box nears the viewport, and
// each is swapped in for a same-size stand-in the server rendered.

/** What each figure's code contains that nothing else on the page does, and what its loaded root looks like. */
const FIGURES = [
  { name: "crush80", code: "Crush 80 keyboard matrix", live: (p: Page) => p.getByRole("group", { name: /^Crush 80 keyboard matrix/ }) },
  { name: "ambilight", code: "createRadialGradient", live: (p: Page) => p.getByRole("img", { name: /A simulated film frame/ }) },
  { name: "canvas", code: "An infinite canvas of windows", live: (p: Page) => p.getByRole("application", { name: /An infinite canvas of windows/ }) },
] as const;

/** Bodies of every script the page fetches, to see which carry a figure's code. */
function collectScripts(page: Page) {
  const bodies: Promise<string>[] = [];
  page.on("response", (r) => {
    if (r.request().resourceType() === "script" && r.status() === 200) bodies.push(r.text().catch(() => ""));
  });
  return async () => (await Promise.all(bodies)).join("\n");
}

test.describe("home page lazy figures", () => {
  test("the first load fetches none of the figures' code, only their stand-ins", async ({ page }) => {
    const scripts = collectScripts(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const loaded = await scripts();
    for (const f of FIGURES) {
      expect(loaded, `${f.name}'s code was fetched on first load`).not.toContain(f.code);
      await expect(page.locator(`[data-standin="${f.name}"]`)).toHaveCount(1);
      await expect(f.live(page)).toHaveCount(0);
    }
    // The hero search stays eager.
    expect(loaded).toContain("Search");
  });

  for (const f of FIGURES) {
    test(`${f.name}: loads when scrolled near and replaces its stand-in`, async ({ page }) => {
      const scripts = collectScripts(page);
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await page.locator(`[data-standin="${f.name}"]`).scrollIntoViewIfNeeded();
      await expect(f.live(page)).toBeVisible();
      await expect(page.locator(`[data-standin="${f.name}"]`)).toHaveCount(0);
      expect(await scripts()).toContain(f.code);
    });
  }

  test("the figures load 600px before they are reached, not after", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const standin = page.locator('[data-standin="crush80"]');
    const top = await standin.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    // Stop 700px short of the board's top edge... below the viewport by more than the margin.
    await page.evaluate((y) => window.scrollTo(0, y - 844 - 700), top);
    await page.waitForTimeout(600);
    await expect(standin).toHaveCount(1);
    // Scroll so the board is 400px below the viewport: inside the margin, still unseen.
    await page.evaluate((y) => window.scrollTo(0, y - 844 - 400), top);
    await expect(page.getByRole("group", { name: /^Crush 80 keyboard matrix/ })).toHaveCount(1);
    const inView = await page.getByRole("group", { name: /^Crush 80 keyboard matrix/ }).evaluate((el) => el.getBoundingClientRect().top > window.innerHeight);
    expect(inView, "the board was loaded before it came into view").toBe(true);
  });

  for (const width of [320, 390, 768, 1440]) {
    test(`stand-ins are the size of the figures at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      // Measure every stand-in's frame first: figures near one another load together once the first is reached.
      // The stand-in sits in the lazy wrapper's div; the figure replaces that div inside the same frame.
      // The keyboard types its demo the moment it is on screen, which changes the caption under the board
      // (a shift of the figure's own making), so for it the board and readout are measured, not the caption.
      const measure = (name: string) =>
        page.locator(`[data-frame="${name}"]`).evaluate((el, n) => {
          const top = el.getBoundingClientRect().top;
          const board = n === "crush80" ? el.querySelector(".glass") : null;
          return (board ?? el).getBoundingClientRect().bottom - top;
        }, name);
      const before: Record<string, number> = {};
      for (const f of FIGURES) {
        await page.locator(`[data-standin="${f.name}"]`).evaluate((el, n) => el.parentElement!.parentElement!.setAttribute("data-frame", n), f.name);
        before[f.name] = await measure(f.name);
      }
      for (const f of FIGURES) {
        await page.locator(`[data-frame="${f.name}"]`).scrollIntoViewIfNeeded();
        await expect(f.live(page)).toBeVisible();
        await expect(page.locator(`[data-standin="${f.name}"]`)).toHaveCount(0);
        const after = await measure(f.name);
        expect(Math.abs(after - before[f.name]), `${f.name}: stand-in ${before[f.name]}px, figure ${after}px`).toBeLessThanOrEqual(1);
      }
    });
  }

  test("with JavaScript off the server HTML carries each stand-in with its caption", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator('[data-standin="crush80"] svg rect')).not.toHaveCount(0);
    await expect(page.locator('[data-standin="crush80"]')).toContainText("Type on it or tap a key");
    await expect(page.locator('[data-standin="ambilight"]')).toContainText("A simulation of the idea: 50 LEDs");
    await expect(page.locator('[data-standin="canvas"]')).toContainText("Each title bar shows its window");
    await context.close();
  });
});
