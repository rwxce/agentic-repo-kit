# Design module

Opt-in. Propose it only when the repo has a user-facing UI that agents design for (pages, screens,
dialogs). A CLI, a library or an API gets none of this.

| File | Lands as | Signal | What it prevents |
|---|---|---|---|
| `PRODUCT.md` | `PRODUCT.md` (root) | any user-facing UI | each task re-guessing who the product is for and how it should feel |
| `DESIGN.md` | `DESIGN.md` (root) | a theme or token file | visual rules living only in someone's head; values defined twice |
| `tokens.tokens.json` | `design/tokens.tokens.json` | a theme the team wants to drive from one place | colours and sizes drifting between design tool, CSS and native themes |
| `check-tokens.mjs` (+ test) | `scripts/check-tokens.mjs`, `check:tokens` in CI | a token file | invalid or unresolved tokens; a generated theme missing a token (`--css`) |
| `ui-surfaces.md` | `docs/ui-surfaces.md` | more than a handful of pages, or any floating surface | dialogs and pages nobody checks on a phone because nobody knows they exist |
| `check-ui-surfaces.mjs` (+ test) | `scripts/check-ui-surfaces.mjs`, `check:ui-surfaces` in CI | the inventory above | the inventory falling behind the code |
| `design-flow.md` | `docs/design-flow.md` | the team explores in a design tool first | pasting an artifact as code; an artifact silently overriding the system |
| `skill-overrides.md` | `docs/design-skill-overrides.md` | vendored design skills installed | generic skill defaults overriding the project's system; editing vendored files |
| `../../agents/ui-router.md` | `.rulesync/subagents/<name>.md` | UI with ≥5 own build rules **and** design skills | the UI agent copying skill content and going stale |

**Source of truth.** Tokens and components in code. `DESIGN.md` explains intent and names rules;
it cites token paths instead of repeating values. Design tools (Claude Design, Open Design, design
files) are for exploring.

**Tokens format.** DTCG, Design Tokens Format Module 2025.10
(<https://www.designtokens.org/tr/2025.10/format/>; colour values per the Color module,
<https://www.designtokens.org/tr/2025.10/color/>). Generating CSS, Tailwind, Android or iOS themes
from it is a translation tool's job (e.g. Style Dictionary); pick one with the docs-first and
exact-pin rules, and add the generated file to `check-tokens.mjs --css` for web.

**Related concept cards:** `layout-guard-and-ui-inventory`, `guard-tests`, `route-registry`.

**Example (reference project, not a default):** `PRODUCT.md` declared "clear, practical,
encouraging" and four anti-references; `DESIGN.md` named rules like "one accent colour per view";
a UI agent routed marketing pages and in-app screens to two different design skills; the surfaces
inventory guard failed CI when a new dialog was not listed.
