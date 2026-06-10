import { test as setup } from "@playwright/test";
import { clerk, clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import * as fs from "fs";
import * as path from "path";

const authFile = "tests/.auth/user.json";

setup("authenticate", async ({ page }) => {
  const identifier = process.env.E2E_CLERK_USER_IDENTIFIER;
  const password = process.env.E2E_CLERK_USER_PASSWORD;

  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    throw new Error(
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY must be set in web/.env.local"
    );
  }
  if (!identifier || !password) {
    throw new Error(
      "E2E_CLERK_USER_IDENTIFIER and E2E_CLERK_USER_PASSWORD must be set in web/.env.local — " +
        "create a test user in the Clerk dashboard and set these to its credentials."
    );
  }

  // Fetch a Testing Token so Clerk bypasses bot detection during tests.
  await clerkSetup();
  await setupClerkTestingToken({ page });

  // Screenshot the sign-in / sign-up screens while unauthenticated (showcase).
  await page.goto("/sign-in");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: "tests/screenshots/01-login.png", fullPage: true });

  await page.goto("/sign-up");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: "tests/screenshots/02-signup.png", fullPage: true });

  // Sign in via Clerk's testing helper (no brittle UI scripting).
  await page.goto("/sign-in");
  await clerk.signIn({
    page,
    signInParams: { strategy: "password", identifier, password },
  });
  await page.goto("/");

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
