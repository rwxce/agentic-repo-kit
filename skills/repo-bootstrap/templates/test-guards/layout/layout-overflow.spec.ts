/**
 * WHAT: Layout guard, fixed widths. Every page in PAGES x every locale x every width in WIDTHS, at
 *   the top and scrolled (sticky headers often change shape on scroll), must have no horizontal
 *   scroll, no text off screen or cut by its box, and no colliding controls inside guarded
 *   containers (see overflow.mjs). Failing states attach a screenshot.
 * REPO SIGNAL: a responsive web UI with translated strings; layout bugs found by users at a width
 *   nobody opened.
 * CONFIGURE: PAGES (take paths from the routes registry, never hard-code them), LOCALES (from the
 *   i18n config), WIDTHS, READY (a selector present once the page rendered), scrollDown (a wheel
 *   event works with smooth-scroll libraries that own the scroll position; scrollTo does not).
 *   Run against a server you start yourself (see playwright.config.snippet.ts). Add a signed-in
 *   project to check the authenticated variant of the same pages.
 */
import { expect, test, type Page } from "@playwright/test"
import { findOverflow, formatIssues } from "./overflow.mjs"

// ---------------------------------------------------------------- CONFIG (examples)
// import { routes } from "<path/to/routes-registry>"
// import { locales } from "<path/to/i18n-config>"
const LOCALES: string[] = ["<locale>"]
const PAGES: { name: string; path: string }[] = [
  { name: "home", path: "" },
  // { name: "pricing", path: routes.pricing.path },
]
const WIDTHS = [320, 375, 430, 600, 768, 900, 1024, 1440]
const READY = "body" // e.g. "header nav" once the shell is in the DOM
const urlFor = (locale: string, path: string) => `/${locale}${path}`

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300) // let width-dependent measurements land
}

async function scrollDown(page: Page) {
  await page.mouse.move(10, 300)
  await page.mouse.wheel(0, 1400)
  await page.waitForTimeout(300)
}

for (const { name, path } of PAGES) {
  for (const locale of LOCALES) {
    test.describe(`${name} · ${locale}`, () => {
      for (const width of WIDTHS) {
        test(`${width}px`, async ({ page }, testInfo) => {
          await page.setViewportSize({ width, height: 900 })
          await page.goto(urlFor(locale, path))
          await page.locator(READY).first().waitFor()
          for (const state of ["top", "scrolled"] as const) {
            if (state === "scrolled") await scrollDown(page)
            await settle(page)
            const issues = await findOverflow(page)
            if (issues.length > 0) await testInfo.attach(`${state}.png`, { body: await page.screenshot(), contentType: "image/png" })
            expect.soft(formatIssues(issues), `${name} ${locale} @ ${width}px (${state})`).toEqual([])
          }
        })
      }
    })
  }
}
