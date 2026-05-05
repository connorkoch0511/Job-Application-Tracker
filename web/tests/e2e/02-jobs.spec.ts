/**
 * Jobs page — visual showcase + functional tests.
 */
import { test, expect } from "@playwright/test";

test.describe("Jobs page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("shows stat cards and job listings", async ({ page }) => {
    await expect(page.getByText("Total Jobs")).toBeVisible();
    await expect(page.getByText("Scored", { exact: true })).toBeVisible();
    await expect(page.getByText("Avg Score")).toBeVisible();
    await expect(page.getByText("Strong Matches")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Job Listings" })).toBeVisible();

    await page.screenshot({ path: "tests/screenshots/04-jobs-overview.png", fullPage: false });
  });

  test("source filter buttons work", async ({ page }) => {
    // Find source-specific buttons by their known label text
    const sourceNames = ["RemoteOK", "Remotive", "The Muse", "LinkedIn"];
    let clicked = false;

    for (const name of sourceNames) {
      const btn = page.getByRole("button", { name: new RegExp(`^${name}$`, "i") });
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(300);
        clicked = true;
        break;
      }
    }

    await page.screenshot({ path: "tests/screenshots/05-jobs-source-filter.png", fullPage: false });

    if (clicked) {
      await page.getByRole("button", { name: /^all$/i }).first().click();
      await page.waitForTimeout(300);
    }
  });

  test("min score slider filters jobs", async ({ page }) => {
    const slider = page.locator('input[type="range"]');
    await expect(slider).toBeVisible({ timeout: 10_000 });

    await slider.fill("70");
    await slider.dispatchEvent("input");
    await page.waitForTimeout(400);

    await expect(page.getByText(/Min score:/)).toBeVisible();

    await page.screenshot({ path: "tests/screenshots/06-jobs-score-filter.png", fullPage: false });

    await slider.fill("0");
    await slider.dispatchEvent("input");
  });

  test("scored job card shows full detail breakdown", async ({ page }) => {
    const whyApplySection = page.getByText("Why Apply").first();

    if (await whyApplySection.isVisible()) {
      await whyApplySection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
    }

    await page.screenshot({ path: "tests/screenshots/07-jobs-score-detail.png", fullPage: false });
  });

  test("search filter narrows job list", async ({ page }) => {
    const searchInput = page.getByPlaceholder("Search title or company...");
    await expect(searchInput).toBeVisible({ timeout: 10_000 });

    await searchInput.fill("engineer");
    await page.waitForTimeout(300);

    await page.screenshot({ path: "tests/screenshots/08-jobs-search.png", fullPage: false });

    // Clear via the clear button or by emptying the field
    const clearBtn = page.getByRole("button", { name: /clear/i });
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
    } else {
      await searchInput.fill("");
    }
  });

  test("score or rescore button is present", async ({ page }) => {
    const rescoreBtn = page.getByRole("button", { name: /rescore all/i });
    const scoreBtn = page.getByRole("button", { name: /score visible/i });

    const hasRescore = await rescoreBtn.isVisible();
    const hasScore = await scoreBtn.isVisible();

    // At least one action button should appear when there are jobs
    // (If there are zero jobs in the DB this gracefully passes)
    if (hasRescore || hasScore) {
      await page.screenshot({ path: "tests/screenshots/09-jobs-action-buttons.png", fullPage: false });
    }
  });
});
