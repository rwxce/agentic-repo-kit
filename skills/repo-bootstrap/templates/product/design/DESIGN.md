<!--
TEMPLATE: DESIGN.md — the visual system explained: intent, named rules, components, do/don't.
REPO SIGNAL: a user-facing UI with a token file or a theme (CSS variables, Tailwind theme,
Compose/SwiftUI theme). Values are NOT defined here: the token file (`tokens.tokens.json`, DTCG
format) is the source of truth and this file names tokens by path. When a value changes, change
the token file; this file changes only when the intent or a rule changes. Fill every
<placeholder>, delete sections that do not apply. Strip this comment.
-->
# Design system: <product> (<surface: app | marketing | both>)

Tokens: `<path/to/tokens.tokens.json>` (source of truth) → generated into `<path/to/theme file>`
by `<command>`. UI surfaces inventory: `<docs/ui-surfaces.md>`. Product brief: `PRODUCT.md`.

## 1. Overview

**North star: "<two to four words>"**

<One paragraph: what the interface must make legible, and the overall feel (density, softness,
contrast). Name what the system rejects, pointing at `PRODUCT.md` → Anti-references.>

Key characteristics:
- <Ground and surfaces: e.g. `color.canvas` behind `color.surface` cards.>
- <The single accent and what it is allowed to mark.>
- <Shape language: radii tokens per component class.>
- <Elevation: borders or shadows, never both.>
- <Type: family, tracking on large sizes.>
- <Motion: duration tokens, what may animate.>

## 2. Colour

| Role | Token | Use |
|---|---|---|
| Primary action | `color.brand.primary` | <the one primary action per view, focus ring, links> |
| Text | `color.ink.default` / `color.ink.muted` | <body, supporting copy> |
| Ground | `color.canvas` | <page background> |
| Status | `color.status.<name>` | <always paired with a word, never colour alone> |

**Named rules.** Name each rule so reviews can cite it ("breaks the One Accent Rule"):
- **The <name> Rule.** <rule in one sentence and why>.

Dark mode swaps tokens, never the composition.

## 3. Typography

| Style | Token | Use |
|---|---|---|
| Display | `typography.display` | <hero numbers, greetings> |
| Title | `typography.title` | <card and panel titles> |
| Body | `typography.body` | <UI text> |
| Label | `typography.label` | <chips, field labels; sentence case> |

## 4. Elevation and shape

| Token | Use |
|---|---|
| `shadow.card` | <cards> |
| `radius.control` / `radius.card` | <controls / cards> |

<Platform rendering traps that constrain this section (e.g. a browser that repaints large blurred
shadows under transforms) go here, with a link to the UI notes that hold the fix.>

## 5. Components

For each component class: the primitive it is built on (`<ui library>`), its tokens, its sizes on
touch vs pointer, and its states. Components in code are the second source of truth: when a
design artifact and a component disagree, the component wins until DESIGN.md is changed on
purpose.

### <Component>
<Primitive, tokens, sizes, states, what it must never do.>

## 6. Do and don't

### Do
- <e.g. Use skeletons for async content; give empty states a next step.>
- <e.g. Provide a reduced-motion fallback for every animation.>

### Don't
- <e.g. Don't hardcode prices or quotas in the UI; they come from config.>
- <e.g. Don't mix font families.>
