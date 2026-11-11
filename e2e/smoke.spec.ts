import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { sidewaysOverflow } from "./helpers";

// Smoke tests over the built site. Each one guards a promise the site makes
// in its own copy (colophon, /design): no errors, no third-party requests,
// complete without JavaScript, still under reduced motion, one printed page.

const NOTE = "/notes/tizen-video-plane-ambilight/";
const PLUTUS = "/notes/plutus-what-the-backtest-cannot-tell-you/";
const HOMELAB = "/notes/homelab-git-is-the-truth/";
const CRUSH_NOTE = "/notes/crush80-open-firmware/";
const SUDO_NOTE = "/notes/sudostamp-refuse-before-asking/";
/** A note that opens on a figure you operate; it gets every check the other pages get. */
const FIGURE_NOTE = "/notes/kwin-canvas-frame-classifier/";
const SHUTUP = "/notes/shutup-wave-or-reach/";
const ALIGN_NOTE = "/notes/chordist-chart-alignment/";
/** Scanned by axe as well: the home page with a query on it shows facets, plan chips and scores the idle page does not. */
const WITH_QUERY = { name: "home with a query", path: "/?q=testing" } as const;
const PAGES = [
  { name: "home", path: "/" },
  { name: "engine", path: "/engine/" },
  { name: "design", path: "/design/" },
  { name: "note", path: NOTE },
  { name: "plutus note", path: PLUTUS },
  { name: "homelab note", path: HOMELAB },
  { name: "crush80 note", path: CRUSH_NOTE },
  { name: "note with figures", path: SUDO_NOTE },
  { name: "figure note", path: FIGURE_NOTE },
  { name: "shutup note", path: SHUTUP },
  { name: "alignment note", path: ALIGN_NOTE },
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
        const { scroll, client, widest } = await sidewaysOverflow(page);
        expect(scroll, `page scrolls sideways; widest element: ${widest}`).toBeLessThanOrEqual(client);
        expect(widest, "an element pokes out of the viewport").toBe("");
        // Again with every fold open: what is folded away has no width until it is opened, so the
        // first pass cannot see a table or a row of controls that is too wide.
        const folds = await page.evaluate(() => {
          const all = [...document.querySelectorAll("details")];
          all.forEach((d) => (d.open = true));
          return all.length;
        });
        if (folds > 0) {
          const open = await sidewaysOverflow(page);
          expect(open.scroll, `with folds open the page scrolls sideways; widest element: ${open.widest}`).toBeLessThanOrEqual(open.client);
          expect(open.widest, "with folds open an element pokes out of the viewport").toBe("");
        }
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
      if (name === "figure note") {
        // The figure's first state is a played case, so the server HTML already says what the classifier decided and why.
        const figure = page.locator("figure").first();
        await expect(figure.locator("[aria-live]")).toContainText("The canvas puts it back");
        await expect(figure.getByText(/Same size, from out of reach to in reach/)).toBeVisible();
        // The claim and the one thing to press are in the server HTML too.
        await expect(figure.getByText("The canvas undoes KWin's pulls")).toBeVisible();
        await expect(figure.getByRole("button", { name: "Let KWin move it" })).toBeVisible();
        await expect(figure.locator("figcaption")).toContainText("KWin is not running");
      }
      if (name === "resume") await expect(page.locator("a[download]")).toHaveAttribute("href", /Ritwick_Verma_Resume\.pdf$/);
      await context.close();
    });
  });
}

test.describe("note figures: type", () => {
  const NOTES = [
    "/notes/chordist-chart-alignment/",
    "/notes/crush80-open-firmware/",
    "/notes/homelab-git-is-the-truth/",
    "/notes/kwin-canvas-frame-classifier/",
    "/notes/plutus-what-the-backtest-cannot-tell-you/",
    "/notes/shutup-wave-or-reach/",
    "/notes/sudostamp-refuse-before-asking/",
    "/notes/tizen-video-plane-ambilight/",
  ];
  for (const path of NOTES) {
    test(`${path}: all drawn text is 12 px or more and sentences are not set condensed`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      // A note whose figure failed to load has no text to measure and would pass empty.
      await expect(page.locator("main figure").first()).toBeVisible();
      const { bad, measured } = await page.evaluate(() => {
        const out: string[] = [];
        let measured = 0;
        // The folds hold tables and controls too.
        document.querySelectorAll("figure details").forEach((d) => ((d as HTMLDetailsElement).open = true));
        for (const fig of document.querySelectorAll("figure")) {
          const walker = document.createTreeWalker(fig, NodeFilter.SHOW_TEXT);
          for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            const text = (n.textContent ?? "").trim();
            const el = n.parentElement;
            if (!text || !el || el.closest(".sr-only")) continue;
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0 || getComputedStyle(el).visibility === "hidden") continue;
            measured += 1;
            let px = parseFloat(getComputedStyle(el).fontSize);
            const svg = el.closest("svg");
            if (svg && el instanceof SVGGraphicsElement) {
              const m = el.getScreenCTM();
              px *= m ? Math.hypot(m.a, m.b) : 1;
            }
            if (px < 11.95) out.push(`${px.toFixed(1)}px: ${text.slice(0, 40)}`);
            // The condensed .fact is for dates, units and numbers, not a sentence a reader needs.
            if (el.closest(".fact") && !el.closest("button") && text.split(/\s+/).length > 6) out.push(`condensed sentence: ${text.slice(0, 50)}`);
          }
        }
        return { bad: out, measured };
      });
      expect(measured, "pieces of figure text measured").toBeGreaterThan(10);
      expect(bad).toEqual([]);
    });
  }
});

