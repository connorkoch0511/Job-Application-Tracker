/**
 * Auth page screenshots — captured without a logged-in session so the
 * full login/signup UI is visible.
 */
import { test, expect, Browser, chromium } from "@playwright/test";

// These tests open a fresh browser context (no stored auth) so we can
// screenshot the login and signup pages before the redirect kicks in.
test.describe("Authentication pages", () => {
  let browser: Browser;

  test.beforeAll(async () => {
    browser = await chromium.launch();
  });

  test.afterAll(async () => {
    await browser.close();
  });

  test("login page", async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

    await page.goto(`${baseURL}/login`);
    await expect(page.getByRole("heading", { name: /job tracker/i })).toBeVisible();
    await page.screenshot({
      path: "tests/screenshots/01-login.png",
      fullPage: true,
    });
    await context.close();
  });

  test("signup page", async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

    await page.goto(`${baseURL}/signup`);
    await page.screenshot({
      path: "tests/screenshots/02-signup.png",
      fullPage: true,
    });
    await context.close();
  });
});
