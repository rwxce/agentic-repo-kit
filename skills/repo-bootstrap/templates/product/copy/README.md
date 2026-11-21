# Copy module

Opt-in. Propose it when agents write user-facing strings: a marketing site, onboarding, emails, or
an app with i18n files. A CLI's help text or a library's docs get none of this (their style lives
in the code-style rules).

| Piece | Lands as | Signal | What it prevents |
|---|---|---|---|
| `positioning.md` | `docs/positioning.md` | a marketing site or onboarding copy | sections that describe features instead of answering the visitor's doubt; promises of things not shipped |
| `tone.md` | `docs/tone.md` | user-facing strings in i18n files | each agent inventing a register; duration promises in waiting states |
| `glossary.json` | `docs/glossary.json` | two or more locales | the same product term translated three different ways |
| `check-glossary.mjs` (+ test) | `scripts/check-glossary.mjs`, `check:glossary` (advisory, then `--strict` in CI) | the glossary | a translation that ignores the agreed term or uses an avoided word |
| `../../arch-tests/i18n-parity.mjs` (already in the kit) | `scripts/i18n-parity.mjs`, `check:i18n` | two or more locale files | a key present in one locale and missing in another |

**Root rules.** Add a short "Positioning & copy" and "Tone of voice" section pointing at the two
docs (read them before changing a string); keep the rules themselves in the docs.

**Translating.** Source locale first. Every other locale is translated with the glossary, in the
register `tone.md` sets per locale. Legal texts are not translated by an agent and published:
they go through the legal module's lawyer review. Machine-translated strings are reviewed by
someone who reads the language before release when the locale is a market the product targets.

**Example (reference project, not a default):** positioning listed five visitor doubts and the
message keys that answer each; tone named one onboarding screen as the canonical expression; eight
locales were kept at parity by a CI check. Translating without a glossary was the gap this module
closes.
