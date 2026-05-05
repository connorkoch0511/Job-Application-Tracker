/**
 * Auth flow tests — uses the stored session from auth.setup.ts.
 * Login/signup screenshots are taken in auth.setup.ts before logging in.
 */
import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("authenticated user lands on jobs page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Job Listings" })).toBeVisible();
    await page.screenshot({ path: "tests/screenshots/03-jobs-authenticated.png", fullPage: false });
  });

  test("unauthenticated visit to protected route redirects to login", async ({ browser }) => {
    // Open a fresh context with no stored session
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

    await page.goto(`${baseURL}/applications`);
    await expect(page.getByRole("heading", { name: /job tracker/i })).toBeVisible();
    await ctx.close();
  });
});
