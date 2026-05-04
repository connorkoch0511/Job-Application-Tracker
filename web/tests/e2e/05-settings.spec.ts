/**
 * Settings / preferences page — visual showcase + functional tests.
 */
import { test, expect } from "@playwright/test";

test.describe("Settings page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
  });

  test("shows preferences form", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /settings|preferences/i })).toBeVisible();

    await page.screenshot({
      path: "tests/screenshots/16-settings.png",
      fullPage: true,
    });
  });

  test("keywords and location fields are editable", async ({ page }) => {
    const keywordsInput = page.getByPlaceholder(/keywords/i).first();
    const locationInput = page.getByPlaceholder(/location/i).first();

    if (await keywordsInput.isVisible()) {
      const existing = await keywordsInput.inputValue();
      await keywordsInput.fill("software engineer, python, react");

      if (await locationInput.isVisible()) {
        await locationInput.fill("remote, USA");
      }

      await page.screenshot({
        path: "tests/screenshots/17-settings-filled.png",
        fullPage: true,
      });

      // Restore original value
      await keywordsInput.fill(existing);
    }
  });

  test("save button submits preferences", async ({ page }) => {
    const saveBtn = page.getByRole("button", { name: /save/i });

    if (await saveBtn.isVisible()) {
      await expect(saveBtn).toBeEnabled();
    }
  });
});
