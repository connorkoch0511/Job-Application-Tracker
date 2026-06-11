import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";

// Tests authenticate through Clerk, so they reuse the app's real keys from
// .env.local (plus E2E_CLERK_USER_* for the test user's credentials).
dotenv.config({ path: ".env.local" });

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 1,
  // Each test signs in through Clerk (beforeEach), so allow headroom over the
  // 30s default once the external auth handshake is added in.
  timeout: 90_000,
  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["list"],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    screenshot: "on",
    trace: "retain-on-failure",
    viewport: { width: 1280, height: 900 },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    // Probe a public route — every protected route 307-redirects into Clerk's
    // external handshake, which the readiness check can't resolve.
    url: "http://localhost:3000/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
