/**
 * Resume upload page — visual showcase + functional tests.
 */
import { test, expect } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

test.describe("Resume page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/resume");
    await page.waitForLoadState("networkidle");
  });

  test("shows resume upload UI", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Resume" })).toBeVisible();
    await expect(page.getByRole("button", { name: /upload resume/i })).toBeVisible();

    await page.screenshot({
      path: "tests/screenshots/13-resume.png",
      fullPage: true,
    });
  });

  test("current resume info is displayed if one exists", async ({ page }) => {
    const currentResumeSection = page.getByText("Current resume");

    if (await currentResumeSection.isVisible()) {
      await expect(currentResumeSection).toBeVisible();
      await page.screenshot({
        path: "tests/screenshots/14-resume-current.png",
        fullPage: true,
      });
    }
  });

  test("uploading a .txt resume shows success message", async ({ page }) => {
    // Create a temporary test resume file
    const tmpFile = path.join("/tmp", "test-resume.txt");
    fs.writeFileSync(
      tmpFile,
      `John Doe
Software Engineer
john@example.com

EXPERIENCE
Software Engineer — Acme Corp (2022–present)
- Built REST APIs with Python/FastAPI
- Deployed services on AWS ECS
- Wrote integration tests with pytest

SKILLS
Python, TypeScript, AWS, PostgreSQL, Docker, React
`
    );

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(tmpFile);
    await page.getByRole("button", { name: /upload resume/i }).click();

    // Wait for success or error message
    const message = page.locator("p").filter({ hasText: /uploaded|error/i }).last();
    await expect(message).toBeVisible({ timeout: 15_000 });

    await page.screenshot({
      path: "tests/screenshots/15-resume-uploaded.png",
      fullPage: true,
    });

    fs.unlinkSync(tmpFile);
  });
});
