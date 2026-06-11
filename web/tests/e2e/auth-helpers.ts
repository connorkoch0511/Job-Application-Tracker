import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { type Page } from "@playwright/test";
import { TEST_IDENTIFIER, TEST_PASSWORD } from "./global-setup";

// Establishes a Clerk session on the given page via the testing helper (no
// brittle UI scripting). The Testing Token is short-lived and must be applied
// per page context, which is why this runs in each spec's beforeEach rather
// than once via storageState.
export async function signIn(page: Page) {
  await setupClerkTestingToken({ page });
  await page.goto("/sign-in");
  await clerk.signIn({
    page,
    signInParams: { strategy: "password", identifier: TEST_IDENTIFIER, password: TEST_PASSWORD },
  });
}
