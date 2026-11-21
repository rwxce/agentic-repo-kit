<!--
TEMPLATE: per-skill overrides for third-party design skills. Design module. Lands as
`docs/design-skill-overrides.md`, or as a section of the UI agent's Build rules.
REPO SIGNAL: one or more vendored design skills (installed through quarantine and pinned) whose
generic defaults conflict with this project's system. Vendored skill files are never edited (the
vendored-skill check would flag it and the next update would erase it); the project writes what
overrides them here, and the UI agent reads this file before invoking a skill. Fill one block per
installed skill. Strip this comment.
-->
# Design skill overrides

Third-party design skills bring good general judgement and generic defaults. This file says, per
skill, **which surfaces it owns here** and **what in this repo overrides its defaults**. When a
skill's advice and this file disagree, this file wins; when this file and `DESIGN.md` disagree,
`DESIGN.md` wins and this file is fixed.

## Routing

| Surface | Skill | Why |
|---|---|---|
| <Marketing pages, full redesigns> | `<marketing design skill>` | <it infers a brief and drives layout/motion for landing pages> |
| <In-app product UI, onboarding, empty states> | `<product UI skill>` | <it reads PRODUCT.md/DESIGN.md and audits anti-patterns> |
| <Rendered video, motion graphics> | `<motion agent or skill>` | <…> |

When in doubt between two skills, the question that decides is: <e.g. "is this a marketing page or
a redesign, or is it in-app product UI?">.

## Per skill

### `<skill name>` (pinned `<version>`, origin `<repo URL>`)

- **Owns:** <surfaces>.
- **Reads first:** `PRODUCT.md`, `DESIGN.md`, `<token file>`, `<UI notes with known browser traps>`.
- **Overridden defaults:** <e.g. "its generic brief inference is replaced by PRODUCT.md"; "its
  default palette advice does not apply: colours come from tokens only">.
- **Never applies here:** <e.g. glassmorphism, gradient text, urgency badges — cite DESIGN.md's
  rule names>.
- **Output must still pass:** token check, UI surfaces guard, layout guard, i18n parity.

<Example, clearly from the reference project and not a default: a marketing skill owned landing
pages and redesigns, a product-UI skill owned in-app screens and read PRODUCT.md/DESIGN.md first,
and both were forbidden from large blurred shadows plus transforms because of a Safari repaint
bug recorded in the UI notes.>
