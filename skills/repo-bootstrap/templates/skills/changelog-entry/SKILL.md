<!--
TEMPLATE: changelog-entry skill (content module). Generate it when the product has a public
changelog / "what's new" page fed by a registry (`product/content/content-registry.ts` or the
repo's own). Not for a library's developer CHANGELOG.md: that one lists every change. Fill:
<release branch/tag convention>, <registry path>, <messages dir>, <locales>, <media storage>,
<sensitive list sources>. Strip this comment.
-->
---
name: changelog-entry
description: >-
  Draft the public changelog entry (the "what's new" page, release notes for users) for the
  release about to be cut: list what merged since the last release, keep only what users notice,
  filter out anything sensitive, write every locale, attach media that shows each change, and open
  a PR for the founder. Use before cutting a release, or when the user asks for release notes or a
  "what's new" entry.
targets: ["*"]
---

# Changelog entry for the next release

The public page shows **one entry per minor version**, patches folded inside. Structure and dates
live in `<registry path>`; text lives in `<messages dir>` under the entry's key, in every locale.
Media lives in `<media storage>`, never overwritten (a changed shot gets a new file name).

Run it **before** the release is cut, so the changelog PR is the last merge in the release.

## 1. Find what ships

1. Version: the last release per `<release branch/tag convention>` plus the bump the founder
   chooses (ask if unknown).
2. Changes: the merged PRs between the last release's snapshot and the current head of the
   integration branch. Anchor to the commit the last release shipped, not to wall-clock time.
3. Minor or major bump → new entry. Patch → a "New in X.Y.Z" block in the current entry, only if
   something is user-visible.

## 2. Keep only what users notice

Read each PR title, and its body when unclear. **Always exclude:**
- failures and fixes of things that broke, even reworded positively ("no longer fails");
- security, auth and dependency patches;
- vendor and subprocessor names (`<sensitive list sources>`, e.g. the compliance inventory);
- infrastructure and internal tooling: CI, agents, deploys, database, workers, monitoring;
- legal-page changes; prices, quotas, plan entitlements, customer names;
- promises and roadmap ("soon", "next");
- wording that contradicts the product rules (use-case matrix, positioning).

A "Fixes" section holds only visual or usability details. A minor with nothing left gets no entry.

## 3. Write it

- `title` (the user's outcome), one-sentence `summary`, then `new`, `improvements`, `fixes`.
- Voice from the tone and positioning docs: present tense, no exclamation marks, nothing in the
  past tense that has not happened.
- Source locale first, then every locale in `<locales>` with the glossary.
- Date: today's date while drafting; reconcile every release date in the registry with the real
  release commit on each run, so a slipped cut is corrected by the next run.

## 4. Show it

Every user-visible change ships media: a short recording of the real interaction (or a still when
nothing moves), in the main locales, desktop and phone. Record from the running app or a static
recreation; never from production data with real users in it.

## 5. Check and open the PR

- Run the content guard (dates, order, every locale, forbidden words) and i18n parity.
- Open the PR to the integration branch with the list of PRs considered and why each excluded one
  was excluded. The founder reviews the wording; the forbidden-word list is only a safety net.
