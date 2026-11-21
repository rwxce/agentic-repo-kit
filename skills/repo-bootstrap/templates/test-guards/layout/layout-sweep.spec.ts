/**
 * WHAT: Layout guard, width sweep. Each page x locale is loaded ONCE at MIN width, then the window
 *   is resized MIN -> MAX in STEP px and back down, at the top and scrolled. That is how layouts are
 *   really used (dragging a window, rotating a tablet), and it catches what a fresh load per width
 *   cannot: elements that flicker, appear out of order or leave a gap while the size changes, and
 *   state that drifts after many resizes. Each step runs the overflow scan plus, when COLLAPSIBLE is
 *   set, a monotonic check: widening never hides a collapsible item, narrowing never reveals one,
 *   and at MAX every one is visible.
 * REPO SIGNAL: a nav or toolbar that hides items as the window narrows; bugs that only appear while
 *   resizing; a rule that UI QA includes a slow width sweep.
 * CONFIGURE: PAGES, LOCALES, READY as in layout-overflow.spec.ts; MIN/MAX/STEP; COLLAPSIBLE (the
 *   selector of items that collapse with width, e.g. "[data-collapsible]", or null), its expected
 *   DOM count (so a new item added without updating the test fails), and SETTLE_SELECTOR (what must
 *   stop moving before a step is judged).
 */
import { expect, test, type Page } from "@playwright/test"
import { findOverflow, formatIssues, monotonicViolation, settleLayout, sweepSteps } from "./overflow.mjs"

// ---------------------------------------------------------------- CONFIG (examples)
const LOCALES: string[] = ["<locale>"]
const PAGES: { name: string; path: string }[] = [{ name: "home", path: "" }]
const READY = "body"
const MIN = 320
const MAX = 1440
const STEP = 20
const COLLAPSIBLE: { selector: string; count: number } | null = null // e.g. { selector: "header [data-collapsible]", count: 5 }
const SETTLE_SELECTOR = "header, header a, header button"
const urlFor = (locale: string, path: string) => `/${locale}${path}`

async function visibleCount(page: Page, selector: string) {
  return page.evaluate((sel) => {
    const shown = (el: Element) => {
      const r = el.getBoundingClientRect()
      return r.width > 1 && r.height > 1 && el.checkVisibility({ opacityProperty: true, visibilityProperty: true })
    }
    const all = [...document.querySelectorAll(sel)]
    return { visible: all.filter(shown).length, inDom: all.length }
  }, selector)
}

async function scrollDown(page: Page) {
  await page.mouse.move(10, 300)
  await page.mouse.wheel(0, 1400)
  await page.waitForTimeout(300)
}

for (const { name, path } of PAGES) {
  for (const locale of LOCALES) {
    test(`sweep ${name} · ${locale}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: MIN, height: 900 })
      await page.goto(urlFor(locale, path))
      await page.locator(READY).first().waitFor()
      await page.evaluate(() => document.fonts.ready)

      for (const state of ["top", "scrolled"] as const) {
        if (state === "scrolled") await scrollDown(page)
        let prev: number | null = null
        let prevDir: "up" | "down" = "up"
        for (const { width, dir } of sweepSteps(MIN, MAX, STEP)) {
          await page.setViewportSize({ width, height: 900 })
          const settled = await page.evaluate(settleLayout, { selector: SETTLE_SELECTOR, timeoutMs: 1000 })
          const where = `${name} ${locale} @ ${width}px ${dir} (${state})`
          expect.soft(settled, `${where}: the layout never stopped moving within 1s`).toBe(true)

          if (COLLAPSIBLE) {
            const { visible, inDom } = await visibleCount(page, COLLAPSIBLE.selector)
            const violation = monotonicViolation(prev, visible, dir, prevDir)
            expect.soft(violation, `${where}: ${violation}`).toBeNull()
            expect.soft(inDom, `${where}: collapsible count differs from CONFIG`).toBe(COLLAPSIBLE.count)
            if (width === MAX && state === "top") expect.soft(visible, `${where}: not every collapsible item shows at full width`).toBe(COLLAPSIBLE.count)
            prev = visible
            prevDir = dir
          }

          const issues = await findOverflow(page)
          if (issues.length > 0) await testInfo.attach(`${state}-${dir}-${width}.png`, { body: await page.screenshot(), contentType: "image/png" })
          expect.soft(formatIssues(issues), where).toEqual([])
        }
      }
    })
  }
}
