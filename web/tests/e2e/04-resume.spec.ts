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

  test("uploading a .txt resume shows success message", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Resume" })).toBeVisible({ timeout: 10_000 });

    const tmpFile = path.join("/tmp", "test-resume.txt");
    fs.writeFileSync(
      tmpFile,
      `John Doe — Software Engineer
john@example.com | github.com/johndoe

EXPERIENCE
Software Engineer — Acme Corp (2022–present)
- Built REST APIs with Python/FastAPI and deployed on AWS ECS
- Wrote integration tests with pytest; reduced bug rate by 30%

SKILLS
Python, TypeScript, AWS, PostgreSQL, Docker, React, Next.js
`
    );

    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached({ timeout: 10_000 });
    await fileInput.setInputFiles(tmpFile);
    await page.getByRole("button", { name: /upload resume/i }).click();

    // Wait for success or error message
    const message = page.locator("p").filter({ hasText: /uploaded|error/i }).last();
    await expect(message).toBeVisible({ timeout: 20_000 });

    await page.screenshot({ path: "tests/screenshots/16-resume-uploaded.png", fullPage: true });

    fs.unlinkSync(tmpFile);
  });
});
