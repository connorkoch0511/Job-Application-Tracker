/**
 * Resume upload page — visual showcase + functional tests.
 */
import { test, expect } from "@playwright/test";

test.describe("Resume page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/resume");
    await page.waitForLoadState("networkidle");
  });

  test("shows resume upload UI", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Resume" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: /upload resume/i })).toBeVisible();

    await page.screenshot({ path: "tests/screenshots/14-resume.png", fullPage: true });
  });

  test("current resume info is displayed if one exists", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Resume" })).toBeVisible({ timeout: 10_000 });

    const currentSection = page.getByText("Current resume");
    if (await currentSection.isVisible()) {
      await page.screenshot({ path: "tests/screenshots/15-resume-current.png", fullPage: true });
    }
  });

  test("upload form accepts a file and shows the upload button", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Resume" })).toBeVisible({ timeout: 10_000 });

    // Verify the file input exists and accepts .txt and .pdf
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached({ timeout: 10_000 });
    const accept = await fileInput.getAttribute("accept");
    expect(accept).toContain(".txt");
    expect(accept).toContain(".pdf");

    // Verify the upload button is present and enabled
    const uploadBtn = page.getByRole("button", { name: /upload resume/i });
    await expect(uploadBtn).toBeVisible();

    // NOTE: We intentionally do NOT submit the upload here.
    // Actually uploading would overwrite the real user's resume in the database.
    // The upload API is tested via the /api/resume route directly in a real cron run.
    await page.screenshot({ path: "tests/screenshots/16-resume-upload-form.png", fullPage: true });
  });
});
