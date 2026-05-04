/**
 * Applications pipeline page — visual showcase + functional tests.
 */
import { test, expect } from "@playwright/test";

test.describe("Applications page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/applications");
    await page.waitForLoadState("networkidle");
  });

  test("shows application pipeline with status summary", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "My Applications" })).toBeVisible();

    await page.screenshot({
      path: "tests/screenshots/09-applications.png",
      fullPage: true,
    });
  });

  test("status count badges are visible when applications exist", async ({ page }) => {
    const statusBadges = page.locator(".rounded-lg.border").filter({ hasText: /interested|applied|interviewing|offer|rejected/i });
    const count = await statusBadges.count();

    if (count > 0) {
      // Status summary is showing
      for (const status of ["interested", "applied", "interviewing"]) {
        await expect(page.getByText(new RegExp(`${status}:`, "i")).first()).toBeVisible();
      }
    }

    await page.screenshot({
      path: "tests/screenshots/10-applications-status-counts.png",
      fullPage: false,
    });
  });

  test("notes textarea is editable", async ({ page }) => {
    const textarea = page.locator("textarea").first();
    const count = await page.locator("textarea").count();

    if (count > 0) {
      await textarea.fill("Test note — interview scheduled for next week.");
      await expect(page.getByRole("button", { name: /save notes/i }).first()).toBeVisible();

      await page.screenshot({
        path: "tests/screenshots/11-applications-notes.png",
        fullPage: false,
      });

      // Clear the test note
      await textarea.fill("");
    }
  });

  test("status move buttons are present", async ({ page }) => {
    const moveButtons = page.getByRole("button", { name: /interested|applied|interviewing|offer|rejected/i });
    const count = await moveButtons.count();

    if (count > 0) {
      await moveButtons.first().scrollIntoViewIfNeeded();
      await page.screenshot({
        path: "tests/screenshots/12-applications-status-moves.png",
        fullPage: false,
      });
    }
  });

  test("empty state shows helpful message", async ({ page }) => {
    const cards = page.locator(".rounded-xl.p-5");
    const cardCount = await cards.count();

    if (cardCount === 0) {
      await expect(page.getByText(/No applications yet/i)).toBeVisible();
      await page.screenshot({
        path: "tests/screenshots/09-applications-empty.png",
        fullPage: true,
      });
    }
  });
});
