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
  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Wait for redirect to home page after successful login
  await page.waitForURL("/", { timeout: 15_000 });

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
