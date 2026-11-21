<!--
WHAT: UI surfaces inventory. Every page and every floating surface (dialog, sheet, drawer, popover,
  menu, banner) of the app, with how it behaves at each breakpoint and when it was last looked at in
  the running app. Responsive reviews, width sweeps and "which screens does this touch?" start here.
REPO SIGNAL: a web app with many pages and overlays; responsive bugs reported on sizes nobody checked.
FILL: the breakpoints line, one row per page and per surface (the guard lists what is missing on its
  first run), and the checklist. Kept in sync by `arch-tests/ui-surfaces-inventory.mjs`: a page or
  overlay missing here, or a cited path that no longer exists, fails CI. Cite file paths in full,
  inside backticks, so the guard can match them. Layout variants inside one page cannot be detected:
  the UI implementer notes them here in the same change. Strip this header.
-->
# UI surfaces inventory

Breakpoints: **phone** < <768>px · **tablet** <768>–<1023>px · **desktop** ≥ <1024>px. "Last
verified" is the last time the surface was looked at in the running app at <375/768/1440>, in every
theme and locale.

## 1. Pages and layouts

| Route | File | Phone / tablet / desktop | Agreed | Last verified |
|---|---|---|---|---|
| `<route>` | `<path/to/page-file>` | <how it lays out at each size> | <decisions taken with design> | <date or —> |

## 2. Shared shell

| Piece | File | Phone / tablet / desktop | Last verified |
|---|---|---|---|
| <navigation, header, tab bar> | `<path/to/shell-file>` | <behaviour per size> | <date or —> |

## 3. Floating surfaces

| Surface | File | Opens from | Phone / tablet / desktop | Last verified |
|---|---|---|---|---|
| <confirm delete> | `<path/to/component-file>` | <trigger> | <full-screen sheet on phone, centred dialog from tablet> | <date or —> |

## 4. Checklist for any new or changed surface

- Listed above in the same change, with its behaviour at each breakpoint.
- Checked at the three widths plus a slow width sweep, in every theme and locale.
- Scrolls inside itself when taller than the viewport; nothing overflows the page horizontally.
- Keyboard: focus moves in on open and back to the trigger on close; Escape closes.
