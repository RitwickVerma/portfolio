import { test, expect } from "@playwright/test";

// The home page's record sections, operated. Each test reads a number off the page and checks the
// figure beside it was drawn from it, not just that something is on screen.

const px = async (loc: import("@playwright/test").Locator) => (await loc.boundingBox())!.width;

test.describe("work figures", () => {
  test("replay funnel: three numbers from the bullet, drawn on a log axis", async ({ page }) => {
    await page.goto("/");
    const item = page.locator("#work-0-2");
    await expect(item).toContainText("50,000 production queries");
    const fig = item.getByRole("figure", { name: /Replay funnel/ });
    await expect(fig).toBeVisible();
    for (const n of ["50,000", "167", "6"]) await expect(fig.locator("span.font-mono", { hasText: new RegExp(`^${n}$`) })).toHaveCount(1);
    const bars = fig.locator("[data-share]");
    await expect(bars).toHaveCount(3);
    const [q, b, a] = [await px(bars.nth(0)), await px(bars.nth(1)), await px(bars.nth(2))];
    const track = await px(bars.nth(0).locator("xpath=..")); // the bar's own cell is the whole axis
    // Log axis 1 to 100,000: a bar is log10(value) / 5 of the track.
    expect(q / track).toBeCloseTo(Math.log10(50000) / 5, 1);
    expect(b / track).toBeCloseTo(Math.log10(167) / 5, 1);
    expect(a / track).toBeCloseTo(Math.log10(6) / 5, 1);
    await expect(fig.locator("figcaption")).toContainText("Log axis");
  });

  test("test-suite bar: the split is the counts in the sentence", async ({ page }) => {
    await page.goto("/");
    const item = page.locator("#work-0-1");
    await expect(item).toContainText("2,549 unit and 511 regression tests");
    const fig = item.getByRole("figure", { name: /Test suite/ });
    const [u, r] = [await px(fig.locator("[data-share]").nth(0)), await px(fig.locator("[data-share]").nth(1))];
    expect(u / r).toBeCloseTo(2549 / 511, 0);
    await expect(fig).toContainText("2,549");
    await expect(fig).toContainText("511");
  });

  test("scope counters: one square per site and per catalog", async ({ page }) => {
    await page.goto("/");
    const item = page.locator("#work-0-0");
    await expect(item).toContainText("16 sites and 19 catalogs");
    const fig = item.getByRole("figure", { name: /Fitment scope/ });
    await expect(fig.locator("dd").nth(0).locator("span")).toHaveCount(16);
    await expect(fig.locator("dd").nth(1).locator("span")).toHaveCount(19);
  });

  test("a bullet without these numbers stays prose", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#work-0-3 figure")).toHaveCount(0);
    await expect(page.locator("#work-0-5 figure")).toHaveCount(0);
  });

  test("figures are in the server HTML: no JavaScript needed", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.locator("#work-0-2").getByRole("figure", { name: /Replay funnel/ })).toBeVisible();
    await expect(page.locator("#work-0-1").getByRole("figure", { name: /Test suite/ })).toBeVisible();
    await expect(page.locator("#work-0-0").getByRole("figure", { name: /Fitment scope/ })).toBeVisible();
    await ctx.close();
  });
});

test.describe("timeline is navigation", () => {
  test("pressing an eBay bar goes to that role's rows, with plain links", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const links = page.locator("#work figure a[href^='#work-role-']:visible");
    await expect(links).toHaveCount(2);
    await expect(links.nth(0)).toHaveAttribute("href", "#work-role-0");
    await expect(links.nth(1)).toHaveAttribute("href", "#work-role-1");
    await links.nth(1).click();
    await expect(page).toHaveURL(/#work-role-1$/);
    await expect(page.locator("#work-role-1")).toBeInViewport();
    await expect(page.locator("#work-role-1")).toContainText("Software Engineer 2");
    // The internships are not links.
    await expect(page.locator("#work figure a:visible")).toHaveCount(2);
  });

  test("on a phone the rows are links too", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const link = page.locator("#work figure a[href='#work-role-0']:visible");
    await expect(link).toHaveCount(1);
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await link.click();
    await expect(page).toHaveURL(/#work-role-0$/);
    await expect(page.locator("#work-role-0")).toBeInViewport();
  });
});

test.describe("before eBay", () => {
  test("a strip of roles by period with their stack, descriptions folded", async ({ page }) => {
    await page.goto("/");
    const earlier = page.locator("#earlier");
    const rows = earlier.locator("ol > li");
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText("Jun – Sep 2020");
    await expect(rows.nth(0)).toContainText("Shoelace Wireless");
    for (const t of ["Android", "Mapbox", "Retrofit", "MVVM"]) await expect(rows.nth(0).getByText(t, { exact: true })).toBeVisible();
    // The sentences that carry facts are still on the page, folded.
    const fold = earlier.locator("details");
    await expect(fold).not.toHaveAttribute("open", "");
    await expect(earlier.getByText("with 2 ms response times")).toBeHidden();
    await fold.locator("summary").click();
    await expect(earlier.getByText("with 2 ms response times")).toBeVisible();
    await expect(earlier.getByText("Extracted SQL data from Django models")).toBeVisible();
    await expect(earlier.getByText("Room (SQLite)")).toBeVisible();
  });
});
