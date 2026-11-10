import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Smoke tests over the built site. Each one guards a promise the site makes
// in its own copy (colophon, /design): no errors, no third-party requests,
// complete without JavaScript, still under reduced motion, one printed page.

const NOTE = "/notes/tizen-video-plane-ambilight/";
const PLUTUS = "/notes/plutus-what-the-backtest-cannot-tell-you/";
/** Scanned by axe as well: the home page with a query on it shows facets, plan chips and scores the idle page does not. */
const WITH_QUERY = { name: "home with a query", path: "/?q=testing" } as const;
const PAGES = [
  { name: "home", path: "/" },
  { name: "engine", path: "/engine/" },
  { name: "design", path: "/design/" },
  { name: "note", path: NOTE },
  { name: "plutus note", path: PLUTUS },
  { name: "resume", path: "/resume/" },
] as const;
const WIDTHS = [320, 390, 768, 1440] as const;

/** Everything that goes wrong while a page loads and settles. */
function watch(page: Page) {
  const problems: string[] = [];
  const origin = new URL(test.info().project.use.baseURL!).origin;
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`console: ${m.text()}`);
  });
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("requestfailed", (r) => problems.push(`requestfailed: ${r.url()} ${r.failure()?.errorText ?? ""}`));
  page.on("response", (r) => {
    if (r.status() >= 400) problems.push(`http ${r.status()}: ${r.url()}`);
  });
  page.on("request", (r) => {
    const url = r.url();
    if (/^https?:/.test(url) && new URL(url).origin !== origin) problems.push(`third-party request: ${url}`);
  });
  return problems;
}

for (const { name, path } of PAGES) {
  test.describe(name, () => {
    test("loads with no console errors, failed or third-party requests", async ({ page }) => {
      const problems = watch(page);
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("h1")).toHaveCount(1);
      expect(problems).toEqual([]);
    });

    for (const width of WIDTHS) {
      test(`does not overflow sideways at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        const { scroll, client, widest } = await page.evaluate(() => {
          const root = document.documentElement;
          let widest = "";
          let max = root.clientWidth;
          for (const el of document.querySelectorAll("body *")) {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.right > max + 0.5 && getComputedStyle(el).position !== "fixed") {
              // Content inside a scroll container may be wider than the page; the page itself may not.
              let clipped = false;
              for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
                const o = getComputedStyle(p).overflowX;
                if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") {
                  clipped = true;
                  break;
                }
              }
              if (!clipped) {
                max = r.right;
                widest = `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 80)} right=${Math.round(r.right)}`;
              }
            }
          }
          return { scroll: root.scrollWidth, client: root.clientWidth, widest };
        });
        expect(scroll, `page scrolls sideways; widest element: ${widest}`).toBeLessThanOrEqual(client);
        expect(widest, "an element pokes out of the viewport").toBe("");
      });
    }

    test("is a complete page with JavaScript disabled", async ({ browser }) => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
      const words = (await page.locator("main, body").first().innerText()).split(/\s+/).length;
      expect(words, "the server HTML carries the content").toBeGreaterThan(150);
      if (name === "home") {
        // The box shows its fixed starting points, and every section is plain HTML.
        await expect(page.locator("#hits > li")).toHaveCount(5);
        for (const id of ["work-0-0", "homelab", "contact", "skills", "earlier"]) await expect(page.locator(`#${id}`)).toHaveCount(1);
        await expect(page.locator("#hits a").first()).toHaveAttribute("href", /#work-0-0$/);
      }
      if (name === "resume") await expect(page.locator("a[download]")).toHaveAttribute("href", /Ritwick_Verma_Resume\.pdf$/);
      await context.close();
    });
  });
}

test.describe("search", () => {
  test("the search chunk hydrates and ranks in the browser", async ({ page }) => {
    const problems = watch(page);
    const full = page.waitForResponse((r) => r.url().endsWith("/search-index.json") && r.ok());
    // No demo query here: on a slow runner it starts typing before the click below and the two interleave.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const box = page.locator("#q");
    await box.click();
    await box.pressSequentially("c++");
    await expect(page.locator("#hits > li").first()).toBeVisible();
    await expect(page.getByText(/ranked in your browser/)).toBeVisible();
    await expect(page).toHaveURL(/\?q=c%2B%2B/);
    // The notes' full text arrives after idle and the index is rebuilt with it.
    await full;
    await expect(page.getByText(/indexed in this tab in/)).toBeVisible();
    await box.fill("kind:note hdr ");
    await expect(page.locator("#hits > li").first()).toContainText(/hdr|PQ/i);
    expect(problems).toEqual([]);
  });

  test("a ?q= link opens with results already ranked", async ({ page }) => {
    await page.goto("/?q=fitment");
    await expect(page.locator("#q")).toHaveValue("fitment");
    await expect(page.locator("#hits > li").first()).toContainText(/fitment/i);
  });

  test("Ctrl K opens search on another page", async ({ page }) => {
    await page.goto("/design/");
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("Control+k");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.keyboard.type("fitment");
    await expect(dialog.getByRole("option").first()).toContainText(/fitment/i);
  });

  test("the demo query types itself once", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#q")).toHaveValue("fitment", { timeout: 8000 });
  });

  test("taking the box mid-demo clears the half-typed query", async ({ page }) => {
    await page.goto("/");
    const box = page.locator("#q");
    // Take the box the moment the demo is part-way through its word: the focus happens inside the
    // page, in the same poll that sees the partial text, so no key can land in between.
    await page.waitForFunction(
      () => {
        const q = document.querySelector<HTMLInputElement>("#q");
        if (!q || q.value.length < 2 || q.value.length > 4) return false;
        q.focus();
        return true;
      },
      undefined,
      { polling: 20, timeout: 8000 },
    );
    // The partial text and its results go, and the URL was never touched.
    await expect(box).toHaveValue("");
    await expect(page.getByText(/Nothing typed yet/)).toBeVisible();
    await expect(page).not.toHaveURL(/\?q=/);
    // The demo's remaining keys never arrive, and typing is not appended to the partial word.
    await page.waitForTimeout(1500);
    await expect(box).toHaveValue("");
    await page.keyboard.type("c++");
    await expect(box).toHaveValue("c++");
  });

  test("the demo query does not run under reduced motion", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // The demo starts at 1.5 s and finishes by about 2.2 s; wait well past it.
    await page.waitForTimeout(4000);
    await expect(page.locator("#q")).toHaveValue("");
    await expect(page).not.toHaveURL(/\?q=/);
    await context.close();
  });
});

