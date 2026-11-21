# Legal module

Opt-in. Propose it only when the repo processes personal data, writes to the user's device
(cookies, local storage, SDKs), takes payments, hosts user content, runs AI on user data, or
publishes legal texts. A CLI or library with no user data gets none of this.

| Piece | Lands as | What it prevents |
|---|---|---|
| `../../skills/legal-compliance/` (SKILL.md + `references/method.md`, `jurisdictions.md`, `documents.md`) | `.rulesync/skills/legal-compliance/` | published promises the code contradicts; vendors nobody listed; retention periods with no job behind them |
| Root rule `## Compliance` stop-check (already in `rules/root.md`) | root rules | a change that sends data out, stores on the device or adds a vendor shipping without the check |
| `../../hooks/compliance-tripwire.mjs` (already in the kit) | Stop hook | silent new tracking or storage patterns (advisory, pattern-based) |

**The line it does not cross.** The skill builds evidence, finds mismatches and asks questions. It
never writes final legal text, chooses a lawful basis or sets a retention period; drafts go to a
lawyer marked `DRAFT — REQUIRES LEGAL REVIEW`. The skill says so to the user.

**Method.** Inventory from the code → processors → discrepancies against the published texts →
questions for the founder → jurisdictions and their official sources → legitimate-interest
assessments → retention and deletion → decision log → lawyer brief.

**Sources.** `jurisdictions.md` maps each instrument to its obligations and an official URL. Every
URL was opened on 2026-11-21; the skill re-opens a source before citing it and never copies an
application date from the table.

**Related concept cards:** `compliance-by-evidence`, `reconciliation-and-retention-crons`,
`every-catch-reports`.

**Example (reference project, not a default):** a SaaS published privacy, cookie and terms pages in
eight locales; the audit kept a `compliance/` folder with the inventory, vendor matrix, numbered
discrepancies, founder decisions and an LIA, and every later change that matched the stop-check
updated those files in the same PR.
