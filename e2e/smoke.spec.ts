import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Smoke tests over the built site. Each one guards a promise the site makes
// in its own copy (colophon, /design): no errors, no third-party requests,
// complete without JavaScript, still under reduced motion, one printed page.

const NOTE = "/notes/tizen-video-plane-ambilight/";
const SHUTUP = "/notes/shutup-wave-or-reach/";
/** Scanned by axe as well: the home page with a query on it shows facets, plan chips and scores the idle page does not. */
const WITH_QUERY = { name: "home with a query", path: "/?q=testing" } as const;
const PAGES = [
  { name: "home", path: "/" },
  { name: "engine", path: "/engine/" },
  { name: "design", path: "/design/" },
  { name: "note", path: NOTE },
  { name: "shutup note", path: SHUTUP },
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

test.describe("the ShutUp figure", () => {
  const figure = (page: Page) => page.getByRole("figure", { name: /ShutUp's wave detector/ });

  test("refuses the reach with the motion guard on and answers the call with it off", async ({ page }) => {
    const problems = watch(page);
    await page.goto(SHUTUP);
    await page.waitForLoadState("networkidle");
    const fig = figure(page);
    const status = fig.getByRole("status");
    const guard = fig.getByRole("switch", { name: "Motion guard" });
    await expect(guard).toBeChecked();
    // The reach pattern is loaded, every rule is on: both late waves are refused and the call keeps ringing.
    await expect(status).toContainText("Nothing fired");
    await expect(fig.getByText("a wave 0.40 s after the phone moved, muted until 2.15 s")).toBeVisible();
    await expect(fig.getByText("a wave 0.70 s too early, waves are ignored until 1.00 s")).toBeVisible();
    // Guard off: the same reach is now a double wave, and a double wave answers.
    await guard.uncheck();
    await expect(status).toContainText("The call was answered at 1.75 s");
    await expect(fig.getByText(/^fired double wave$/)).toBeVisible();
    await expect(fig.getByText(/the phone moved: waves muted/)).toHaveCount(0);
    await guard.check();
    await expect(status).toContainText("Nothing fired");
    expect(problems).toEqual([]);
  });

  test("a timeline built by tapping NEAR and FAR runs through the real detectors", async ({ page }) => {
    await page.goto(SHUTUP);
    await page.waitForLoadState("networkidle");
    const fig = figure(page);
    const status = fig.getByRole("status");
    await fig.getByRole("button", { name: "Clear" }).click();
    await expect(status).toContainText("Nothing fired");
    await fig.getByRole("button", { name: "1 s", exact: true }).click();
    await fig.getByRole("button", { name: "Hand away" }).click();
    await fig.getByRole("button", { name: "Hand away" }).click();
    await fig.getByRole("button", { name: "0.25 s", exact: true }).click();
    await fig.getByRole("button", { name: "Hand near" }).click();
    await fig.getByRole("button", { name: "Hand away" }).click();
    await fig.getByRole("button", { name: "Hand near" }).click();
    // Two separate waves inside the window, after the arming delay: a double wave, which answers.
    await expect(status).toContainText("The call was answered at 2.50 s");
    await fig.getByRole("button", { name: "Undo" }).click();
    // One wave: the window runs out and it silences. A single wave never answers.
    await expect(status).toContainText("The ringer was silenced at 3.20 s");
    // Take the single-wave rule off and the same wave answers the moment it is seen.
    await fig.getByRole("switch", { name: "Single-wave rule" }).uncheck();
    await expect(status).toContainText("The call was answered at 2.00 s");
  });

  test("the randomised check runs in the tab, shows its seed and finds violations when a rule is off", async ({ page }) => {
    await page.goto(SHUTUP);
    await page.waitForLoadState("networkidle");
    const fig = figure(page);
    await expect(fig.getByText(/Seed 7, 400 streams of 200 readings/)).toBeVisible();
    await expect(fig.getByText(/No stream broke a rule/)).toBeVisible();
    await fig.getByLabel("Seed").fill("11");
    await fig.getByRole("button", { name: "Run 400 streams" }).click();
    await expect(fig.getByText(/Seed 11, 400 streams of 200 readings/)).toBeVisible();
    await expect(fig.getByText(/No stream broke a rule/)).toBeVisible();
    await fig.getByRole("switch", { name: "Motion guard" }).uncheck();
    await expect(fig.getByText(/The switches have changed since this run/)).toBeVisible();
    await fig.getByRole("button", { name: "Run 400 streams" }).click();
    await expect(fig.getByText(/the motion guard off/)).toBeVisible();
    await expect(fig.getByText(/1 of 4 rules broken by random streams: \d+ of 400 streams/)).toBeVisible();
    await expect(fig.getByText(/First failure: stream 0, seed \d+/)).toBeVisible();
  });

  test("without JavaScript it shows the replay and computed results, and no dead controls", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(SHUTUP);
    const fig = figure(page);
    await expect(fig.getByRole("status")).toContainText("Nothing fired");
    await expect(fig.getByText("a wave 0.40 s after the phone moved, muted until 2.15 s")).toBeVisible();
    await expect(fig.getByText(/Seed 7, 400 streams of 200 readings/)).toBeVisible();
    await expect(fig.getByRole("button")).toHaveCount(0);
    await expect(fig.getByRole("switch")).toHaveCount(0);
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