test.describe("resume print", () => {
  for (const format of ["Letter", "A4"] as const) {
    test(`prints to one page on ${format}`, async ({ page, browserName }) => {
      test.skip(browserName !== "chromium", "page.pdf() exists only in Chromium");
      await page.goto("/resume/");
      await page.waitForLoadState("networkidle");
      await page.evaluate(() => document.fonts.ready);
      await page.emulateMedia({ media: "print" });
      // preferCSSPageSize is off so the format under test wins; margins come from the stylesheet's @page.
      const pdf = await page.pdf({ format, printBackground: true });
      const pages = pdf.toString("latin1").match(/\/Type\s*\/Page(?![a-zA-Z])/g)?.length ?? 0;
      expect(pages).toBe(1);
    });
  }
});

test.describe("accessibility", () => {
  for (const { name, path } of [...PAGES, WITH_QUERY]) {
    for (const scheme of ["light", "dark"] as const) {
      test(`axe finds no violations on ${name}, ${scheme}`, async ({ browser, browserName }) => {
        test.skip(browserName !== "chromium", "axe results do not depend on the engine; run once");
        // Reduced motion keeps the demo query from changing the page under the scan.
        const context = await browser.newContext({ colorScheme: scheme, reducedMotion: "reduce" });
        const page = await context.newPage();
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        if (path.includes("?q=")) await expect(page.locator("#hits > li").first()).toBeVisible();
        const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
        expect(violations.map((v) => `${v.id} (${v.impact}): ${v.help} -> ${v.nodes.map((n) => n.target.join(" ")).slice(0, 4).join(" | ")}`)).toEqual([]);
        await context.close();
      });
    }
  }
});

test.describe("plutus note figures", () => {
  test("the universe switch shows the biased number first and the honest one when pressed", async ({ page }) => {
    await page.goto(PLUTUS);
    await page.waitForLoadState("networkidle");
    const fig = page.getByRole("figure", { name: /Same rule, same prices/ });
    await expect(fig.getByRole("status")).toContainText("21.3% a year");
    await fig.getByRole("button", { name: "Members at the time" }).click();
    await expect(fig.getByRole("button", { name: "Members at the time" })).toHaveAttribute("aria-pressed", "true");
    await expect(fig.getByRole("status")).toContainText("3.1% a year");
    await expect(fig.getByRole("status")).toContainText("behind SPY");
    await expect(fig.getByRole("status")).toContainText("18.2");
  });

  test("the toy market: survivors beat the market, the whole market does not", async ({ page }) => {
    await page.goto(PLUTUS);
    await page.waitForLoadState("networkidle");
    const fig = page.getByRole("figure", { name: /no skill only the stocks that survived/ });
    await fig.scrollIntoViewIfNeeded();
    const gapOf = async () => {
      const t = (await fig.getByRole("status").locator("p").first().innerText()).replace(/−/g, "-");
      const m = t.match(/(-?[\d.]+)% a year, the market (-?[\d.]+)%/);
      expect(m, t).not.toBeNull();
      return Number(m![1]) - Number(m![2]);
    };
    await expect(fig.getByRole("status")).toContainText("Surviving stocks only");
    expect(await gapOf()).toBeGreaterThan(1);
    await fig.getByRole("button", { name: "Everyone who existed then" }).click();
    await expect(fig.getByRole("status")).toContainText("Everyone who existed");
    expect(Math.abs(await gapOf())).toBeLessThan(1.5);
    await fig.getByRole("button", { name: /Draw another world/ }).click();
    await expect(fig.getByRole("button", { name: /Draw another world \(seed 8\)/ })).toBeVisible();
    // More controls: with nothing delisted both lists are the same list.
    await fig.getByText("More controls and the numbers").click();
    await fig.getByRole("slider").fill("0");
    await expect(fig.getByText("nobody to leave out")).toBeVisible();
  });

  test("the bootstrap: a piece length and a number to show", async ({ page }) => {
    await page.goto(PLUTUS);
    await page.waitForLoadState("networkidle");
    const fig = page.getByRole("figure", { name: /A backtest is one path/ });
    await fig.scrollIntoViewIfNeeded();
    await expect(fig.getByRole("status")).toContainText("yearly returns from");
    const before = await fig.getByRole("status").innerText();
    await fig.getByRole("button", { name: "6 months" }).click();
    await expect(fig.getByRole("button", { name: "6 months" })).toHaveAttribute("aria-pressed", "true");
    await expect.poll(async () => fig.getByRole("status").innerText()).not.toBe(before);
    await fig.getByRole("radio", { name: "Worst fall" }).click();
    await expect(fig.getByRole("status")).toContainText("worst falls from");
    await expect(fig.getByRole("status")).toContainText("The real run got −34.5%");
    await fig.getByRole("button", { name: /Deal again/ }).click();
    await expect(fig.getByRole("button", { name: /Deal again \(seed 43\)/ })).toBeVisible();
  });
});
