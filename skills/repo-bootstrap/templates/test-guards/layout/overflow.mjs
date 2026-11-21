/**
 * WHAT: Layout guard core, used by the Playwright specs next to it. `scanOverflow` runs IN THE
 *   BROWSER (passed to `page.evaluate`, so it must stay self-contained: no imports, no closures) and
 *   reports what a visitor would see as broken at the current width:
 *   - page-scroll: the page scrolls sideways;
 *   - past-viewport: visible text runs off screen (a root `overflow-x: clip` hides this from the
 *     page-scroll check, so it is checked per element);
 *   - clipped-text: text cut by its own box (overflow hidden/clip, ellipsis);
 *   - overlap / outside-container: inside a container marked with the guard attribute, visible links
 *     and buttons collide or stick out (the "last nav link hidden under an icon" bug).
 *   jsdom has no layout, so none of this is testable in unit tests; it needs a real browser.
 * REPO SIGNAL: a responsive web UI, translated strings of different lengths, a nav that collapses
 *   links as the window narrows, or layout bugs reported at widths nobody checked.
 * CONFIGURE: the attributes in DEFAULTS (or pass options). Opt-outs are explicit and greppable:
 *   `data-allow-overflow` on an element or ancestor skips it (carousels that bleed on purpose);
 *   `data-overflow-guard` on a container turns on the collision checks for its controls. Add
 *   selectors of measuring probes (hidden copies used to compute widths) to `ignoreSelector`.
 */

export const DEFAULTS = {
  tolerance: 1,
  /** Elements (or descendants of) never checked. */
  ignoreSelector: "[data-allow-overflow], [aria-hidden='true']",
  /** Containers whose visible links/buttons must not overlap or stick out. */
  guardSelector: "[data-overflow-guard]",
  /** Controls checked inside a guarded container. */
  controlSelector: "a, button",
}

/** Browser-side scan. Self-contained on purpose: Playwright serialises it into the page. */
export function scanOverflow(options) {
  const { tolerance: TOL, ignoreSelector, guardSelector, controlSelector } = options
  const issues = []
  const vw = document.documentElement.clientWidth

  const describe = (el) => {
    const id = el.id ? `#${el.id}` : ""
    const cls = [...el.classList].slice(0, 2).map((c) => `.${c}`).join("")
    const parent = el.parentElement
    const parentCls = parent ? [...parent.classList].slice(0, 1).map((c) => `.${c}`).join("") : ""
    return `${parentCls ? `${parentCls} > ` : ""}${el.tagName.toLowerCase()}${id}${cls}`
  }
  const textOf = (el) => (el.textContent ?? el.getAttribute("aria-label") ?? "").trim().replace(/\s+/g, " ").slice(0, 60)
  const ownsText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? "").trim() !== "")

  // Hidden, collapsed, or clipped away by an ancestor (e.g. a grid track animated to 0fr).
  const isShown = (el) => {
    if (el.closest(ignoreSelector)) return false
    const rect = el.getBoundingClientRect()
    // <= 1px: visually-hidden labels (the sr-only pattern) are clipped on purpose.
    if (rect.width <= 1 || rect.height <= 1) return false
    if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      if (getComputedStyle(a).overflowX === "visible") continue
      const box = a.getBoundingClientRect()
      if (box.width < 1 || rect.left >= box.right - TOL || rect.right <= box.left + TOL) return false
    }
    return true
  }
  // Inside something meant to scroll sideways (a carousel, a code block).
  const inScroller = (el) => {
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const x = getComputedStyle(a).overflowX
      if (x === "auto" || x === "scroll") return true
    }
    return false
  }

  const pageExtra = document.documentElement.scrollWidth - vw
  if (pageExtra > TOL) issues.push({ kind: "page-scroll", selector: "html", text: "", px: pageExtra })

  for (const el of document.body.querySelectorAll("*")) {
    if (!ownsText(el) || !isShown(el)) continue
    const rect = el.getBoundingClientRect()
    if (!inScroller(el)) {
      const px = Math.max(rect.right - vw, -rect.left)
      if (px > TOL) issues.push({ kind: "past-viewport", selector: describe(el), text: textOf(el), px: Math.round(px) })
    }
    const style = getComputedStyle(el)
    const clips = style.overflowX === "hidden" || style.overflowX === "clip" || style.textOverflow === "ellipsis"
    const cut = el.scrollWidth - el.clientWidth
    if (clips && cut > TOL) issues.push({ kind: "clipped-text", selector: describe(el), text: textOf(el), px: cut })
  }

  for (const container of document.querySelectorAll(guardSelector)) {
    if (container.closest(ignoreSelector)) continue
    const box = container.getBoundingClientRect()
    const items = [...container.querySelectorAll(controlSelector)].filter(isShown)
    const rects = items.map((el) => el.getBoundingClientRect())
    items.forEach((el, i) => {
      const r = rects[i]
      const out = Math.max(box.left - r.left, r.right - box.right)
      if (out > TOL) issues.push({ kind: "outside-container", selector: describe(el), text: textOf(el), px: Math.round(out) })
      for (let j = i + 1; j < items.length; j++) {
        // Nested controls (a button inside a link) are one control, not a collision.
        if (el.contains(items[j]) || items[j].contains(el)) continue
        const o = rects[j]
        const dx = Math.min(r.right, o.right) - Math.max(r.left, o.left)
        const dy = Math.min(r.bottom, o.bottom) - Math.max(r.top, o.top)
        if (dx > TOL && dy > TOL) {
          issues.push({ kind: "overlap", selector: `${describe(el)} x ${describe(items[j])}`, text: `${textOf(el)} x ${textOf(items[j])}`, px: Math.round(dx) })
        }
      }
    })
  }
  return issues
}