test.describe("the frame-authority figure", () => {
  test("a pull is put back and a move on the screen is kept, placed by keyboard and by pointer", async ({ page }) => {
    const problems = watch(page);
    await page.goto(FIGURE_NOTE);
    await page.waitForLoadState("networkidle");
    const figure = page.locator("figure").first();
    const verdict = figure.locator("[aria-live]");
    const move = figure.getByRole("button", { name: "Let KWin move it" });
    const win = figure.getByRole("group", { name: /^Window at/ });
    const x = figure.getByLabel("x", { exact: true });
    const first = figure.getByRole("group", { name: "Try", exact: true });

    // Server-rendered state is a played case; the first thing to press is a case, and the rest is folded away.
    await expect(verdict).toContainText("The canvas puts it back");
    await expect(first.getByRole("button")).toHaveCount(4);
    await expect(first.getByRole("button").first()).toHaveAttribute("aria-pressed", "true");
    await expect(figure.getByText("not asked")).toBeHidden();
    await expect(x).toBeHidden();
    // The drawing carries its own labels and numbers.
    await expect(figure.getByText("Window put back at 4000, 300")).toBeVisible();
    await expect(figure.getByText("KWin moved it to 1820, 300")).toBeVisible();
    await expect(figure.getByText("The screen is 1920 × 1080")).toBeVisible();

    // The same case played again: the second revert of a chain.
    await move.click();
    await expect(verdict).toContainText("The canvas puts it back");
    await expect(verdict).toContainText("from 4000, 300 to 1820, 300");

    // A third one right after would be the window insisting, so let the figure's clock pause between the next moves.
    await figure.getByText("More controls").click();
    await figure.getByRole("radio", { name: "After a pause (2000 ms)" }).click();

    // Keyboard: nine Shift+Left steps of 200 px bring it from 4000 to 2200, still out of reach; two more put 100 px of it over the screen.
    await win.focus();
    for (let i = 0; i < 9; i++) await page.keyboard.press("Shift+ArrowLeft");
    await expect(x).toHaveValue("2200");
    await move.click();
    await expect(verdict).toContainText("The canvas puts it back");
    await expect(verdict).toContainText("from 2200, 300 to 1820, 300");
    await win.focus();
    for (let i = 0; i < 2; i++) await page.keyboard.press("Shift+ArrowLeft");
    await expect(x).toHaveValue("1800");
    // Now in reach: KWin's rule has nothing to do, and a window that did not move is kept.
    await move.click();
    await expect(verdict).toContainText("The canvas keeps it");
    await figure.getByText("Why: the six checks").click();
    await expect(figure.getByText("not asked").first()).toBeVisible();

    // Pointer: drag it far off to the right, where KWin will pull it back.
    // Centre it first, so the sticky nav is not over it, and take the box once the (smooth) scroll has stopped.
    await win.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
    let box = (await win.locator("rect").nth(1).boundingBox())!;
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(100);
      const next = (await win.locator("rect").nth(1).boundingBox())!;
      const still = next.x === box.x && next.y === box.y;
      box = next;
      if (still) break;
    }
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, { steps: 6 });
    await page.mouse.up();
    await expect.poll(async () => Number(await x.inputValue())).toBeGreaterThan(2500);
    await expect(verdict).toContainText("No call yet");
    await move.click();
    await expect(verdict).toContainText("The canvas puts it back");

    // A preset is a whole case: a move between two places on the screen is the window's own.
    await first.getByRole("button", { name: "A move on the screen" }).click();
    await expect(verdict).toContainText("The canvas keeps it");
    await expect(first.getByRole("button", { name: "A move on the screen" })).toHaveAttribute("aria-pressed", "true");

    // All eight cases of the project's tests are under a fold, with the test each comes from.
    await figure.getByText("All test cases").click();
    const all = figure.getByRole("group", { name: "Test case", exact: true });
    await expect(all.getByRole("button")).toHaveCount(8);
    await all.getByRole("button", { name: "A monitor went away" }).click();
    await expect(verdict).toContainText("rescuing a window from a screen that went away");
    await expect(figure.getByText(/a rescue from a monitor that went away is not/)).toBeVisible();
    expect(problems).toEqual([]);
  });

  for (const width of [390, 1440]) {
    test(`every label sits beside its shape, clear of every line, at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(FIGURE_NOTE);
      await page.waitForLoadState("networkidle");
      const figure = page.locator("figure").first();
      await page.evaluate(() => document.querySelectorAll("figure details").forEach((d) => ((d as HTMLDetailsElement).open = true)));
      // The corner dot is a ring with a dark centre, and the window carries a drag cue.
      const dot = await figure.locator("svg circle").evaluateAll((cs) => cs.map((c) => c.getBoundingClientRect().width));
      expect(Math.max(...dot)).toBeGreaterThanOrEqual(20);
      await expect(figure.getByText("Drag the window", { exact: true })).toBeVisible();
      for (const name of ["Pulled in from far away", "80 px over to 100", "A top above the screen", "A move on the screen", "A resize", "A sub-pixel snap", "A monitor went away", "A window that insists"]) {
        await figure.getByRole("button", { name, exact: true }).first().click();
        const found = await figure.evaluate((fig) => {
          const svg = fig.querySelector("svg")!;
          const sb = svg.getBoundingClientRect();
          const labels = [...fig.querySelectorAll("span[aria-hidden='true'].absolute")].map((e) => ({ t: e.textContent ?? "", r: e.getBoundingClientRect(), fs: parseFloat(getComputedStyle(e).fontSize) }));
          const edges: { x0: number; y0: number; x1: number; y1: number }[] = [];
          for (const e of svg.querySelectorAll("rect,line")) {
            if (e.tagName === "rect" && (!e.getAttribute("stroke") || e.getAttribute("fill") === "transparent" || e.getAttribute("stroke") === "var(--accent)")) continue;
            const b = e.getBoundingClientRect();
            if (e.tagName === "line") edges.push({ x0: b.left, y0: b.top, x1: b.right, y1: b.bottom });
            else edges.push({ x0: b.left, y0: b.top, x1: b.right, y1: b.top }, { x0: b.left, y0: b.bottom, x1: b.right, y1: b.bottom }, { x0: b.left, y0: b.top, x1: b.left, y1: b.bottom }, { x0: b.right, y0: b.top, x1: b.right, y1: b.bottom });
          }
          const bad: string[] = [];
          labels.forEach((l, i) => {
            if (l.fs < 12) bad.push(`${l.t}: ${l.fs}px`);
            if (l.r.left < sb.left - 1 || l.r.right > sb.right + 1) bad.push(`${l.t}: outside the drawing`);
            for (const e of edges) {
              const flat = e.y0 === e.y1;
              const upright = e.x0 === e.x1;
              const hit = flat ? e.y0 > l.r.top && e.y0 < l.r.bottom && e.x1 > l.r.left && e.x0 < l.r.right : upright ? e.x0 > l.r.left && e.x0 < l.r.right && e.y1 > l.r.top && e.y0 < l.r.bottom : false;
              if (hit) bad.push(`${l.t}: crosses a line`);
            }
            labels.slice(i + 1).forEach((o) => {
              if (l.r.left < o.r.right && o.r.left < l.r.right && l.r.top < o.r.bottom && o.r.top < l.r.bottom) bad.push(`${l.t} overlaps ${o.t}`);
            });
          });
          return { bad, labels: labels.length, edges: edges.length };
        });
        // The check must have had something to check: a renamed class would otherwise pass it empty.
        expect(found.labels, `${name}: labels found`).toBeGreaterThan(1);
        expect(found.edges, `${name}: lines found`).toBeGreaterThan(3);
        expect(found.bad, name).toEqual([]);
      }
    });
  }

  test("a window that insists is kept on the third move, and a pause starts the chain again", async ({ page }) => {
    await page.goto(FIGURE_NOTE);
    await page.waitForLoadState("networkidle");
    const figure = page.locator("figure").first();
    const verdict = figure.locator("[aria-live]");
    const move = figure.getByRole("button", { name: "Let KWin move it" });
    const first = figure.getByRole("group", { name: "Try", exact: true });
    await first.getByRole("button", { name: "A window that insists" }).click();
    await expect(verdict).toContainText("The canvas puts it back");
    await expect(verdict).toContainText("twice more");
    await move.click();
    await expect(verdict).toContainText("The canvas puts it back");
    await move.click();
    await expect(verdict).toContainText("The canvas keeps it");
    await expect(verdict).toContainText("third in a row");
    await first.getByRole("button", { name: "Pulled in from far away" }).click();
    await figure.getByText("More controls").click();
    await figure.getByRole("radio", { name: "After a pause (2000 ms)" }).click();
    await move.click();
    await move.click();
    await move.click();
    await expect(verdict).toContainText("The canvas puts it back");
  });
});

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

test.describe("the SudoStamp note's figures", () => {
  const limiter = (page: Page) => page.getByRole("figure", { name: /Changing address does not get a second prompt/ });
  const requests = (page: Page) => limiter(page).getByRole("list", { name: "Requests, oldest first" }).getByRole("listitem");
  const sigFigure = (page: Page) => page.getByRole("figure", { name: /One missing zero byte/ });
  const sshView = (page: Page) => sigFigure(page).getByRole("group", { name: /^What the computer is sent \(SSH blob\)[^:]*: \d+ bytes, hex$/ });
  const derView = (page: Page) => sigFigure(page).getByRole("group", { name: /^What the phone returns \(DER\): \d+ bytes, hex$/ });

  test("the limiter refuses a request without asking, and the 1.3 keying lets the same ones through", async ({ page }) => {
    const problems = watch(page);
    await page.goto(SUDO_NOTE);
    await page.waitForLoadState("networkidle");
    const fig = limiter(page);
    const status = fig.getByRole("status");
    // Opens on "Rotate the address" already played: one denial, then three new addresses, all refused without asking.
    await expect(fig.getByRole("button", { name: "Rotate the address" })).toHaveAttribute("aria-pressed", "true");
    await expect(requests(page)).toHaveCount(4);
    await expect(requests(page).nth(0)).toContainText("Asked, you denied");
    for (const n of [1, 2, 3]) {
      await expect(requests(page).nth(n)).toContainText("Refused, phone stayed silent");
      await expect(requests(page).nth(n)).toContainText(/cooling down after an unapproved request from this computer/i);
    }
    await expect(requests(page).nth(3)).toContainText("Old way: you would be asked here.");
    await expect(status).toContainText("Counting by computer, the phone asks you 1 time. Counting by address, it would have asked 4.");
    // One request alone is a different story: nothing is at stake until a second one arrives.
    await fig.getByText("Send your own request").click();
    await fig.getByRole("button", { name: "Start over" }).click();
    await fig.getByRole("button", { name: "Send request" }).click();
    await expect(requests(page)).toHaveCount(1);
    await expect(fig.getByRole("button", { name: "Rotate the address" })).toHaveAttribute("aria-pressed", "false");
    await fig.getByRole("button", { name: "Rotate the address" }).click();
    await expect(requests(page)).toHaveCount(4);
    // Counted by address, the same requests all reach the user, and the rows say so.
    await fig.getByRole("radio", { name: "by address (before)" }).click();
    await expect(fig.getByRole("list", { name: "Requests, oldest first" })).not.toContainText("Refused");
    await expect(requests(page).nth(3)).toContainText("New way: the phone would stay silent here.");
    await expect(status).toContainText("Counting by address, the phone asks you 4 times. Counting by computer, it would ask only 1.");
    await fig.getByRole("radio", { name: "by computer (now)" }).click();
    // Approved, then asked again straight away: refused while the quiet period lasts.
    await fig.getByRole("button", { name: "Ask again right after a yes" }).click();
    await expect(requests(page)).toHaveCount(3);
    await expect(requests(page).nth(0)).toContainText("Asked, you approved");
    await expect(requests(page).nth(1)).toContainText("Refused, phone stayed silent");
    await expect(requests(page).nth(1)).toContainText(/a request was just approved/i);
    await expect(fig.getByRole("button", { name: "Ask again right after a yes" })).toHaveAttribute("aria-pressed", "true");
    expect(problems).toEqual([]);
  });

  test("a request sent from the fold shows its row and the verdict without scrolling, and the 32-byte size is not repeated", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(SUDO_NOTE);
    await page.waitForLoadState("networkidle");
    const fig = limiter(page);
    await expect(requests(page).first()).not.toContainText("32 bytes");
    await fig.getByRole("button", { name: "Rotate the address" }).click();
    await expect(requests(page)).toHaveCount(4);
    await fig.getByText("Send your own request").click();
    // Computer B again, from yet another address, straight after: still refused.
    await fig.getByRole("button", { name: "Send request" }).click();
    await expect(requests(page)).toHaveCount(5);
    await expect(requests(page).nth(4)).toContainText("Refused, phone stayed silent");
    await expect(requests(page).nth(4)).toContainText(/cooling down after an unapproved request from this computer/i);
    await expect(requests(page).nth(4)).toContainText("Old way: you would be asked here.");
    await expect(requests(page).nth(4)).toBeInViewport();
    await expect(fig.getByRole("status")).toBeInViewport();
  });

  test("a payload that is not a challenge is refused before the user is asked, and the choices work from the keyboard", async ({ page }) => {
    await page.goto(SUDO_NOTE);
    await page.waitForLoadState("networkidle");
    const fig = limiter(page);
    await fig.getByText("Send your own request").click();
    await fig.getByRole("button", { name: "Start over" }).click();
    await expect(requests(page)).toHaveCount(0);
    await expect(fig.getByRole("status")).toContainText("Nothing sent yet");
    await fig.getByRole("radio", { name: "100 bytes, something else" }).click();
    await fig.getByRole("button", { name: "Send request" }).click();
    await expect(requests(page)).toHaveCount(1);
    await expect(requests(page).first()).toContainText("Refused, phone stayed silent");
    await expect(requests(page).first()).toContainText("100 bytes");
    await expect(requests(page).first()).toContainText(/refusing to sign 100 bytes: not a pam_rssh challenge/i);
    await expect(fig.getByRole("status")).toContainText("Either way of counting, the phone never asks you here.");
    // The same thing in one tap.
    await fig.getByRole("button", { name: "Rotate the address" }).click();
    await expect(requests(page)).toHaveCount(4);
    await fig.getByRole("button", { name: "Send 100 bytes" }).click();
    await expect(requests(page)).toHaveCount(1);
    await expect(requests(page).first()).toContainText(/refusing to sign 100 bytes/i);
    // Arrow keys move through a group of choices, and Tab leaves it.
    const a = fig.getByRole("radio", { name: "Computer A" });
    const b = fig.getByRole("radio", { name: "Computer B" });
    await b.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(a).toBeFocused();
    await expect(a).toHaveAttribute("aria-checked", "true");
    await expect(b).toHaveAttribute("aria-checked", "false");
  });

  test("the byte explorer signs in the browser and shows an SSH blob that verifies", async ({ page }) => {
    const problems = watch(page);
    await page.goto(SUDO_NOTE);
    await page.waitForLoadState("networkidle");
    const fig = sigFigure(page);
    const status = fig.getByRole("status");
    await expect(fig.getByText("Signed just now in this tab")).toBeVisible();
    await expect(sshView(page)).toBeVisible();
    await expect(derView(page)).toBeVisible();
    await expect(status).toContainText(/checked against this tab's public key with WebCrypto: valid\./);
    await fig.getByRole("button", { name: "Sign another value" }).click();
    await expect(status).toContainText(/with WebCrypto: valid\./);
    // Find a signature whose r or s has its top bit set: the extra 00 is marked in both views.
    // One tap to the punchline: signs until the pad is needed, leaves it out, and the reader refuses.
    await fig.getByRole("button", { name: "Show it failing" }).click();
    await expect(status).toContainText("Without the extra byte, the computer rejects this signature");
    await expect(sshView(page).locator("[data-missing]").first()).toBeVisible();
    await fig.getByRole("radio", { name: "with the extra byte (the app)" }).click();
    await expect(status).toContainText(/with WebCrypto: valid\./);
    await fig.getByRole("button", { name: "Keep signing until it needs the extra byte" }).click();
    await expect(status).toContainText("This signature needed the extra byte, and it verified");
    await expect(status).toContainText(/with WebCrypto: valid\./);
    await expect(derView(page).locator("[data-pad]").first()).toBeVisible();
    await expect(sshView(page).locator("[data-pad]").first()).toBeVisible();
    // Field by field, in the fold: lighting a row lights the same field in both views.
    await fig.getByText("Every field, and what WebCrypto returned").click();
    const lenRow = fig.getByRole("listitem").filter({ hasText: /DER bytes 2 to 3 \(2 B\)/ }).first();
    await expect(lenRow).toBeVisible();
    const padRow = fig.getByRole("listitem").filter({ hasText: /DER bytes \d+ \(1 B\), SSH bytes \d+ \(1 B\)/ }).first();
    await expect(padRow).toBeVisible();
    await fig.getByRole("button", { name: /^Length of (r|s)$/ }).first().focus();
    await expect(fig.locator("[role=group] span.bg-hit:not([data-pad])")).toHaveCount(2);
    // The bug the app warns about: without the pad, a reader sees a negative number and refuses.
    await fig.getByRole("radio", { name: "without it (the bug)" }).click();
    await expect(status).toContainText("the computer rejects this signature");
    await expect(status).toContainText(/reads as negative/);
    await expect(sshView(page).locator("[data-missing]").first()).toBeVisible();
    await fig.getByRole("radio", { name: "with the extra byte (the app)" }).click();
    await expect(status).toContainText(/with WebCrypto: valid\./);
    expect(problems).toEqual([]);
  });

  test("without JavaScript both figures still show their examples", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(SUDO_NOTE);
    await expect(limiter(page)).toBeVisible();
    await expect(requests(page)).toHaveCount(4);
    await expect(requests(page).nth(0)).toContainText("Asked, you denied");
    await expect(requests(page).nth(3)).toContainText("Refused, phone stayed silent");
    await expect(limiter(page).getByRole("status")).toContainText("Counting by computer, the phone asks you 1 time. Counting by address, it would have asked 4.");
    await expect(page.getByText("Test vector from the app's unit test")).toBeVisible();
    await expect(sshView(page)).toBeVisible();
    await expect(sigFigure(page)).toContainText("One missing zero byte and the signature fails");
    await context.close();
  });
});

test.describe("the ShutUp figure", () => {
  const figure = (page: Page) => page.getByRole("figure", { name: /A hand reaching to decline a call looks like a wave/ });
  const open = (fig: ReturnType<typeof figure>, summary: string) => fig.locator("summary", { hasText: summary }).click();

  test("opens on the claim, a preset and the reach, and the first screen holds the drawing and the verdict", async ({ page }) => {
    const problems = watch(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(SHUTUP);
    await page.waitForLoadState("networkidle");
    const fig = figure(page);
    await expect(fig.getByRole("button", { name: "Reach for the phone" })).toHaveAttribute("aria-pressed", "true");
    // Three rule switches in one row, and nothing else to operate before the folds.
    await expect(fig.getByRole("switch")).toHaveCount(3);
    // The drawing labels its own marks and axis, and the verdict sits under it, inside the first screens.
    await expect(fig.getByText("Hand over the sensor").first()).toBeVisible();
    await expect(fig.getByText("ignored", { exact: true }).first()).toBeVisible();
    await expect(fig.getByText("Seconds since the ringing began")).toBeVisible();
    const verdict = fig.getByRole("status").first();
    await expect(verdict).toContainText("The call keeps ringing.");
    const box = await verdict.boundingBox();
    expect(box!.y + box!.height).toBeLessThan(844 * 1.5);
    // The two things that live in folds are closed until asked for.
    await expect(fig.locator("summary", { hasText: "Why: what each rule did" })).toBeVisible();
    await expect(fig.getByRole("button", { name: "Hand over the sensor" })).toBeHidden();
    expect(problems).toEqual([]);
  });

  test("refuses the reach with the motion guard on and answers the call with it off", async ({ page }) => {
    const problems = watch(page);
    await page.goto(SHUTUP);
    await page.waitForLoadState("networkidle");
    const fig = figure(page);
    const status = fig.getByRole("status").first();
    const guard = fig.getByRole("switch", { name: /Ignore waves while the phone moves/ });
    await expect(guard).toBeChecked();
    // The reach pattern is loaded, every rule is on: both late waves are ignored and the call keeps ringing.
    await expect(status).toContainText("The call keeps ringing.");
    await expect(status).toContainText("0.30 s too early; 1.20 s dropped when the phone moved; 1.75 s soon after the phone moved");
    await open(fig, "Why: what each rule did");
    await expect(fig.getByText("a wave 0.40 s after the phone moved, muted until 2.15 s")).toBeVisible();
    await expect(fig.getByText("a wave 0.70 s too early, waves are ignored until 1.00 s")).toBeVisible();
    // Guard off: the same reach is now a double wave, and a double wave answers. The drawing and the verdict change in place.
    await guard.uncheck();
    await expect(status).toContainText("The call is answered at 1.75 s.");
    await expect(status).toHaveAttribute("data-tone", "warn");
    await expect(fig.getByText("answers", { exact: true })).toBeVisible();
    await expect(fig.getByText("jolt (rule off)")).toBeVisible();
    await expect(status).toContainText("Switched off: \u201cIgnore waves while the phone moves\u201d.");
    await expect(fig.getByText(/^recognised double wave$/)).toBeVisible();
    await expect(fig.getByText(/the phone moved: waves muted/)).toHaveCount(0);
    await guard.check();
    await expect(status).toContainText("The call keeps ringing.");
    await expect(status).toHaveAttribute("data-tone", "ok");
    expect(problems).toEqual([]);
  });

  test("the presets show a reach, a deliberate wave and a double wave, and each one's own result", async ({ page }) => {
    await page.goto(SHUTUP);
    await page.waitForLoadState("networkidle");
    const fig = figure(page);
    const status = fig.getByRole("status").first();
    const preset = (name: string) => fig.getByRole("button", { name, exact: true });
    await preset("A deliberate wave").click();
    await expect(preset("A deliberate wave")).toHaveAttribute("aria-pressed", "true");
    await expect(status).toContainText("The call is not answered.");
    await expect(status).toContainText("silences the ringer at 3.20 s");
    // The same wave answers the moment it is seen once the single-wave rule is off.
    await fig.getByRole("switch", { name: /One wave only silences/ }).uncheck();
    await expect(status).toContainText("The call is answered at 2.00 s.");
    await fig.getByRole("switch", { name: /One wave only silences/ }).check();
    await preset("A double wave").click();
    await expect(status).toContainText("The call is answered at 2.50 s.");
    await expect(status).toContainText("double wave");
    await preset("Reach for the phone").click();
    await expect(status).toContainText("The call keeps ringing.");
  });

  test("a timeline built by tapping hand over the sensor and away runs through the real detectors", async ({ page }) => {
    await page.goto(SHUTUP);
    await page.waitForLoadState("networkidle");
    const fig = figure(page);
    const status = fig.getByRole("status").first();
    await open(fig, "Build your own timeline");
    await fig.getByRole("button", { name: "Clear" }).click();
    await expect(status).toContainText("The call keeps ringing.");
    await expect(status).toContainText("No wave was seen");
    await expect(fig.getByRole("button", { name: "Reach for the phone" })).toHaveAttribute("aria-pressed", "false");
    await fig.getByRole("radio", { name: "1 s", exact: true }).click();
    await fig.getByRole("button", { name: "Hand away" }).click();
    await fig.getByRole("button", { name: "Hand away" }).click();
    await fig.getByRole("radio", { name: "0.25 s", exact: true }).click();
    await fig.getByRole("button", { name: "Hand over the sensor" }).click();
    await fig.getByRole("button", { name: "Hand away" }).click();
    await fig.getByRole("button", { name: "Hand over the sensor" }).click();
    // Two separate waves inside the window, after the arming delay: a double wave, which answers.
    await expect(status).toContainText("The call is answered at 2.50 s.");
    await fig.getByRole("button", { name: "Undo" }).click();
    // One wave: the window runs out and it silences. A single wave never answers.
    await expect(status).toContainText("silences the ringer at 3.20 s");
    // Take the single-wave rule off and the same wave answers the moment it is seen.
    await fig.getByRole("switch", { name: /One wave only silences/ }).uncheck();
    await expect(status).toContainText("The call is answered at 2.00 s.");
    // A jolt is an event of its own on the timeline.
    await fig.getByRole("button", { name: "Phone jolt" }).click();
    await expect(fig.getByText("jolt", { exact: true })).toBeVisible();
  });

  test("the randomised check runs in the tab, shows its seed and finds violations when a rule is off", async ({ page }) => {
    await page.goto(SHUTUP);
    await page.waitForLoadState("networkidle");
    const fig = figure(page);
    await open(fig, "Check it on random streams");
    await expect(fig.getByText(/Seed 7, 400 streams of 200 readings/)).toBeVisible();
    await expect(fig.getByText(/No stream broke a rule/)).toBeVisible();
    await fig.getByLabel("Seed").fill("11");
    await fig.getByRole("button", { name: "Run 400 streams" }).click();
    await expect(fig.getByText(/Seed 11, 400 streams of 200 readings/)).toBeVisible();
    await expect(fig.getByText(/No stream broke a rule/)).toBeVisible();
    await fig.getByRole("switch", { name: /Ignore waves while the phone moves/ }).uncheck();
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
    await expect(fig.getByRole("status").first()).toContainText("The call keeps ringing.");
    await expect(fig.getByText("a wave 0.40 s after the phone moved, muted until 2.15 s")).toBeVisible();
    await expect(fig.getByText(/Seed 7, 400 streams of 200 readings/)).toBeVisible();
    await expect(fig.getByText(/No stream broke a rule/)).toBeVisible();
    await expect(fig.getByRole("button")).toHaveCount(0);
    await expect(fig.getByRole("switch")).toHaveCount(0);
    await context.close();
  });
});

test.describe("alignment figure", () => {
  const drawing = (page: Page) => page.getByRole("table", { name: /^Each chart row/ });
  const rowOf = (page: Page, text: string) => drawing(page).getByRole("row").filter({ hasText: text });
  const verdict = (page: Page) => page.locator("[data-tone]");
  const lostCells = (page: Page) => drawing(page).getByRole("cell").filter({ hasText: /^lost/ });
  const preset = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
  const fold = (page: Page, name: string) => page.locator("summary").filter({ hasText: name });
  const openFold = async (page: Page, name: string) => {
    await fold(page, name).click();
  };

  test("opens on the failure, and is meaningful before it hydrates: the claim, both methods, the verdict, the rows and the matrix are in the HTML", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(ALIGN_NOTE);
    await expect(page.getByText("Leave one row out and the greedy matcher loses the rest of the song")).toBeVisible();
    await expect(verdict(page)).toContainText("Alignment places 11 of 11 rows; the greedy scan places 6 and ends 42 seconds early");
    await expect(verdict(page)).toHaveAttribute("data-tone", "warn");
    await expect(drawing(page)).toContainText("11 of 11");
    await expect(drawing(page)).toContainText("6 of 11");
    await expect(lostCells(page)).toHaveCount(5);
    // The chart's gap is drawn: the lyric line nothing in the chart matches.
    await expect(drawing(page)).toContainText("No chart row for this lyric");
    await expect(page.getByRole("grid", { includeHidden: true })).toBeAttached();
    await expect(page.getByLabel("Chart row 11")).toHaveValue("And grace will lead me home");
    await context.close();
  });

  test("the first screen is the claim, one thing to press, both columns and the verdict; the matrix and the editing controls are folded", async ({ page }) => {
    await page.goto(ALIGN_NOTE);
    await page.waitForLoadState("networkidle");
    await expect(preset(page, "A line missing")).toHaveAttribute("aria-pressed", "true");
    await expect(drawing(page).getByRole("columnheader", { name: /^Alignment/ })).toBeVisible();
    await expect(drawing(page).getByRole("columnheader", { name: /^Greedy scan/ })).toBeVisible();
    await expect(verdict(page)).toBeVisible();
    await expect(page.getByRole("grid")).toBeHidden();
    await expect(page.getByLabel("Chart row 1", { exact: true })).toBeHidden();
    // Each lyric is printed once in the drawing.
    await expect(drawing(page).getByText("And grace will lead me home")).toHaveCount(1);
  });

  test("deleting a row recomputes the alignment, and the greedy scan loses its place", async ({ page }) => {
    const problems = watch(page);
    await page.goto(ALIGN_NOTE);
    await page.waitForLoadState("networkidle");
    await preset(page, "Full chart").click();
    await expect(preset(page, "Full chart")).toHaveAttribute("aria-pressed", "true");
    await expect(verdict(page)).toContainText("Both methods give all 12 rows the same lines.");
    await expect(verdict(page)).toHaveAttribute("data-tone", "ok");
    await expect(drawing(page)).toContainText("12 of 12");
    await expect(lostCells(page)).toHaveCount(0);
    await expect(drawing(page)).not.toContainText("No chart row for this lyric");

    await openFold(page, "Edit the chart");
    await expect(page.getByLabel("Chart row 5")).toHaveValue("'Twas grace that taught my heart to fear");
    await page.getByRole("button", { name: "Delete row 5", exact: true }).click();

    await expect(page.getByLabel("Chart row 5")).toHaveValue("And grace my fears relieved");
    await expect(verdict(page)).toContainText("Alignment places 11 of 11 rows; the greedy scan places 6 and ends 42 seconds early");
    await expect(verdict(page)).toHaveAttribute("data-tone", "warn");
    await expect(verdict(page)).toContainText("The greedy scan lost rows");
    await expect(verdict(page)).toContainText("on a different line from the alignment");
    await expect(drawing(page)).toContainText("No chart row for this lyric");
    await expect(drawing(page)).toContainText("11 of 11");
    await expect(drawing(page)).toContainText("6 of 11");
    // Row 5 is now "And grace my fears relieved": the alignment puts it on its own line (0:41)
    // and the greedy scan on the dropped row's line (0:34).
    const rowFive = rowOf(page, "And grace my fears relieved");
    await expect(rowFive.getByRole("cell").nth(0)).toHaveText("0:41");
    await expect(rowFive.getByRole("cell").nth(1)).toContainText("0:34");
    // The last row: 1:23 by the alignment; the greedy scan puts it at 0:41. Rows between are lost.
    const last = rowOf(page, "And grace will lead me home");
    await expect(last.getByRole("cell").nth(0)).toHaveText("1:23");
    await expect(last.getByRole("cell").nth(1)).toContainText("0:41");
    const lostRow = rowOf(page, "How precious did that grace appear");
    await expect(lostRow.getByRole("cell").nth(0)).toHaveText("0:48");
    await expect(lostRow.getByRole("cell").nth(1)).toContainText("lost");
    await expect(lostCells(page)).toHaveCount(5);
    expect(problems).toEqual([]);
  });

  test("editing a row to one word takes it off its line; copying one adds a row; every edit moves both columns", async ({ page }) => {
    await page.goto(ALIGN_NOTE);
    await page.waitForLoadState("networkidle");
    await preset(page, "Full chart").click();
    await openFold(page, "Edit the chart");
    await page.getByLabel("Chart row 4").fill("amen");
    await expect(verdict(page)).toContainText("Both methods agree: 11 of 12 rows get a line");
    await expect(rowOf(page, "amen").getByRole("cell").nth(0)).toContainText("none");
    await expect(rowOf(page, "amen").getByRole("cell").nth(1)).toContainText("none");
    await preset(page, "Full chart").click();
    await expect(verdict(page)).toContainText("Both methods give all 12 rows the same lines.");
    await page.getByRole("button", { name: "Copy row 1", exact: true }).click();
    await expect(page.getByLabel("Chart row 13")).toBeVisible();
    await expect(verdict(page)).toContainText("Alignment places 12 of 13 rows");
    await preset(page, "A line missing").click();
    await expect(verdict(page)).toContainText("Alignment places 11 of 11 rows");
  });

  test("the row buttons are 44 px targets with names, and the two result columns fit a 390 px phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(ALIGN_NOTE);
    await page.waitForLoadState("networkidle");
    for (const name of ["Alignment", "Greedy scan"]) {
      const box = await drawing(page).getByRole("columnheader", { name: new RegExp(`^${name}`) }).boundingBox();
      expect(box, name).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    }
    await openFold(page, "Edit the chart");
    for (const name of ["Copy row 5", "Delete row 5"]) {
      const box = await page.getByRole("button", { name, exact: true }).boundingBox();
      expect(box!.width, name).toBeGreaterThanOrEqual(44);
      expect(box!.height, name).toBeGreaterThanOrEqual(44);
    }
  });

  test("the table of scores draws the path, takes a method and a cell mode, is a keyboard grid and a cell shows three numbers", async ({ page }) => {
    await page.goto(ALIGN_NOTE);
    await page.waitForLoadState("networkidle");
    await openFold(page, "The table of scores");
    const readout = page.getByRole("group", { name: "Selected matrix cell" });
    await expect(readout).toContainText("Row 11 against line 12");
    // The traceback is a connected run of cells (11 pairs and the skipped line), not three dots.
    expect(await page.getByRole("gridcell", { name: /a pair in the alignment/ }).count()).toBe(11);
    expect(await page.getByRole("gridcell", { name: /on the traceback: skip the line/ }).count()).toBe(1);
    await page.getByRole("gridcell", { name: /^Row 11, line 12:/ }).focus();
    await page.keyboard.press("ArrowUp");
    await expect(readout).toContainText("Row 10 against line 12");
    await page.keyboard.press("ArrowLeft");
    await expect(readout).toContainText("Row 10 against line 11");
    // Pair, skip the row, skip the line: three numbers side by side, the taken one marked.
    await expect(readout.getByRole("listitem")).toHaveCount(3);
    await expect(readout).toContainText("similarity 1.00 \u2212 0.5");
    await expect(readout.getByRole("listitem").first()).toContainText("0.50");
    await expect(readout.locator('[data-taken="true"]')).toHaveCount(1);
    // A single tab stop: the focused cell is the only one in the tab order.
    expect(await page.locator('[role="gridcell"][tabindex="0"]').count()).toBe(1);

    await page.getByRole("radio", { name: "Greedy scan" }).click();
    await expect(page.getByRole("radio", { name: "Greedy scan" })).toHaveAttribute("aria-checked", "true");
    expect(await page.getByRole("gridcell", { name: /a pair in the greedy scan/ }).count()).toBe(6);
    expect(await page.getByRole("gridcell", { name: /on the traceback/ }).count()).toBe(0);
    await page.getByRole("radio", { name: "Value" }).click();
    await expect(page.getByRole("gridcell", { name: /^Row 1, line 1:/ })).toHaveText(/^\d\.\d\d$/);
    // The legend sits at the matrix.
    await expect(page.getByRole("list", { name: "What the colours mean" })).toContainText("A pair the greedy scan chose");
  });

  test("it works in a 320 px column and the matrix scrolls inside itself", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(ALIGN_NOTE);
    await page.waitForLoadState("networkidle");
    await openFold(page, "The table of scores");
    const scroller = page.locator('[id$="-matrix"]');
    const { sw, cw } = await scroller.evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth }));
    expect(sw, "the matrix is wider than its container, so it scrolls there").toBeGreaterThan(cw);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
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

test.describe("the Tizen note's figures", () => {
  test("the sampling figure starts still, and the lazy way makes an edge one colour", async ({ page }) => {
    await page.goto(NOTE);
    await page.waitForLoadState("networkidle");
    const fig = page.locator("figure", { hasText: "average colour of its own patch" });
    await expect(fig.getByRole("button", { name: "Play the film" })).toBeVisible();
    await expect(fig.locator("[role=status][data-tone]")).toContainText(/different colours/);
    await fig.getByRole("button", { name: /lazy way/ }).click();
    await expect(fig.locator("[role=status][data-tone]")).toContainText("1 colour");
    await fig.getByRole("button", { name: /its own patch, as built/ }).click();
    await expect(fig.locator("[role=status][data-tone]")).toContainText(/different colours/);
  });

  test("the PQ figure: ignoring the curve changes the LED numbers", async ({ page }) => {
    await page.goto(NOTE);
    await page.waitForLoadState("networkidle");
    const fig = page.locator("figure", { hasText: "HDR video stores brightness" });
    await expect(fig.locator("[role=status][data-tone]")).toContainText("darker");
    await expect(fig.locator("[role=status][data-tone]")).toContainText("The app sends");
    const before = await fig.locator("[role=status][data-tone]").innerText();
    await fig.getByRole("button", { name: /A dark film/ }).click();
    await expect(fig.getByRole("button", { name: /A dark film/ })).toHaveAttribute("aria-pressed", "true");
    expect(await fig.locator("[role=status][data-tone]").innerText()).not.toBe(before);
    await fig.getByText("More controls").click();
    await fig.getByRole("radio", { name: "Deep green" }).click();
    await expect(fig.getByRole("radio", { name: "Deep green" })).toHaveAttribute("aria-checked", "true");
    await fig.getByRole("radio", { name: "Deep green" }).press("ArrowLeft");
    await expect(fig.getByRole("radio", { name: "Sky blue" })).toBeFocused();
  });

  test("the ceiling figure recomputes the rate from the spots", async ({ page }) => {
    await page.goto(NOTE);
    await page.waitForLoadState("networkidle");
    const fig = page.locator("figure", { hasText: "about 100 colours a second" });
    await expect(fig.locator("[role=status][data-tone]")).toContainText("4.2 times a second");
    await fig.getByRole("button", { name: /One spot per LED/ }).click();
    await expect(fig.locator("[role=status][data-tone]")).toContainText("1.4 times a second");
    await expect(fig.locator("[role=status][data-tone]")).toContainText("740 ms");
    await fig.getByText("More controls").click();
    await fig.getByLabel(/Wait before each reading/).fill("17");
    await expect(fig.locator("[role=status][data-tone]")).toContainText("measured about 1.4 Hz");
  });
});

test.describe("crush80 note figures", () => {
  test("the layer figure resolves keys from the layer that holds them", async ({ page }) => {
    await page.goto(CRUSH_NOTE);
    await page.waitForLoadState("networkidle");
    const fig = page.getByRole("figure", { name: /Hold Fn and the same keys/ });
    const verdict = fig.locator("[data-tone]");
    // Server HTML and first paint: Fn held, H is an arrow from layer 2.
    await expect(fig.getByRole("button", { name: /^← on the H key: Sends ←, from layer 2, Fn/ })).toHaveCount(1);
    await expect(verdict).toContainText(/\d+ of 88 keys now mean something else/);

    await fig.getByRole("button", { name: "Fn + Space" }).click();
    await expect(fig.getByRole("button", { name: /^4 on the J key: Sends 4, from layer 4, Num/ })).toHaveCount(1);
    // Transparent on Num, so H still comes from Fn.
    await expect(fig.getByRole("button", { name: /^← on the H key: Sends ←, from layer 2, Fn/ })).toHaveCount(1);

    await fig.getByRole("button", { name: "Hold right Win" }).click();
    await expect(fig.getByRole("button", { name: /^5 on the Home key: Sends 5, from layer 3, MacFn/ })).toHaveCount(1);
    await expect(verdict).toHaveAttribute("data-tone", "plain");

    // The bug, replayed through the rule: layer 3 turns on and is switched off again.
    await fig.getByRole("button", { name: "Right Win, before the fix" }).click();
    await expect(verdict).toHaveAttribute("data-tone", "warn");
    await expect(verdict).toContainText("Right Win does nothing: layer 3 switched itself off.");
    await expect(fig.getByRole("button", { name: /^Home on the Home key: Sends Home, from the base layer/ })).toHaveCount(1);
  });

  test("the keyboard says it scrolls sideways only where it does", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(CRUSH_NOTE);
    await page.waitForLoadState("networkidle");
    const fig = page.getByRole("figure", { name: /Hold Fn and the same keys/ });
    const board = fig.getByRole("region", { name: /Crush 80 keys/ });
    expect(await board.evaluate((b) => b.scrollWidth > b.clientWidth)).toBe(true);
    await expect(fig.getByText("Swipe the board sideways")).toBeVisible();
    // The board opens on the middle of the keys, so there is more of it on both sides.
    const fades = await board.evaluate((b) => [...b.parentElement!.querySelectorAll(":scope > div[aria-hidden]")].map((f) => getComputedStyle(f).opacity));
    expect(fades).toEqual(["1", "1"]);
    await board.evaluate((b) => (b.scrollLeft = b.scrollWidth));
    await expect.poll(() => board.evaluate((b) => [...b.parentElement!.querySelectorAll(":scope > div[aria-hidden]")].map((f) => getComputedStyle(f).opacity))).toEqual(["0", "1"]);
    await page.setViewportSize({ width: 1440, height: 900 });
    expect(await board.evaluate((b) => b.scrollWidth > b.clientWidth)).toBe(false);
    await expect(fig.getByText("Swipe the board sideways")).toHaveCount(0);
  });

  test("the layer figure answers to the visitor's own keys and walks with arrows", async ({ page }) => {
    await page.goto(CRUSH_NOTE);
    await page.waitForLoadState("networkidle");
    const fig = page.getByRole("figure", { name: /Hold Fn and the same keys/ });
    const h = fig.getByRole("button", { name: /on the H key/ });
    await h.focus();
    await page.keyboard.press("ArrowRight");
    await expect(fig.getByRole("button", { name: /on the J key/ })).toBeFocused();
    await fig.getByRole("button", { name: "Hold Fn" }).click();
    await fig.getByRole("button", { name: /on the J key/ }).focus();
    await page.keyboard.down("n");
    await expect(fig.getByRole("button", { name: /^4 on the J key: Sends 4, from layer 4, Num/ })).toHaveCount(1);
    await page.keyboard.up("n");
    await expect(fig.getByRole("button", { name: /^↓ on the J key: Sends ↓, from layer 2, Fn/ })).toHaveCount(1);
    // M is Fn+M: Mac mode swaps Alt and Win.
    await page.keyboard.press("m");
    await fig.getByText("More controls").click();
    const mac = fig.getByRole("switch", { name: "Mac mode" });
    await expect(mac).toHaveAttribute("aria-checked", "true");
    await mac.click();
    await expect(mac).toHaveAttribute("aria-checked", "false");
  });

  test("the clock figure shows the rounding and its drift", async ({ page }) => {
    await page.goto(CRUSH_NOTE);
    await page.waitForLoadState("networkidle");
    const fig = page.getByRole("figure", { name: /One rounding error/ });
    const verdict = fig.locator("[data-tone]");
    await expect(fig.getByTestId("division")).toHaveText("32,000 ÷ 10,000 = 3.2 cycles per tick, rounded down to 3");
    await expect(verdict).toHaveAttribute("data-tone", "warn");
    await expect(verdict).toContainText("64.0: 4.0 seconds fast");
    await fig.getByRole("button", { name: "8,000 a second, as it is now" }).click();
    await expect(verdict).toHaveAttribute("data-tone", "ok");
    await expect(verdict).toContainText("The clock keeps time");
    await fig.getByText("More controls").click();
    await fig.getByRole("textbox").fill("20000");
    await expect(verdict).toContainText("96.0: 36.0 seconds fast");
    await fig.getByRole("textbox").fill("40000");
    await expect(verdict).toContainText("cannot make that many ticks");
  });
});
