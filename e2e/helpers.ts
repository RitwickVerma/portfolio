import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Open the <details> a summary belongs to, and wait until it stays open. Retried: a click that lands
 * before hydration can be undone when React renders the fold closed again (WebKit on the shared
 * runner, MR !44 pipeline 3059486261: "before eBay" opened, then its text was hidden). Never clicks
 * an open fold, so it cannot close one.
 */
export async function unfold(summary: Locator) {
  const details = summary.locator("xpath=ancestor::details[1]");
  await expect(async () => {
    if ((await details.getAttribute("open")) === null) await summary.click();
    await expect(details).toHaveAttribute("open", "", { timeout: 2_000 });
    await summary.page().waitForTimeout(300); // still open a beat later: hydration did not shut it
    await expect(details).toHaveAttribute("open", "", { timeout: 100 });
  }).toPass({ timeout: 30_000 });
}

/**
 * Does anything make the page scroll sideways? `scroll` and `client` are the document's widths;
 * `widest` names the element that pokes out of the viewport, ignoring anything inside a scroll
 * container (content there may be wider than the page; the page itself may not).
 */
export async function sidewaysOverflow(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    let widest = "";
    let max = root.clientWidth;
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > max + 0.5 && getComputedStyle(el).position !== "fixed") {
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
}
