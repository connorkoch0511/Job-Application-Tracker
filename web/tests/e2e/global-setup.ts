import { clerkSetup } from "@clerk/testing/playwright";

// Credentials of a real Clerk test user (create one in the Clerk dashboard or
// via the Backend API) set in web/.env.local:
//   E2E_CLERK_USER_IDENTIFIER=...
//   E2E_CLERK_USER_PASSWORD=...
export const TEST_IDENTIFIER = process.env.E2E_CLERK_USER_IDENTIFIER ?? "";
export const TEST_PASSWORD = process.env.E2E_CLERK_USER_PASSWORD ?? "";

export default async function globalSetup() {
  if (!process.env.CLERK_SECRET_KEY || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    throw new Error("Missing CLERK_SECRET_KEY / NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in web/.env.local");
  }
  if (!TEST_IDENTIFIER || !TEST_PASSWORD) {
    throw new Error(
      "Missing E2E_CLERK_USER_IDENTIFIER / E2E_CLERK_USER_PASSWORD in web/.env.local — " +
        "create a Clerk test user and set these to its credentials."
    );
  }

  // Fetches a Testing Token so Clerk bypasses bot detection during tests.
  await clerkSetup();
}
