import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT || 3099);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${PORT}`;
const IS_CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: IS_CI,
  retries: IS_CI ? 1 : 0,
  workers: IS_CI ? 2 : 4,
  timeout: 30_000,
  reporter: IS_CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(IS_CI ? {} : { channel: "chrome" }),
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: `npm run start -- -p ${PORT}`,
        url: `${BASE_URL}/api/health`,
        reuseExistingServer: !IS_CI,
        timeout: 60_000,
        ignoreHTTPSErrors: true,
      },
});
