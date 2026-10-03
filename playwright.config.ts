import fs from "node:fs";
import { defineConfig, devices } from "@playwright/test";
process.env.TZ = "Africa/Algiers";
const portable = process.env.PW_BROWSER_CONFIG ? JSON.parse(fs.readFileSync(process.env.PW_BROWSER_CONFIG, "utf8")) as { executablePath: string; args: string[]; ldLibraryPath?: string } : null;
export default defineConfig({
  testDir: "./tests/e2e", fullyParallel: false, workers: process.env.CI ? 2 : 1,
  timeout: 45000, expect: { timeout: 10000 }, retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.PW_BASE_URL ?? "http://127.0.0.1:3000", timezoneId: "Africa/Algiers",
    ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 },
    serviceWorkers: "block", contextOptions: { reducedMotion: "reduce" }, trace: "retain-on-failure", screenshot: "only-on-failure",
    ...(portable ? { launchOptions: { executablePath: portable.executablePath, args: portable.args, env: { ...process.env, LD_LIBRARY_PATH: portable.ldLibraryPath ?? "" } } } : {}),
  },
  webServer: process.env.PW_REUSE_SERVER === "1" ? undefined : {
    command: "npm run build && npm run start -- --hostname 0.0.0.0 --port 3000", url: "http://127.0.0.1:3000", timeout: 180000, reuseExistingServer: false,
    env: { NEXT_TELEMETRY_DISABLED: "1", NEXT_PUBLIC_SUPABASE_URL: "https://mock.supabase.invalid", NEXT_PUBLIC_SUPABASE_ANON_KEY: "e2e-public-anon-key", APP_RELEASE_VERSION: "e2e-v4" },
  },
});
