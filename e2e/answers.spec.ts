import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// The hero's direct answers and the line that says what the engine did with the words.
// Reduced motion keeps the demo query from typing over these. A key handler exists only once the page has
// hydrated, so anything typed is retried until its result shows.

const ANSWER = (page: Page) => page.getByTestId("answer");
const LINE = (page: Page) => page.getByTestId("understanding");

/** "5 years, 8 months", "1 year", "11 months": the shape of a computed tenure, whatever the number. */
const TENURE = /^(\d+ years?(, \d+ months?)?|\d+ months?), on eBay's C\+\+ search engine\.$/;

async function open(page: Page, q = "", width = 1440) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width, height: 900 });
  await page.goto(q ? `/?q=${encodeURIComponent(q)}` : "/");
  if (!q) return;
  await expect(page.getByText(/ranked in your browser/)).toBeVisible();
  // Wait for the notes' full text to arrive and the query to be ranked against it: rows move then, and a
  // selection made before it would be on a row that is about to change.
  await expect(page.getByText(/indexed in this tab in/)).toBeVisible();
  await expect
    .poll(async () => {
      const index = (await page.getByText(/^\d+ documents, [\d,]+ terms/).innerText()).match(/^(\d+) documents/)?.[1];
      const ranked = (await page.getByText(/ranked in your browser/).innerText()).match(/of (\d+) documents/)?.[1];
      return index === ranked;
    })
    .toBe(true);
}

