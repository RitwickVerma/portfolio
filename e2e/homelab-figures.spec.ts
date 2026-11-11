import { test, expect } from "@playwright/test";

// The three figures of the homelab note, operated. Each test presses things
// and checks the verdict the figure computes, not just that a button exists.

const PATH = "/notes/homelab-git-is-the-truth/";

test.describe("homelab note figures", () => {
  test("drift: a scenario changes the lab and the nightly job says what it finds", async ({ page }) => {
    await page.goto(PATH);
    await page.waitForLoadState("networkidle");
    const fig = page.getByRole("figure", { name: /Change something by hand/ });
    const verdict = fig.getByRole("status");
    await expect(verdict).toContainText("Nothing changed");
    await fig.getByRole("button", { name: "Edit the gateway" }).click();
    await expect(verdict).toContainText("The job reports 1 difference.");
    // A guest nobody wrote down: the comparison cannot see it.
    await fig.getByRole("button", { name: "Edit the dev box" }).click();
    await expect(verdict).toContainText("It cannot see 1 change.");
    await expect(verdict).toContainText("Nobody has written that machine into the repository yet");
    await fig.getByRole("button", { name: "Leave a password in a config" }).click();
    await expect(verdict).toContainText("saves 1 changed file");
    await expect(verdict).toContainText("scrubbed");
    // Custom changes wait for the run.
    await fig.getByText("More controls").click();
    await fig.getByRole("radiogroup", { name: "Home Assistant" }).getByRole("radio", { name: "Gone" }).click();
    await expect(verdict).toContainText("You changed the lab");
    await fig.getByRole("button", { name: "Run tonight's job" }).click();
    await expect(verdict).toContainText("reports 1 difference");
  });

  test("drift: a yes/no change is a real switch with a 44 px target", async ({ page }) => {
    await page.goto(PATH);
    await page.waitForLoadState("networkidle");
    const fig = page.getByRole("figure", { name: /Change something by hand/ });
    await fig.getByText("More controls").click();
    const sw = fig.getByRole("switch", { name: "A password is left in a config" });
    await expect(sw).toHaveAttribute("aria-checked", "false");
    expect((await sw.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await sw.click();
    await expect(sw).toHaveAttribute("aria-checked", "true");
    await expect(fig.getByRole("status")).toContainText("You changed the lab");
    await sw.press("Space");
    await expect(sw).toHaveAttribute("aria-checked", "false");
  });

  test("paging: the gate pays one page for a fault that lasts, the naive rule one per failure", async ({ page }) => {
    await page.goto(PATH);
    await page.waitForLoadState("networkidle");
    const fig = page.getByRole("figure", { name: /keeps failing pages me once/ });
    const verdict = fig.getByRole("status");
    await expect(verdict).toContainText("6 checks failed, 1 page sent.");
    await fig.getByRole("radio", { name: "Page on every failure" }).click();
    await expect(verdict).toContainText("6 checks failed, 6 pages sent.");
    await fig.getByRole("radio", { name: "Page once per new fault" }).click();
    await fig.getByRole("button", { name: "One failed check now and then" }).click();
    await expect(verdict).toContainText("6 checks failed, 0 pages sent.");
    await fig.getByRole("button", { name: "A fault that comes and goes" }).click();
    await expect(verdict).toContainText("8 checks failed, 1 page sent.");
    // Flip individual checks: one failure in a healthy row pages nobody, two in a row do.
    await fig.getByRole("button", { name: "A fault that lasts" }).click();
    await fig.getByText("More controls").click();
    await fig.getByRole("button", { name: "TLS expiry, check 1 of 12: healthy. Press to change." }).click();
    await expect(verdict).toContainText("7 checks failed, 1 page sent.");
    await fig.getByRole("button", { name: "TLS expiry, check 2 of 12: healthy. Press to change." }).click();
    await expect(verdict).toContainText("8 checks failed, 2 pages sent.");
  });

  test("backups: losing the host leaves only the copy that lives elsewhere", async ({ page }) => {
    await page.goto(PATH);
    await page.waitForLoadState("networkidle");
    const fig = page.getByRole("figure", { name: /Lose the host and its backup/ });
    const verdict = fig.getByRole("status");
    await expect(verdict).toContainText("Nothing is lost yet.");
    await fig.getByRole("button", { name: "The host", exact: true }).click();
    await expect(verdict).toContainText("The nightly backup on the host went with it. The copy on the other machine and Git bring it back.");
    await expect(fig.locator('li[data-state="restores it"]')).toHaveCount(2);
    await expect(fig.locator('li[data-state="had it, lost with it"]')).toContainText("Backup Server");
    await fig.getByRole("button", { name: "The other machine" }).click();
    await expect(verdict).toContainText("No data is lost, but only the copy on the host is left.");
  });
});
