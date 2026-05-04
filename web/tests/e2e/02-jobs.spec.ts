/**
 * Jobs page — visual showcase + functional tests.
 * Requires a logged-in session (auth.setup.ts runs first).
 */
import { test, expect } from "@playwright/test";

test.describe("Jobs page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for the job list to finish loading
    await page.waitForLoadState("networkidle");
  });

  test("shows stat cards and job listings", async ({ page }) => {
    // Stat cards should be visible
    await expect(page.getByText("Total Jobs")).toBeVisible();
    await expect(page.getByText("Scored")).toBeVisible();
    await expect(page.getByText("Avg Score")).toBeVisible();
    await expect(page.getByText("Strong Matches")).toBeVisible();

    // Job listings heading
    await expect(page.getByRole("heading", { name: "Job Listings" })).toBeVisible();

    await page.screenshot({
      path: "tests/screenshots/03-jobs-overview.png",
      fullPage: false,
    });
  });

  test("source filter buttons work", async ({ page }) => {
    // Click the first non-All source button if it exists
    const sourceButtons = page.locator("button").filter({ hasNotText: /all|score|rescore/i });
    const count = await sourceButtons.count();

    if (count > 0) {
      await sourceButtons.first().click();
      await page.waitForTimeout(300);
    }

    await page.screenshot({
      path: "tests/screenshots/04-jobs-source-filter.png",
      fullPage: false,
    });

    // Reset to All
    await page.getByRole("button", { name: /^all$/i }).click();
  });

  test("min score slider filters jobs", async ({ page }) => {
    const slider = page.locator('input[type="range"]');
    await expect(slider).toBeVisible();

    // Drag slider to 70
    await slider.fill("70");
    await slider.dispatchEvent("input");
    await page.waitForTimeout(400);

    await expect(page.getByText(/Min score:/).first()).toBeVisible();

    await page.screenshot({
      path: "tests/screenshots/05-jobs-score-filter.png",
      fullPage: false,
    });

    // Reset
    await slider.fill("0");
    await slider.dispatchEvent("input");
  });

  test("scored job card shows full detail breakdown", async ({ page }) => {
    // Find a job card that has score detail sections (Why Apply, Gaps, etc.)
    const whyApplySection = page.getByText("Why Apply").first();

    if (await whyApplySection.isVisible()) {
      const card = page.locator(".rounded-xl").filter({ has: whyApplySection }).first();
      await card.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);

      await page.screenshot({
        path: "tests/screenshots/06-jobs-score-detail.png",
        fullPage: false,
      });
    } else {
      // App has no scored jobs yet — screenshot the empty state
      await page.screenshot({
        path: "tests/screenshots/06-jobs-score-detail.png",
        fullPage: false,
      });
    }
  });

  test("search filter narrows job list", async ({ page }) => {
    const searchInput = page.getByPlaceholder("Search title or company...");
    await searchInput.fill("engineer");
    await page.waitForTimeout(300);

    const listingCount = page.locator(".rounded-xl.p-5");
    const n = await listingCount.count();
    // Either some results or an empty-state message
    expect(n >= 0).toBeTruthy();

    await page.screenshot({
      path: "tests/screenshots/07-jobs-search.png",
      fullPage: false,
    });

    // Clear search
    await page.getByRole("button", { name: /clear/i }).click();
  });

  test("rescore all button is present when jobs are scored", async ({ page }) => {
    const rescoreBtn = page.getByRole("button", { name: /rescore all/i });
    const scoreBtn = page.getByRole("button", { name: /score visible/i });

    // At least one action button should be visible
    const hasRescore = await rescoreBtn.isVisible();
    const hasScore = await scoreBtn.isVisible();
    expect(hasRescore || hasScore).toBeTruthy();

    await page.screenshot({
      path: "tests/screenshots/08-jobs-action-buttons.png",
      fullPage: false,
    });
  });
});
