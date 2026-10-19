import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  testMatch: ["checkout.spec.ts", "viewer.spec.ts", "customization.spec.ts"],
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:8083",
    headless: true,
    screenshot: "only-on-failure",
  },
  webServer: {
    command:
      "VITE_CHECKOUT_MODE=emulator npm run dev -- --host 127.0.0.1 --port 8083 --strictPort",
    url: "http://127.0.0.1:8083",
    reuseExistingServer: false,
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "narrow", use: { viewport: { width: 520, height: 900 } } },
  ],
});
