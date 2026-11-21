<!--
TEMPLATE: UI surfaces inventory (registry). Design module. Lands as `docs/ui-surfaces.md`.
REPO SIGNAL: a UI with more than a handful of pages, or any dialogs/sheets/popovers. Responsive bugs
ship on surfaces nobody remembers exist; this list is what a reviewer walks. Guarded by
`check-ui-surfaces.mjs`: a page or a file that renders a floating surface missing from this file
fails, and so does a path cited here that no longer exists. Paths must be written out in full in
backticks so the guard can match them. Fill the breakpoints from DESIGN.md. Strip this comment.
-->
# UI surfaces inventory

Every page and every floating surface (dialog, sheet, drawer, popover, menu, banner, toast) of the
<web | mobile> app, with how it behaves at each size. Kept in sync by `<scripts/check-ui-surfaces.mjs>`.
Layout variants inside a page (columns that fold, sections that move) cannot be detected
mechanically: the UI agent's Build rules require noting them here in the same change.

Breakpoints: **phone** < <600|768>px · **tablet** <…>–<…>px · **desktop** ≥ <…>px.
"Last verified" is the last time the surface was looked at in the running app at the three sizes,
in every theme, with the date and what changed.

## 1. Pages

| Route | File | Phone / tablet / desktop | Agreed with design | Last verified |
|---|---|---|---|---|
| `<route>` | `<path/to/page file>` | <one line per size, or "same layout, one column on phone"> | <yes · artifact link · no> | <YYYY-MM-DD (what)> |

## 2. Floating surfaces

| Surface | File | Opens from | Phone behaviour | Last verified |
|---|---|---|---|---|
| <Confirm delete> | `<path/to/component>` | <button on page X> | <bottom sheet · full screen · centred> | <YYYY-MM-DD> |

## 3. Checklist for a new or changed surface

1. Listed here in the same change (the guard catches pages and surfaces, not variants).
2. Seen at phone, tablet and desktop, in every theme and in the longest locale.
3. Width sweep for layout changes: resize slowly from the smallest to the largest width and back.
4. Touch targets and inputs meet DESIGN.md's sizes; safe areas respected on phone chrome.
5. Focus is trapped in modal surfaces and returns to the trigger on close.
