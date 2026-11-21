<!--
TEMPLATE: legal-compliance skill (legal module). Generate it when the repo handles personal data,
analytics, cookies/local storage, payments, user content, AI on user data, or publishes legal
texts. Not for a CLI or library with no users' data. Fill: <compliance dir>, <legal pages path>,
<locales>, the jurisdictions the founder confirms. Strip this comment.
-->
---
name: legal-compliance
description: >-
  Evidence-first compliance work for this product: build the data inventory from the code, find
  where published legal texts and code disagree, list the questions only the founder can answer,
  and prepare legitimate-interest assessments, the processor list and the retention plan, with the
  official source for each obligation. Use before a change that sends user data to a third party,
  stores something on the device, persists a new field about a person, adds a vendor, or touches
  consent, retention or deletion; and when the user asks for a privacy, cookies or terms review.
  Never writes final legal text: drafts go to a lawyer.
targets: ["*"]
---

# Legal compliance (evidence first)

**This skill does not give legal advice and never produces final legal text.** It produces
evidence, mismatches and questions. Lawful bases, final wording and translations of legal texts
are decided by the founder with a qualified lawyer. Every draft it writes starts with
`DRAFT — REQUIRES LEGAL REVIEW` and stays out of `<legal pages path>` until a lawyer approves it.
Say this to the user the first time the skill runs in a conversation.

## Status markers

Use them on every row; a fact without one is a claim nobody checked.

| Marker | Meaning |
|---|---|
| `VERIFIED` | proven from code or config, with `file:line` |
| `UNKNOWN` | not provable from the repo (dashboard setting, contract, region) |
| `REQUIRES_EXTERNAL_VERIFICATION` | needs a dashboard, DPA, vendor docs or a support answer |
| `REQUIRES_FOUNDER_CONFIRMATION` | a business decision (age limit, retention period, regions) |
| `LEGAL_REVIEW_REQUIRED` | a lawful basis or public wording: lawyer decides |

## Method

Run the steps in order; each writes one file under `<compliance dir>/` (skeletons in
`references/documents.md`). Steps 1-3 are read-only on the code.

1. **Inventory from the code.** One row per data flow (sign-up, analytics, payments, uploads, AI
   calls, emails, logs, cookies/storage, webhooks): data collected or derived, where it is stored,
   which third party receives it, `file:line`. Read the schema, the SDK initialisations, every
   outbound call and every write to cookies/local storage. → `compliance_inventory.md`
2. **Processors and vendors.** One row per vendor: feature, data categories, likely role
   (processor / independent controller), region and transfer mechanism, DPA, retention, status.
   → `vendor_matrix.md`
3. **Discrepancies.** Read every published legal text sentence by sentence and compare it with
   steps 1-2. One numbered entry per mismatch: what the text says, what the code does (with
   evidence), status (`contradicted` · `unimplemented` · `stale` · `note`), resolution once decided.
   Newest first; never delete an entry, close it. → `policy_code_discrepancies.md`
4. **Questions for the founder.** Only what the code cannot answer, each with a recommended
   default and why it matters. Ask them; do not assume an answer. → `founder_questions.md`
5. **Jurisdictions and obligations.** From where users are, where the company is, and the business
   model, pick the applicable rows of `references/jurisdictions.md` and map each obligation to the
   flows of step 1. Re-check every source URL before citing it; the table is a starting point, not
   a legal opinion. → section in `compliance_inventory.md`
6. **Legitimate-interest assessments.** For each processing the founder wants to base on
   legitimate interests: purpose test, necessity test, balancing test, safeguards, decision owner
   and date, written **before** the processing ships. → `lia/<processing>.md`
7. **Retention and deletion.** One row per data class: current evidence, suggested period (marked
   `REQUIRES_FOUNDER_CONFIRMATION`), deletion path, export scope for access requests. Each period
   that ships needs a job that enforces it and a test. → `retention_deletion_plan.md`
8. **Decisions.** Every founder answer goes to `founder_decisions.md` with an id, the date and the
   entries it closes, so nothing is re-litigated.
9. **Hand-off to the lawyer.** A short brief: product, flows, vendors, jurisdictions, open
   discrepancies, decisions taken, and the drafts. Text in every locale comes after approval;
   translations of legal texts are reviewed too.

Detail, examples and pitfalls for each step: `references/method.md`.

## When code changes later

The root rule's compliance stop-check sends any change that matches the six triggers here first:
update the inventory and vendor rows, add a discrepancy if the published text no longer matches,
and raise it with the user before continuing. The compliance tripwire hook (if installed) only
catches known patterns; this list is the rule.

## Never

- Write or edit a published legal page, a cookie banner text or a consent flow on your own.
- Choose a lawful basis, a retention period or an age limit.
- Cite a source you did not open in this session, or a date you did not read on the official page.
- Weaken or bypass a consent gate to make something work.
