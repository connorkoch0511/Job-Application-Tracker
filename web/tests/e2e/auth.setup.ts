import { test as setup, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const authFile = "tests/.auth/user.json";

setup("authenticate", async ({ page }) => {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "TEST_EMAIL and TEST_PASSWORD must be set in web/.env.test to run tests.\n" +
      "See web/.env.test.example for details."
    );
  }

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /job tracker/i })).toBeVisible();

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.getByRole("button", { name: /^sign in$/i }).click();

  // Detect auth errors early with a helpful message
  const errorMsg = page.locator("p.text-red-400");
  const redirected = page.waitForURL("/", { timeout: 15_000 });
  const errorAppeared = errorMsg.waitFor({ state: "visible", timeout: 5_000 }).then(async () => {
    const text = await errorMsg.textContent();
    throw new Error(
      `Login failed: "${text}"\n\nCheck that TEST_EMAIL and TEST_PASSWORD in web/.env.test match a real Supabase account.`
    );
  });

  await Promise.race([redirected, errorAppeared]);

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
