import { test, expect, type Page, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// "Judge it yourself" on /engine: the visitor grades rows and the metrics
// recompute. Every key or click goes through toPass(): hydration, and the full
// search index the grade buttons wait for, arrive later than the load event on
// a slow runner, and `networkidle` says neither.

const STORAGE_KEY = "engine-judge";

const section = (page: Page) => page.locator("#judge");
const rows = (page: Page) => section(page).locator("[data-judge-row]");

/** Press a grade on one row and wait until it shows as pressed. The press toggles, so it is only repeated while the row is not pressed. */
async function grade(row: Locator, which: "0" | "1" | "2") {
  const button = row.locator(`button[data-grade="${which}"]`);
  await expect(async () => {
    if ((await button.getAttribute("aria-pressed")) !== "true") await button.click({ timeout: 2_000 });
    await expect(button).toHaveAttribute("aria-pressed", "true", { timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
}

/** Grade the first three rows of the current query: relevant, partly, not. */
async function gradeThree(page: Page) {
  await expect(rows(page).nth(2)).toBeVisible();
  await grade(rows(page).nth(0), "2");
  await grade(rows(page).nth(1), "1");
  await grade(rows(page).nth(2), "0");
}

async function openJudge(page: Page) {
  await page.goto("/engine/");
  await section(page).scrollIntoViewIfNeeded();
  await expect(section(page).locator("[data-judge-query]")).toBeVisible();
}

test.describe("judge it yourself", () => {
  test("grading three rows makes the metrics row appear, every number in [0, 1], beside mine", async ({ page }) => {
    await openJudge(page);
    await expect(section(page).locator("[data-judge-metrics]")).toHaveCount(0);
    await gradeThree(page);
    const table = section(page).locator("[data-judge-metrics]");
    await expect(table).toBeVisible();
    await expect(table.locator("tbody tr")).toHaveCount(3);
    const cells = await table.locator("tbody td").allInnerTexts();
    expect(cells).toHaveLength(12);
    for (const text of cells) {
      const n = text.endsWith("%") ? parseFloat(text) / 100 : parseFloat(text);
      expect(Number.isFinite(n), text).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(1);
    }
    // Four columns per metric: your treatment and control, then mine.
    for (const col of ["you-treatment", "you-control", "owner-treatment", "owner-control"]) await expect(table.locator(`[data-cell="${col}"]`)).toHaveCount(3);
    await expect(section(page).locator("[data-judge-disagree]")).toContainText(/You and I (disagree on \d+ of \d+|agree on all \d+) rows?\./);
    await expect(section(page).locator("[data-judge-query-line]")).toHaveCount(1);
  });

  test("a second query adds to the numbers; Next moves on and Previous comes back", async ({ page }) => {
    await openJudge(page);
    const first = await section(page).locator("[data-judge-query] span.font-mono").innerText();
    await gradeThree(page);
    const next = section(page).locator("[data-judge-next]");
    await expect(async () => {
      if ((await section(page).locator("[data-judge-position]").innerText()) !== "Query 2 of 35") await next.click({ timeout: 2_000 });
      await expect(section(page).locator("[data-judge-position]")).toHaveText("Query 2 of 35", { timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    await expect(section(page).locator("[data-judge-query] span.font-mono")).not.toHaveText(first);
    await expect(rows(page).first()).toBeVisible();
    // The current query has no grades yet, so there is no disagreement line for it, and the table still shows the first.
    await expect(section(page).locator("[data-judge-disagree]")).toHaveCount(0);
    await grade(rows(page).first(), "2");
    await expect(section(page).locator("[data-judge-query-line]")).toHaveCount(2);
    await section(page).locator("[data-judge-prev]").click();
    await expect(section(page).locator("[data-judge-position]")).toHaveText("Query 1 of 35");
    await expect(section(page).locator("[data-judge-query] span.font-mono")).toHaveText(first);
  });

  test("pressing a grade again clears it, and an ungraded page shows no numbers", async ({ page }) => {
    await openJudge(page);
    await grade(rows(page).first(), "1");
    await expect(section(page).locator("[data-judge-metrics]")).toBeVisible();
    await rows(page).first().locator('button[data-grade="1"]').click();
    await expect(rows(page).first().locator('button[aria-pressed="true"]')).toHaveCount(0);
    await expect(section(page).locator("[data-judge-metrics]")).toHaveCount(0);
  });

  test("a reload keeps the grades and the place; Start over clears them", async ({ page }) => {
    await openJudge(page);
    await gradeThree(page);
    const before = await section(page).locator("[data-judge-metrics] tbody").innerText();
    await expect(async () => {
      await section(page).locator("[data-judge-next]").click({ timeout: 2_000 });
      await expect(section(page).locator("[data-judge-position]")).toHaveText("Query 2 of 35", { timeout: 1_000 });
    }).toPass({ timeout: 15_000 });

    await page.reload();
    await section(page).scrollIntoViewIfNeeded();
    await expect(section(page).locator("[data-judge-position]")).toHaveText("Query 2 of 35");
    await expect(section(page).locator("[data-judge-metrics]")).toBeVisible();
    expect(await section(page).locator("[data-judge-metrics] tbody").innerText()).toBe(before);
    expect(await page.evaluate((k) => sessionStorage.getItem(k) !== null, STORAGE_KEY)).toBe(true);

    await section(page).locator("[data-judge-reset]").click();
    await expect(section(page).locator("[data-judge-metrics]")).toHaveCount(0);
    await expect(section(page).locator("[data-judge-position]")).toHaveText("Query 1 of 35");
    await expect(section(page).locator('[data-judge-row] button[aria-pressed="true"]')).toHaveCount(0);
    expect(await page.evaluate((k) => sessionStorage.getItem(k), STORAGE_KEY)).toBeNull();
    await page.reload();
    await expect(section(page).locator("[data-judge-position]")).toHaveText("Query 1 of 35");
    await expect(section(page).locator("[data-judge-metrics]")).toHaveCount(0);
  });

  test("nothing is requested from the network by grading", async ({ page }) => {
    await openJudge(page);
    // The grade buttons switch on when the search index has arrived; that fetch is the page's own and is over before grading starts.
    await expect(rows(page).first().locator("button").first()).toBeEnabled({ timeout: 20_000 });
    const requests: string[] = [];
    page.on("request", (r) => requests.push(r.url()));
    await gradeThree(page);
    await expect(section(page).locator("[data-judge-metrics]")).toBeVisible();
    expect(requests).toEqual([]);
  });

  type Exported = { version: number; queries: { query: string; grades: Record<string, number> }[]; evaluatedAt: string };
  function checkExport(json: string) {
    const data = JSON.parse(json) as Exported;
    expect(Object.keys(data)).toEqual(["version", "queries", "evaluatedAt"]);
    expect(data.version).toBe(1);
    expect(Number.isNaN(Date.parse(data.evaluatedAt))).toBe(false);
    expect(data.queries).toHaveLength(1);
    expect(Object.values(data.queries[0].grades).sort()).toEqual([0, 1, 2]);
  }
  async function pressCopy(page: Page) {
    const status = section(page).locator("[data-judge-copy-status]");
    await expect(async () => {
      await section(page).locator("[data-judge-copy]").click({ timeout: 2_000 });
      await expect(status).not.toHaveText("", { timeout: 2_000 });
    }).toPass({ timeout: 15_000 });
    return status;
  }

  test("Copy my grades puts the JSON on the clipboard", async ({ browser, browserName }) => {
    // Chromium lets a test grant the clipboard and read it back. Firefox and WebKit decide for themselves
    // whether a click may write it, so there the result is either the clipboard or the fallback, never nothing.
    const context = await browser.newContext(browserName === "chromium" ? { permissions: ["clipboard-read", "clipboard-write"] } : {});
    const page = await context.newPage();
    await openJudge(page);
    await gradeThree(page);
    const status = await pressCopy(page);
    const fallback = section(page).locator("[data-judge-fallback]");
    if (browserName === "chromium") {
      await expect(status).toContainText("Copied the grades for 1 query");
      await expect(fallback).toHaveCount(0);
      checkExport(await page.evaluate(() => navigator.clipboard.readText()));
    } else if (await fallback.count()) {
      checkExport(await fallback.inputValue());
    } else {
      await expect(status).toContainText("Copied the grades for 1 query");
    }
    await context.close();
  });

  test("where the page cannot reach the clipboard, the JSON is in a selected textarea", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    // No Clipboard API at all: an insecure origin or an old browser.
    await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true }));
    await openJudge(page);
    await gradeThree(page);
    const status = await pressCopy(page);
    await expect(status).toContainText("selected below");
    const area = section(page).locator("[data-judge-fallback]");
    await expect(area).toBeVisible();
    await expect(area).toBeFocused();
    expect(await area.evaluate((el: HTMLTextAreaElement) => el.selectionEnd - el.selectionStart)).toBe((await area.inputValue()).length);
    checkExport(await area.inputValue());
    await context.close();
  });

  test("it says plainly that nothing is emailed", async ({ page }) => {
    await openJudge(page);
    await expect(section(page)).toContainText("nothing leaves this page unless you copy it");
    await expect(section(page).getByRole("button", { name: /email/i })).toHaveCount(0);
  });

  test("without JavaScript the first query's list is there and the controls are off", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/engine/");
    await expect(section(page).locator("h2")).toHaveText("Grade it yourself; the numbers recompute from your grades.");
    await expect(section(page)).toContainText("Grading needs JavaScript");
    await expect(section(page).locator("[data-judge-position]")).toHaveText("Query 1 of 35");
    const n = await rows(page).count();
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThanOrEqual(10);
    for (const row of await rows(page).all()) {
      await expect(row.locator("a")).toHaveCount(1);
      await expect(row.locator("button")).toHaveCount(3);
      for (const b of await row.locator("button").all()) await expect(b).toBeDisabled();
    }
    for (const sel of ["[data-judge-next]", "[data-judge-copy]", "[data-judge-reset]"]) await expect(section(page).locator(sel)).toBeDisabled();
    await context.close();
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`axe finds no violations in the section with grades given, ${scheme}`, async ({ browser, browserName }) => {
      test.skip(browserName !== "chromium", "axe results do not depend on the engine; run once");
      const context = await browser.newContext({ colorScheme: scheme, reducedMotion: "reduce" });
      const page = await context.newPage();
      await openJudge(page);
      await gradeThree(page);
      await expect(section(page).locator("[data-judge-metrics]")).toBeVisible();
      await expect(async () => {
        await section(page).locator("[data-judge-copy]").click({ timeout: 2_000 });
        await expect(section(page).locator("[data-judge-copy-status]")).not.toHaveText("", { timeout: 2_000 });
      }).toPass({ timeout: 15_000 });
      const { violations } = await new AxeBuilder({ page })
        .include("#judge")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
        .analyze();
      expect(violations.map((v) => `${v.id} (${v.impact}): ${v.help} -> ${v.nodes.map((n) => n.target.join(" ")).slice(0, 4).join(" | ")}`)).toEqual([]);
      await context.close();
    });
  }
});
