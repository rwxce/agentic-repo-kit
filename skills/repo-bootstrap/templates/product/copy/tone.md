<!--
TEMPLATE: tone of voice — how a string sounds (copy module). Lands as `docs/tone.md`.
REPO SIGNAL: user-facing strings in i18n files that agents write. Fill the personality from
PRODUCT.md, pick the canonical screen, and replace every before/after with real ones from this
product as they happen. Strip this comment.
-->
# Tone of voice: how a string sounds

`docs/positioning.md` decides *what* a string says. This file decides *how it sounds*. Read it
before writing any new string in `<messages dir>`. Applies to every user-facing string; excluded:
legal texts, i18n key names, error codes.

## Where the tone comes from

`PRODUCT.md` → Brand personality (<three adjectives>) and Anti-references. Do not re-derive the
personality here.

**Canonical screen:** `<path to the screen whose copy best expresses the tone>`. When in doubt,
imitate it.

**External reference (optional):** <e.g. a platform's system copy: progress sheets, empty states,
error dialogs — not its marketing register>.

## Rules

They bite hardest in waiting, progress, empty and success states, where the temptation is to
describe the machine.

1. **Title the user's outcome, not the machine's activity.**
   > ~~"<Analyzing your data>"~~ → "<Your first report is taking shape>"
2. **Never promise a duration.** A long wait shows a named sequence of steps, not a clock.
   > ~~"<This takes about a minute>"~~ → *(deleted; named steps instead)*
3. **Name steps in human terms**, never with the job's internal phase names.
4. **"We" do the work, "your" owns the result**, and the result stays the user's.
5. **Warmth without hype**: no exclamation marks, no "magic", no emojis, no dramatized apologies.

## Failure states

State what happened and the one thing to do next. Apologise at most once. Never show an internal
code or a vendor name to the user.

## Every locale

Write the source locale first, then translate in the same register with `docs/glossary.json`.
Formality (tú/usted, du/Sie, tu/vous): <decided per locale here>.

| Locale | Formality | Notes |
|---|---|---|
| <es> | <tú> | <…> |

## Status

<Which screens follow the rules today and which are still to be rewritten.>
