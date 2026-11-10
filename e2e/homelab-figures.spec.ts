import { test, expect } from "@playwright/test";

// The three figures of the homelab note, operated. Each test breaks something
// and checks the figure's answer, not just that a button exists.

const PATH = "/notes/homelab-git-is-the-truth/";

test.describe("homelab note figures", () => {
  test("drift: breaking things and running the job reports exactly what the note says it would", async ({ page }) => {
    await page.goto(PATH);
    await page.waitForLoadState("networkidle");
    const report = page.getByTestId("drift-report");
    // The opening night: the gateway edited, a compose file changed.
    await expect(report).toContainText("sync-live: 1 committed");
    await expect(report).toContainText("tofu-plan: 1 reported");
    await page.getByRole("button", { name: "Put it all back" }).click();
    await page.getByRole("button", { name: "Run tonight's job" }).click();
    await expect(report).toContainText("the commit is empty");
    await expect(report).toContainText("tofu-plan: no difference");
    // An undeclared guest changes: plan cannot see it.
    await page.getByRole("button", { name: "Edit settings on Devbox" }).click();
    await page.getByRole("button", { name: "Run tonight's job" }).click();
    await expect(report).toContainText("tofu-plan: no difference");
    await expect(report).toContainText("neither stage sees");
    await expect(report).toContainText("not declared yet");
    // A declared guest goes missing, a secret is left in a synced file.
    await page.getByRole("button", { name: "Remove Home Assistant" }).click();
    await page.getByRole("button", { name: "Leave a live secret in a synced file" }).click();
    await expect(page.getByText("You changed the live side since the last run.")).toBeVisible();
    await page.getByRole("button", { name: "Run tonight's job" }).click();
    await expect(report).toContainText("tofu-plan: 1 reported");
    await expect(report).toContainText("declared, but not on the host");
    await expect(report).toContainText("redaction pass");
  });

  test("paging: the gate pays one page for a persisting fault and the naive rule pays one per failure", async ({ page }) => {
    await page.goto(PATH);
    await page.waitForLoadState("networkidle");
    const count = page.getByTestId("paging-count");
    await expect(count).toHaveText("11 checks failed, 2 pages sent");
    // A single failed probe in a healthy row: one more failure, no page.
    await page.getByRole("button", { name: "Backup freshness, run 2 of 16: healthy. Press to change." }).click();
    await expect(count).toHaveText("12 checks failed, 2 pages sent");
    // Two in a row make it a fault that pages.
    await page.getByRole("button", { name: "Backup freshness, run 3 of 16: healthy. Press to change." }).click();
    await expect(count).toHaveText("13 checks failed, 3 pages sent");
    await page.getByRole("switch", { name: /Naive rule/ }).click();
    await expect(count).toHaveText("13 checks failed, 13 pages sent");
    await page.getByRole("button", { name: "Reset the strip" }).click();
    await expect(count).toHaveText("11 checks failed, 11 pages sent");
  });

  test("backups: losing the host leaves only the copy that lives elsewhere", async ({ page }) => {
    await page.goto(PATH);
    await page.waitForLoadState("networkidle");
    const result = page.getByTestId("backups-result");
    await page.getByRole("button", { name: "A whole guest" }).click();
    await expect(result).toContainText("Restored from the nightly copy.");
    await page.getByRole("button", { name: "The host" }).click();
    await expect(result.locator("li", { hasText: "Backup Server, nightly" })).toContainText("had it, lost with it");
    await expect(result.locator("li", { hasText: "restic copy" })).toContainText("restores it");
    await page.getByRole("button", { name: "The other machine" }).click();
    await expect(result).toContainText("One copy is left, and it lives on the host.");
  });
});
