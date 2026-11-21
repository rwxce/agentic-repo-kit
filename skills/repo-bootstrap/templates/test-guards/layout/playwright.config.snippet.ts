/**
 * WHAT: Playwright config for the layout guard (`test:layout`). Real-browser checks that jsdom
 *   cannot do (it has no layout).
 * CONFIGURE: testDir (where the specs and overflow.mjs live, e.g. "e2e"), the port, and whether a
 *   server is started for you. The default never starts one: start the dev server yourself (a dev
 *   server that loads secrets should not be launched by a test runner) and point LAYOUT_PORT at it.
 *   Uncomment `webServer` when the app builds and serves without secrets. Run before a UI PR (the
 *   PR command can require it) and, if CI can serve the app, on PRs that touch UI.
 */
import { defineConfig, devices } from "@playwright/test"

const port = Number(process.env.LAYOUT_PORT ?? 3000)

export default defineConfig({
  testDir: "<e2e>",
  fullyParallel: true,
  // A cold dev server compiles each route on first hit.
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  outputDir: "test-results",
  use: {
    baseURL: `http://localhost:${port}`,
    screenshot: "only-on-failure",
    // Transitions land instantly, so a measurement never catches the layout mid-animation.
    reducedMotion: "reduce",
  },
  // webServer: { command: "<start command>", port, reuseExistingServer: true },
  projects: [
    { name: "signed-out", testMatch: "**/layout-*.spec.ts", use: { ...devices["Desktop Chrome"] } },
    // Signed-in variant: a setup project saves a session to storageState, then
    // { name: "signed-in", testMatch: "**/layout-*.spec.ts", dependencies: ["setup"], use: { ...devices["Desktop Chrome"], storageState: "<e2e>/.auth/user.json" } },
  ],
})
