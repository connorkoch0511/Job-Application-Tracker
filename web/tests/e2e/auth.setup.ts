import { test as setup, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const authFile = "tests/.auth/user.json";

setup("authenticate", async ({ page }) => {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "TEST_EMAIL and TEST_PASSWORD must be set in web/.env.test\n" +
      "See web/.env.test.example for details."
    );
  }

  // Screenshot the login page while unauthenticated
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /job tracker/i })).toBeVisible();
  await page.screenshot({ path: "tests/screenshots/01-login.png", fullPage: true });

  // Screenshot the signup page while unauthenticated
  await page.goto("/signup");
  await page.screenshot({ path: "tests/screenshots/02-signup.png", fullPage: true });

  // Log in
  await page.goto("/login");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.getByRole("button", { name: /^sign in$/i }).click();

  // Detect auth errors early with a helpful message
  const errorMsg = page.locator("p.text-red-400");
  const redirected = page.waitForURL("/", { timeout: 15_000 });
  const errorAppeared = errorMsg.waitFor({ state: "visible", timeout: 5_000 }).then(async () => {
    const text = await errorMsg.textContent();
    throw new Error(
      `Login failed: "${text}"\n\nCheck TEST_EMAIL / TEST_PASSWORD in web/.env.test.`
    );
  });

  await Promise.race([redirected, errorAppeared]);

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
