/**
 * Auth flow — Clerk sign-in/sign-up rendering, protected-route redirect,
 * and authenticated landing. Also captures the unauthenticated showcase shots.
 */
import { test, expect } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { signIn } from "./auth-helpers";

test.describe("Authentication", () => {
  test("sign-in and sign-up pages render", async ({ page }) => {
    await setupClerkTestingToken({ page });

    await page.goto("/sign-in");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "tests/screenshots/01-login.png", fullPage: true });

    await page.goto("/sign-up");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "tests/screenshots/02-signup.png", fullPage: true });
  });

  test("unauthenticated visit to a protected route redirects to sign-in", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await setupClerkTestingToken({ page });

    await page.goto("/applications");
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 15_000 });
    await ctx.close();
  });

  test("authenticated user lands on the jobs page", async ({ page }) => {
    await signIn(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Job Listings" })).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: "tests/screenshots/03-jobs-authenticated.png", fullPage: false });
  });
});
