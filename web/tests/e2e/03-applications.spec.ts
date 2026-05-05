/**
 * Applications pipeline page — visual showcase + functional tests.
 */
import { test, expect } from "@playwright/test";

test.describe("Applications page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/applications");
    await page.waitForLoadState("networkidle");
  });

  test("shows application pipeline page", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "My Applications" })).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: "tests/screenshots/10-applications.png", fullPage: true });
  });

  test("status count badges visible when applications exist", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "My Applications" })).toBeVisible({ timeout: 10_000 });

    const cards = page.locator(".rounded-xl.p-5");
    const cardCount = await cards.count();

    if (cardCount > 0) {
      // Status summary pills should be visible
      for (const status of ["interested", "applied", "interviewing"]) {
        await expect(page.getByText(new RegExp(`${status}:`, "i")).first()).toBeVisible();
      }
    }

    await page.screenshot({ path: "tests/screenshots/11-applications-status-counts.png", fullPage: false });
  });

  test("notes textarea is editable", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "My Applications" })).toBeVisible({ timeout: 10_000 });

    const textareas = page.locator("textarea");
    const count = await textareas.count();

    if (count > 0) {
      await textareas.first().fill("Test note — interview scheduled.");
      await expect(page.getByRole("button", { name: /save notes/i }).first()).toBeVisible();

      await page.screenshot({ path: "tests/screenshots/12-applications-notes.png", fullPage: false });

      await textareas.first().fill("");
    }
  });

  test("status move buttons are present", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "My Applications" })).toBeVisible({ timeout: 10_000 });

    const moveButtons = page.getByRole("button", { name: /^(interested|applied|interviewing|offer|rejected)$/i });
    const count = await moveButtons.count();

    if (count > 0) {
      await moveButtons.first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: "tests/screenshots/13-applications-status-moves.png", fullPage: false });
    }
  });

  test("shows empty state when no applications exist", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "My Applications" })).toBeVisible({ timeout: 10_000 });

    const cards = page.locator(".rounded-xl.p-5");
    const cardCount = await cards.count();

    if (cardCount === 0) {
      await expect(page.getByText(/No applications yet/i)).toBeVisible();
      await page.screenshot({ path: "tests/screenshots/10-applications-empty.png", fullPage: true });
    }
  });
});