/** Type into the box, again if hydration had not finished when the keys went in. */
async function typeQuery(page: Page, q: string) {
  const box = page.locator("#q");
  await expect(async () => {
    await box.fill("");
    await box.pressSequentially(q);
    await expect(box).toHaveValue(q, { timeout: 1_000 });
    await expect(page.getByText(/ranked in your browser/)).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
}

test.describe("a typed question is answered above the results", () => {
  test("how many years of c++: the tenure is computed from the dates, and the line does not repeat it", async ({ page }) => {
    await open(page);
    await typeQuery(page, "how many years of c++");
    const row = ANSWER(page);
    await expect(row).toBeVisible();
    // The format, not the number: the number is the build's date minus the first eBay role's start.
    await expect(row.getByRole("heading", { level: 2 })).toHaveText(TENURE);
    await expect(page.getByTestId("answer-source")).toContainText("from the eBay dates on this page");
    await expect(row).toContainText("How long has he worked in C++?");
    // The row already says how the question was read; the line does not say it again.
    await expect(LINE(page)).not.toContainText("Read as");
    await expect(LINE(page)).not.toContainText("tenure");
    await expect(LINE(page).getByRole("link")).toHaveCount(0);
    // The answer comes before the results in the page.
    const [answerY, listY] = await Promise.all([row.boundingBox().then((b) => b!.y), page.locator("#hits").boundingBox().then((b) => b!.y)]);
    expect(answerY).toBeLessThan(listY);
  });

  test("the answer row is not a result: ArrowDown goes to the first result, and the row is not selectable", async ({ page }) => {
    await open(page, "how many years of c++");
    await expect(ANSWER(page)).toBeVisible();
    await page.locator("#q").focus();
    await page.keyboard.press("ArrowDown");
    const selected = page.locator('#hits > li[data-selected="true"]');
    await expect(selected).toHaveCount(1);
    await expect(selected).toHaveAttribute("id", "hit-0");
    await expect(ANSWER(page)).not.toHaveAttribute("data-selected", /.*/);
    await page.keyboard.press("ArrowUp");
    await expect(selected).toHaveCount(0);
  });

  test("Tab reaches the answer's links", async ({ page }) => {
    await open(page, "how do i contact him");
    await expect(ANSWER(page)).toBeVisible();
    await expect(ANSWER(page).getByRole("link")).toHaveCount(4);
    await page.locator("#q").focus();
    const inside = () => page.evaluate(() => !!document.activeElement?.closest('[data-testid="answer"]'));
    let reached = false;
    for (let i = 0; i < 40 && !reached; i++) {
      await page.keyboard.press("Tab");
      reached = await inside();
    }
    expect(reached).toBe(true);
    await expect(page.locator(":focus")).toHaveAttribute("href", /^mailto:/);
  });

  test("each intent answers from the page's own data", async ({ page }) => {
    await open(page, "where is he based");
    await expect(ANSWER(page).getByRole("heading", { level: 2 })).toHaveText(/^[A-Z][A-Za-z .]+, [A-Z]{2}\.$/);
    await page.goto("/?q=how%20many%20projects");
    await expect(ANSWER(page).getByRole("heading", { level: 2 })).toHaveText(/^\d+ projects\.$/);
    await page.goto("/?q=when%20did%20he%20finish%20his%20masters");
    await expect(ANSWER(page).getByRole("heading", { level: 2 })).toHaveText("Finished in 2020: Master of Computer Science, University of California, Irvine, 2019 – 2020.");
    await page.goto("/?q=resume");
    await expect(ANSWER(page).getByRole("link", { name: "PDF" })).toHaveAttribute("href", "/Ritwick_Verma_Resume.pdf");
  });

  test("no answer for what the record will not say, and the results are still there", async ({ page }) => {
    for (const q of ["do you need visa sponsorship", "salary expectations", "is he available", "when does he leave"]) {
      await page.goto(`/?q=${encodeURIComponent(q)}`);
      await expect(page.getByText(/ranked in your browser/)).toBeVisible();
      await expect(ANSWER(page), q).toHaveCount(0);
    }
  });

  test("clearing the box takes the answer away", async ({ page }) => {
    await open(page, "how many projects");
    await expect(ANSWER(page)).toBeVisible();
    await page.locator("#q").focus();
    await page.keyboard.press("Escape");
    await expect(ANSWER(page)).toHaveCount(0);
    await expect(LINE(page).getByRole("link")).toHaveCount(0);
  });
});

test.describe("the line under the box", () => {
  test("a respelling is named in the line, and the old hint above the results is gone", async ({ page }) => {
    await open(page, "fitmen ");
    await expect(LINE(page)).toContainText("fitment, spelled from fitmen");
    await expect(LINE(page).locator("mark")).toHaveText("fitment");
    await expect(page.getByText(/Nothing here is spelt/)).toHaveCount(0);
  });

  test("a rewrite, a filter and a phrase each say what happened", async ({ page }) => {
    await open(page, "ir");
    await expect(LINE(page)).toContainText(/added: .+ \(rewrite of ir\)/);
    await page.goto("/?q=kind%3Aproject");
    await expect(LINE(page)).toContainText("filter kind:project");
    await page.goto(`/?q=${encodeURIComponent('"query transform"')}`);
    await expect(LINE(page)).toContainText('phrase "query transform"');
  });

  test("nothing to say, nothing shown: a plain query has no line and no link", async ({ page }) => {
    await open(page, "fitment");
    await expect(LINE(page)).toBeEmpty();
  });

  test("Take it apart opens the engine room on the same query", async ({ page }) => {
    // A query the answer row does not cover: the line is blank beside an answer, so it has no link there.
    await open(page, "ir");
    const link = LINE(page).getByRole("link", { name: "Take it apart" });
    await expect(link).toHaveAttribute("href", "/engine/?q=ir#xray");
    await link.click();
    await expect(page).toHaveURL(/\/engine\/\?q=ir/);
    await expect(page.locator("#xray-q")).toHaveValue("ir");
  });

  test("the longest rewrites still fit the room kept for the line on a phone", async ({ page }) => {
    await open(page, "fitment", 390);
    const room = await LINE(page).evaluate((el) => el.getBoundingClientRect().height);
    for (const q of ["infra", "devops", "hire", "sre", "elasticsearch", "performance", "security", "degree"]) {
      await page.locator("#q").fill(q);
      await expect(LINE(page)).toContainText(`rewrite of ${q}`);
      expect(await LINE(page).evaluate((el) => el.getBoundingClientRect().height), q).toBe(room);
    }
  });

  for (const width of [390, 1440]) {
    test(`it keeps its room at ${width}px: saying something moves nothing`, async ({ page }) => {
      await open(page, "fitment", width);
      const room = () => LINE(page).evaluate((el) => ({ h: el.getBoundingClientRect().height, below: document.querySelector(".corpus-map")!.getBoundingClientRect().top - el.getBoundingClientRect().top }));
      const idle = await room();
      expect(idle.h).toBeGreaterThan(20);
      // The same box, now with a rewrite and the link in the line.
      await page.locator("#q").fill("ir");
      await expect(LINE(page)).toContainText("rewrite of ir");
      const said = await room();
      expect(said.h).toBe(idle.h);
      expect(said.below).toBe(idle.below);
    });
  }
});

test.describe("without JavaScript", () => {
  test("the first state is the starting points: no answer, no line", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.getByText("Nothing typed yet. This is where I would start you:")).toBeVisible();
    await expect(page.locator("#hits > li").first()).toBeVisible();
    await expect(ANSWER(page)).toHaveCount(0);
    await expect(LINE(page)).toBeEmpty();
    await context.close();
  });
});

test.describe("accessibility", () => {
  for (const scheme of ["light", "dark"] as const) {
    for (const q of ["how many years of c++", "how do i contact him", "ir"]) {
      test(`axe finds no violations with an answer or a line showing: ${q}, ${scheme}`, async ({ browser, browserName }) => {
        test.skip(browserName !== "chromium", "axe results do not depend on the engine; run once");
        const context = await browser.newContext({ colorScheme: scheme, reducedMotion: "reduce" });
        const page = await context.newPage();
        await page.goto(`/?q=${encodeURIComponent(q)}`);
        await page.waitForLoadState("networkidle");
        await expect(page.locator("#hits > li").first()).toBeVisible();
        // The scan must see what it is about.
        if (q === "ir") await expect(LINE(page)).toContainText("rewrite of ir");
        else await expect(ANSWER(page)).toBeVisible();
        const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
        expect(violations.map((v) => `${v.id} (${v.impact}): ${v.help} -> ${v.nodes.map((n) => n.target.join(" ")).slice(0, 4).join(" | ")}`)).toEqual([]);
        await context.close();
      });
    }
  }
});
