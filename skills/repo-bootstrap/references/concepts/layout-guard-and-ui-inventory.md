# Layout guard and UI inventory

**Origin: proven.** Enforced in the production project this kit was distilled from (generalized, project names removed).

## Problem

Responsive bugs (text overflowing, clipped, overlapping a sticky bar) appear at widths and in locales nobody looked at. New dialogs ship without anyone checking them on a phone, because nobody knows they exist.

## Principle

Keep an inventory of every page and floating surface, guarded by a test so it cannot fall behind. Measure layout in a real browser across locales and a slow width sweep, by DOM geometry rather than pixel diffs.

## When it applies

- Web apps with responsive layouts, several locales or many dialogs and sheets.

## When it doesn't

- Internal tools used on one screen size.

## Typical mistakes

- Checking only fixed breakpoints, missing the widths in between.
- Pixel-diff snapshots that fail on every font update and get ignored.
- Assuming Chromium reproduces Safari-only rendering bugs.

## The check that verifies it

An inventory guard test (every page and every file that renders a dialog/sheet/popover is listed); a browser test that sweeps 320 to 1440 px per locale and fails on overflow, clipping or overlap.

## Canonical source

- [W3C WCAG 2.2 Understanding SC 1.4.10 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)

## Variants per stack

- **Web:** Playwright measuring `scrollWidth` vs `clientWidth` and element overlap in guarded containers.
- **iOS:** snapshot tests across Dynamic Type sizes. **Android:** Compose previews and screenshot tests across font scales.

## Related

[guard-tests](guard-tests.md) · [route-registry](route-registry.md)
