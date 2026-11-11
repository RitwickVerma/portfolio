import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { projects } from "../src/lib/data";

// The project rows say whether the project is alive: last commit, CI, tag, stars, dated. The
// figures are fetched from GitLab once, at build time (tools/liveness.mjs); the page never asks.

const ROOT = join(__dirname, "..");
const LIST = projects.filter((p) => p.links.gitlab).map((p) => ({ slug: p.slug }));
const GENERATED = JSON.parse(readFileSync(join(ROOT, "src/lib/liveness.generated.json"), "utf8")) as {
  projects: Record<string, { asOf?: string; pipeline: string | null; source: string }>;
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const label = (day: string) => `${Number(day.slice(8, 10))} ${MONTHS[Number(day.slice(5, 7)) - 1]} ${day.slice(0, 4)}`;

test("there are projects with a GitLab link to show", () => {
  expect(LIST.length).toBeGreaterThanOrEqual(5);
});

test.describe("liveness lines", () => {
  test("every row with a GitLab link shows one, and rows without a link show none", async ({ page }) => {
    await page.goto("/");
    const lines = page.locator("#projects [data-liveness]");
    await expect(lines).toHaveCount(LIST.length);
    for (const { slug } of LIST) {
      const line = page.locator(`#projects [data-liveness="${slug}"]`);
      await expect(line).toHaveCount(1);
      await expect(line).toHaveText(/Last commit .*\s· as of\s\d/);
      // It sits in the row it describes, with that row's GitLab link.
      await expect(page.locator(`#projects article:has([data-liveness="${slug}"]) a[href*="gitlab.com/"]`)).not.toHaveCount(0);
    }
  });

  test("the line is the generated file, dated by its own fetch day", async ({ page }) => {
    await page.goto("/");
    for (const { slug } of LIST) {
      const entry = GENERATED.projects[slug];
      const line = page.locator(`#projects [data-liveness="${slug}"]`);
      if (!entry) {
        await expect(line).toContainText("(snapshot)");
        continue;
      }
      await expect(line).toContainText(`as of ${label(entry.asOf!)}`);
      if (entry.pipeline === "passed") await expect(line.locator("span.text-ok")).toHaveText("CI passed");
      if (entry.pipeline === "failed") await expect(line.locator("span.text-warn")).toHaveText("CI failed");
      if (entry.pipeline === null) await expect(line).not.toContainText("CI ");
      // Kept or snapshot data says so; fresh data does not.
      const snap = (await line.getAttribute("data-source")) === "snapshot";
      expect(/\(snapshot\)$/.test((await line.textContent()) ?? "")).toBe(snap);
    }
  });

  test("the page asks GitLab for nothing at view time", async ({ page }) => {
    const hosts = new Set<string>();
    page.on("request", (r) => hosts.add(new URL(r.url()).host));
    await page.goto("/");
    await page.locator("#projects").scrollIntoViewIfNeeded();
    await page.waitForLoadState("networkidle");
    expect([...hosts].filter((h) => h.includes("gitlab"))).toEqual([]);
    expect([...hosts]).toEqual(["127.0.0.1:4173"]);
  });

  test("no JavaScript: the lines are in the server HTML", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto("/");
    for (const { slug } of LIST) await expect(page.locator(`#projects [data-liveness="${slug}"]`)).toHaveText(/Last commit .*\s· as of\s\d/);
    await ctx.close();
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`axe finds no violations in the projects section, ${scheme}`, async ({ browser, browserName }) => {
      test.skip(browserName !== "chromium", "axe results do not depend on the engine; run once");
      const context = await browser.newContext({ colorScheme: scheme, reducedMotion: "reduce" });
      const page = await context.newPage();
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await expect(page.locator("#projects [data-liveness]").first()).toBeVisible();
      const { violations } = await new AxeBuilder({ page })
        .include("#projects")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
        .analyze();
      expect(violations.map((v) => `${v.id} (${v.impact}): ${v.help} -> ${v.nodes.map((n) => n.target.join(" ")).slice(0, 4).join(" | ")}`)).toEqual([]);
      await context.close();
    });
  }
});
