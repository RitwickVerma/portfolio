import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Smoke tests over the built site. Each one guards a promise the site makes
// in its own copy (colophon, /design): no errors, no third-party requests,
// complete without JavaScript, still under reduced motion, one printed page.

const NOTE = "/notes/tizen-video-plane-ambilight/";
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
      if (name === "figure note") {
        // The figure's first state is a played case, so the server HTML already says what the classifier decided and why.
        const figure = page.locator("figure").first();
        await expect(figure.locator("[aria-live]")).toContainText("Revert");
        await expect(figure.getByText(/Same size, from out of reach to in reach/)).toBeVisible();
        await expect(figure.locator("figcaption")).toContainText("KWin is not running");
      }
      if (name === "resume") await expect(page.locator("a[download]")).toHaveAttribute("href", /Ritwick_Verma_Resume\.pdf$/);
      await context.close();
    });
  });
}

test.describe("the frame-authority figure", () => {
  test("a pull is reverted and a move on the screen is adopted, placed by keyboard and by pointer", async ({ page }) => {
    const problems = watch(page);
    await page.goto(FIGURE_NOTE);
    await page.waitForLoadState("networkidle");
    const figure = page.locator("figure").first();
    const verdict = figure.locator("[aria-live]");
    const move = figure.getByRole("button", { name: "Move it" });
    const win = figure.getByRole("group", { name: /^Window at/ });
    const x = figure.getByLabel("x", { exact: true });

    // Server-rendered state, then the same case played again: the second revert of a chain.
    await expect(verdict).toContainText("Revert");
    await move.click();
    await expect(verdict).toContainText("Revert");
    await expect(verdict).toContainText("from 4000, 300 to 1820, 300");

    // A third one right after would be the window insisting, so let the figure's clock pause between the next moves.
    await figure.getByLabel("After a pause (2000 ms)").check();

    // Keyboard: nine Shift+Left steps of 200 px bring it from 4000 to 2200, still out of reach; two more put 100 px of it over the monitor.
    await win.focus();
    for (let i = 0; i < 9; i++) await page.keyboard.press("Shift+ArrowLeft");
    await expect(x).toHaveValue("2200");
    await move.click();
    await expect(verdict).toContainText("Revert");
    await expect(verdict).toContainText("from 2200, 300 to 1820, 300");
    await win.focus();
    for (let i = 0; i < 2; i++) await page.keyboard.press("Shift+ArrowLeft");
    await expect(x).toHaveValue("1800");
    // Now in reach: KWin's rule has nothing to do, and a window that did not move is adopted.
    await move.click();
    await expect(verdict).toContainText("Adopt");
    await expect(figure.getByText("not asked").first()).toBeVisible();

    // Pointer: drag it far off to the right, where KWin will pull it back.
    const box = (await win.locator("rect").nth(1).boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, { steps: 6 });
    await page.mouse.up();
    expect(Number(await x.inputValue())).toBeGreaterThan(2500);
    await expect(verdict).toContainText("Not played");
    await move.click();
    await expect(verdict).toContainText("Revert");

    // A preset is a whole case: a move between two places on the screen is the window's own.
    await figure.getByRole("button", { name: "A move on the screen" }).click();
    await expect(verdict).toContainText("Adopt");
    await expect(figure.getByRole("button", { name: "A move on the screen" })).toHaveAttribute("aria-pressed", "true");
    expect(problems).toEqual([]);
  });

  test("a window that insists is adopted on the third move, and a pause starts the chain again", async ({ page }) => {
    await page.goto(FIGURE_NOTE);
    await page.waitForLoadState("networkidle");
    const figure = page.locator("figure").first();
    const verdict = figure.locator("[aria-live]");
    const move = figure.getByRole("button", { name: "Move it" });
    await figure.getByRole("button", { name: "A window that insists" }).click();
    await expect(verdict).toContainText("Revert");
    await move.click();
    await expect(verdict).toContainText("Revert");
    await move.click();
    await expect(verdict).toContainText("Adopt");
    await expect(verdict).toContainText("third in a row");
    await figure.getByRole("button", { name: "Pulled in from far away" }).click();
    await figure.getByLabel("After a pause (2000 ms)").check();
    await move.click();
    await move.click();
    await move.click();
    await expect(verdict).toContainText("Revert");
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
    // Opens on the one denial; "Rotate the address" retries from three new addresses, all refused without asking.
    await expect(requests(page)).toHaveCount(1);
    await expect(requests(page).nth(0)).toContainText("Asked, you denied");
    await expect(fig.getByRole("button", { name: "Rotate the address" })).toHaveAttribute("aria-pressed", "false");
    await fig.getByRole("button", { name: "Rotate the address" }).click();
    await expect(requests(page)).toHaveCount(4);
    await expect(requests(page).nth(0)).toContainText("Asked, you denied");
    for (const n of [1, 2, 3]) {
      await expect(requests(page).nth(n)).toContainText("Refused, phone stayed silent");
      await expect(requests(page).nth(n)).toContainText(/cooling down after an unapproved request from this computer/i);
    }
    await expect(requests(page).nth(3)).toContainText("Old way: you would be asked here.");
    await expect(status).toContainText("Counting by computer, the phone asks you 1 time. Counting by address, it would have asked 4.");
    await expect(fig.getByRole("button", { name: "Rotate the address" })).toHaveAttribute("aria-pressed", "true");
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
    await expect(requests(page)).toHaveCount(1);
    await expect(requests(page).nth(0)).toContainText("Asked, you denied");
    await expect(limiter(page).getByRole("status")).toContainText("the phone asks you 1 time");
    await expect(page.getByText("Test vector from the app's unit test")).toBeVisible();
    await expect(sshView(page)).toBeVisible();
    await expect(sigFigure(page)).toContainText("One missing zero byte and the signature fails");
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

test.describe("alignment figure", () => {
  const summary = (page: Page, method: "Alignment" | "Greedy scan") => page.getByRole("row", { name: new RegExp(`^${method}`) });
  const method = (page: Page, name: "Alignment" | "Greedy scan") => page.getByRole("button", { name, exact: true });
  const preset = (page: Page, name: string) => page.getByRole("button", { name, exact: true });

  test("opens on the failure, and is meaningful before it hydrates: both methods, the rows and the matrix are in the HTML", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(ALIGN_NOTE);
    await expect(summary(page, "Alignment")).toContainText("11 of 11");
    await expect(summary(page, "Greedy scan")).toContainText("6 of 11");
    await expect(page.getByRole("grid")).toBeVisible();
    await expect(page.getByLabel("Chart row 11")).toHaveValue("And grace will lead me home");
    await context.close();
  });

  test("deleting a row recomputes the alignment, and the greedy scan loses its place", async ({ page }) => {
    const problems = watch(page);
    await page.goto(ALIGN_NOTE);
    await page.waitForLoadState("networkidle");
    await preset(page, "Full chart").click();
    await expect(summary(page, "Alignment")).toContainText("12 of 12");
    await expect(summary(page, "Greedy scan")).toContainText("12 of 12");
    await expect(page.getByLabel("Chart row 5")).toHaveValue("'Twas grace that taught my heart to fear");

    await page.getByRole("button", { name: "Delete row 5" }).click();

    await expect(page.getByLabel("Chart row 5")).toHaveValue("And grace my fears relieved");
    await expect(summary(page, "Alignment")).toContainText("11 of 11");
    await expect(summary(page, "Alignment")).toContainText("1:23");
    await expect(summary(page, "Greedy scan")).toContainText("6 of 11");
    await expect(summary(page, "Greedy scan")).toContainText("0:41");
    // Row 5 is now "And grace my fears relieved": the alignment puts it on its own line (0:41, line 6)
    // and the greedy scan on the dropped row's line (0:34).
    const rowFive = page.getByRole("listitem").filter({ has: page.getByLabel("Chart row 5") });
    await expect(rowFive).toContainText("Alignment: 0:41");
    await expect(rowFive).toContainText("greedy: 0:34, line 5");
    await method(page, "Greedy scan").click();
    await expect(method(page, "Greedy scan")).toHaveAttribute("aria-pressed", "true");
    await expect(rowFive).toContainText("0:34");
    await expect(rowFive).toContainText("alignment: 0:41, line 6");
    expect(problems).toEqual([]);
  });

  test("editing a row to one word takes it off its line; duplicating one adds a row", async ({ page }) => {
    await page.goto(ALIGN_NOTE);
    await page.waitForLoadState("networkidle");
    await preset(page, "Full chart").click();
    await page.getByLabel("Chart row 4").fill("amen");
    await expect(summary(page, "Alignment")).toContainText("11 of 12");
    await preset(page, "Full chart").click();
    await expect(summary(page, "Alignment")).toContainText("12 of 12");
    await page.getByRole("button", { name: "Duplicate row 1", exact: true }).click();
    await expect(page.getByLabel("Chart row 13")).toBeVisible();
    await expect(summary(page, "Alignment")).toContainText("12 of 13");
    await preset(page, "A line missing").click();
    await expect(summary(page, "Alignment")).toContainText("11 of 11");
  });

  test("the matrix is a keyboard grid and a cell shows its arithmetic", async ({ page }) => {
    await page.goto(ALIGN_NOTE);
    await page.waitForLoadState("networkidle");
    const readout = page.getByRole("group", { name: "Selected matrix cell" });
    await expect(readout).toContainText("Row 11 against line 12");
    await page.getByRole("gridcell", { name: /^Row 11, line 12:/ }).focus();
    await page.keyboard.press("ArrowUp");
    await expect(readout).toContainText("Row 10 against line 12");
    await page.keyboard.press("ArrowLeft");
    await expect(readout).toContainText("Row 10 against line 11");
    await expect(readout).toContainText("worth 1.00 - 0.5 = 0.50");
    // A single tab stop: the focused cell is the only one in the tab order.
    expect(await page.locator('[role="gridcell"][tabindex="0"]').count()).toBe(1);
  });

  test("it works in a 320 px column and the matrix scrolls inside itself", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(ALIGN_NOTE);
    await page.waitForLoadState("networkidle");
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
