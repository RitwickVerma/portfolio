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

test.describe("skills with evidence", () => {
  test("each chip carries the number of results its own search gives, and links to that search", async ({ page }) => {
    await page.goto("/");
    const skills = page.locator("#skills");
    await expect(skills).toContainText("results when searched");
    // The legend names the dashed chip only when the page has one.
    const unseen = await skills.locator("a[data-unseen]").count();
    if (unseen > 0) await expect(skills).toContainText("Dashed: listed, not found in the record.");
    else await expect(skills).not.toContainText("Dashed");
    const cache = skills.getByRole("link", { name: /^Request caching \d+ results when searched$/ });
    await expect(cache).toHaveAttribute("href", "/?q=Request%20caching");
    await expect(skills.getByRole("link", { name: /^C\+\+ \d+ results when searched$/ })).toHaveAttribute("href", "/?q=C%2B%2B");
    // The skills the literal count left at zero now say what searching finds.
    for (const name of ["Search & retrieval", "Query rewriting", "Distributed systems", "Traffic replay & A/B testing"]) {
      const chip = skills.getByRole("link", { name: new RegExp(`^${name.replace(/[&/]/g, "\\$&")} [1-9]\\d* results? when searched$`) });
      await expect(chip, name).toHaveCount(1);
    }
    // Every skill of the data file is on the page, counted or marked: 26 chips.
    await expect(skills.locator("dd a")).toHaveCount(26);
  });

  test("the number on a chip is the number of results pressing it gives", async ({ page }) => {
    for (const name of ["Request caching", "Query rewriting", "C++"]) {
      await page.goto("/");
      const chip = page.locator("#skills dd a").filter({ hasText: new RegExp(`^${name.replace(/\+/g, "\\+")}\\d`) });
      await expect(chip).toHaveCount(1);
      const shown = Number(await chip.locator(".tabular-nums").textContent());
      await chip.click();
      await expect(page).toHaveURL(/\?q=/);
      // The number was counted over the full index (the notes' sections), so wait for it to land. The
      // index builds in the tab after hydration; on the shared CI runner Firefox needed more than 5 s.
      await expect(page.getByText(/indexed in this tab in/)).toBeVisible({ timeout: 30_000 });
      await expect(page.locator("[role=status]").filter({ hasText: /documents match/ }), name).toHaveText(new RegExp(`^${shown} of \\d+ documents match`));
      await expect(page.locator("#hits > li").first()).toBeVisible();
    }
  });

  test("the counts are in the server HTML", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.locator("#skills").getByRole("link", { name: /^Request caching \d+ results when searched$/ })).toBeVisible();
    await ctx.close();
  });
});

test.describe("projects", () => {
  test("compact rows show title, line and metric; why is folded", async ({ page }) => {
    await page.goto("/");
    const row = page.locator("#p-sudostamp");
    await expect(row).toContainText("18 of 18");
    const why = row.getByText("The phone speaks two ssh-agent messages");
    await expect(why).toBeHidden();
    await row.getByText("Why it is interesting").click();
    await expect(why).toBeVisible();
  });

  test("the filter hides the rows of other categories, and All brings them back", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const radios = page.getByRole("radiogroup", { name: "Show" });
    await expect(radios.getByRole("radio", { name: /^All 10/ })).toHaveAttribute("aria-checked", "true");
    const total = await page.locator("#projects article").count();
    expect(total).toBe(10);
    await radios.getByRole("radio", { name: "Galaxy Fold" }).click();
    await expect(page.locator("#projects article:visible")).toHaveCount(1);
    await expect(page.locator("#p-kaeru")).toBeVisible();
    await expect(page.locator("#projects [aria-live]").first()).toContainText("1 of 10 projects");
    // A category of featured rows leaves no empty compact grid behind.
    await radios.getByRole("radio", { name: "Android" }).click();
    await expect(page.locator("#p-shutup")).toBeVisible();
    await expect(page.locator("#p-kaeru")).toBeHidden();
    await radios.getByRole("radio", { name: /^All/ }).click();
    await expect(page.locator("#projects article:visible")).toHaveCount(10);
  });

  test("following a link to a filtered-out row shows it", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("radiogroup", { name: "Show" }).getByRole("radio", { name: "Android" }).click();
    await expect(page.locator("#p-kaeru")).toBeHidden();
    await page.evaluate(() => {
      window.location.hash = "#p-kaeru";
    });
    await expect(page.locator("#p-kaeru")).toBeVisible();
    await expect(page.getByRole("radiogroup", { name: "Show" }).getByRole("radio", { name: /^All/ })).toHaveAttribute("aria-checked", "true");
  });

  test("without JavaScript every project is listed and no chips are drawn", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.locator("#projects article")).toHaveCount(10);
    await expect(page.locator("#projects article:visible")).toHaveCount(10);
    await expect(page.getByRole("radiogroup", { name: "Show" })).toHaveCount(0);
    await ctx.close();
  });
});

test.describe("homelab", () => {
  test("pressing a guest shows its description and stack under the diagram, one at a time", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const fig = page.locator("#homelab figure").first();
    const line = fig.locator("[aria-live=polite]");
    await expect(line).toContainText("Press a guest");
    const vault = fig.getByRole("button", { name: /^Vaultwarden/ });
    await vault.click();
    await expect(vault).toHaveAttribute("aria-pressed", "true");
    await expect(line).toContainText("Vaultwarden, CT104");
    await expect(line).toContainText("Password manager");
    await expect(line).toContainText("Rust, Docker");
    await fig.getByRole("button", { name: /^Immich/ }).click();
    await expect(line).toContainText("Photo and video backup with ML search");
    await expect(line).not.toContainText("Password manager");
    await expect(vault).toHaveAttribute("aria-pressed", "false");
    await fig.getByRole("button", { name: "Gateway" }).click();
    await expect(line).toContainText("Traefik, Authelia SSO, Headscale VPN and CrowdSec");
    await fig.getByRole("button", { name: "Gateway" }).click();
    await expect(line).toContainText("Press a guest");
  });

  test("a guest is a 44 px target on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const tile = page.locator("#homelab figure").first().getByRole("button", { name: /^Vaultwarden/ });
    expect((await tile.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });

  test("the sixteen-row inventory is folded, and the counts come from the data", async ({ page }) => {
    await page.goto("/");
    const fold = page.locator("#homelab details").first();
    await expect(fold.locator("summary")).toContainText("All 16 guests");
    await expect(fold.locator("li").first()).toBeHidden();
    await fold.locator("summary").click();
    await expect(fold.locator("li")).toHaveCount(16);
    await expect(page.locator("#homelab")).toContainText("OpenTofu declares 14 of the 16");
    await expect(page.locator("#homelab figure").first()).toContainText("declares 14 of 16 guests");
  });
});

test.describe("contact", () => {
  test("claims no reply time", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#contact")).toContainText("I read everything that comes in.");
    await expect(page.locator("#contact")).not.toContainText("within a day");
  });
});