/** Playwright helper: the issues at the page's current size. */
export function findOverflow(page, options = {}) {
  return page.evaluate(scanOverflow, { ...DEFAULTS, ...options })
}

/** One line per issue for a soft assertion's diff. */
export function formatIssues(issues) {
  return issues.map((i) => `${i.kind} +${i.px}px  ${i.selector}${i.text ? `  "${i.text}"` : ""}`)
}

/** The widths of a sweep: min -> max in `step`, then back down without repeating max. */
export function sweepSteps(min = 320, max = 1440, step = 20) {
  if (step <= 0 || max < min) throw new RangeError("sweepSteps needs min <= max and a positive step")
  const up = []
  for (let w = min; w <= max; w += step) up.push(w)
  if (up.at(-1) !== max) up.push(max)
  return [...up.map((width) => ({ width, dir: "up" })), ...up.slice(0, -1).reverse().map((width) => ({ width, dir: "down" }))]
}

/**
 * Monotonic check for collapsible elements while resizing: widening must never hide one, narrowing
 * must never reveal one. Returns a message, or null when fine. A direction change resets it.
 */
export function monotonicViolation(prev, now, dir, prevDir) {
  if (prev === null || prev === undefined || dir !== prevDir) return null
  if (dir === "up" && now < prev) return `visible items dropped from ${prev} to ${now} while widening`
  if (dir === "down" && now > prev) return `visible items grew from ${prev} to ${now} while narrowing`
  return null
}

/**
 * Browser-side: waits two frames, then until the geometry of `selector` stops changing for three
 * frames (max `timeoutMs`). Returns whether it settled, so the caller can assert it instead of
 * judging a layout mid-animation.
 */
export function settleLayout({ selector, timeoutMs }) {
  return new Promise((done) => {
    const frame = () => new Promise((r) => requestAnimationFrame(() => r()))
    const sig = () =>
      [...document.querySelectorAll(selector)]
        .map((el) => {
          const r = el.getBoundingClientRect()
          return `${Math.round(r.left)},${Math.round(r.width)},${getComputedStyle(el).opacity}`
        })
        .join("|")
    ;(async () => {
      await frame()
      await frame()
      let last = sig()
      let stable = 0
      const start = performance.now()
      while (stable < 3 && performance.now() - start < timeoutMs) {
        await frame()
        const now = sig()
        stable = now === last ? stable + 1 : 0
        last = now
      }
      done(stable >= 3)
    })()
  })
}
