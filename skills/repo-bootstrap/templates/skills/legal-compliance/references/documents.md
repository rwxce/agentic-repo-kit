# Document skeletons

One file per step under `<compliance dir>/`. Each starts with: "Evidence-first working document as
of <date>. Not legal advice and not final legal text."

## `compliance_inventory.md`

```markdown
# Compliance inventory

## Evidence scope
- Code read: <dirs>. Schema: <file>. Config: <files>. Published legal texts: <paths or "none">.

## Data map by flow
| Flow | Data collected / derived | Storage | Third parties | Evidence (`file:line`) | Status |
|---|---|---|---|---|---|

## Device storage
| Name | Kind (cookie / localStorage / SDK) | Set by | Purpose | Strictly necessary? | Consent-gated? | Evidence |
|---|---|---|---|---|---|---|

## Controller / processor hypotheses
- <role per flow, marked LEGAL_REVIEW_REQUIRED>

## Applicable jurisdictions (step 5)
| Instrument | Why it may apply (deciding facts) | Obligations → flows | Source (opened on <date>) | Status |
|---|---|---|---|---|
```

## `vendor_matrix.md`

```markdown
| Vendor | Feature | Data categories | Source files | Likely role | Region / transfer | DPA | Retention / delete / export | Legal text impact | Status |
|---|---|---|---|---|---|---|---|---|---|
```

## `policy_code_discrepancies.md`

```markdown
Status legend: `contradicted` (code does the opposite) · `unimplemented` (promise with no code) ·
`stale` (text no longer matches code) · `note` (acceptable, worth tracking).

### <n>. <short title> — `<status>` <date found> → <resolution and date, when closed>
- Text says: "<quoted sentence>" (<page>, §<n>)
- Code does: <what> (`file:line`)
- Resolution: <code change PR · text change via lawyer · founder decision D-<id>>
```

## `founder_questions.md`

```markdown
| Decision | Recommended default | Why it matters | Status |
|---|---|---|---|
| Minimum age | <e.g. 18+> | <drives child-privacy obligations> | REQUIRES_FOUNDER_CONFIRMATION |
```

## `founder_decisions.md`

```markdown
### D-<id> — <date> — <decision in one line>
- Question: <link to the question>
- Answer: <the founder's words>
- Closes: <discrepancy numbers, questions>
- Not a legal clearance; counsel review stays open where marked.
```

## `lia/<processing>.md`

```markdown
# Legitimate-interest assessment: <processing>
Date: <date> · Lawful basis claimed: Art. 6(1)(f) · Decision owner: <founder> · Not legal advice.

## 1. Purpose test
## 2. Necessity test
## 3. Balancing test (data that can be included, expectations, impact)
## 4. Safeguards (minimisation, scrubbing, sampling, retention, access, opt-out)
## 5. Decision and review date
```

## `retention_deletion_plan.md`

```markdown
| Data class | Current evidence | Suggested period | Deletion path (job, test) | Status |
|---|---|---|---|---|

## Access request export scope
- <entities and fields included>
```

## Lawyer brief

```markdown
# Brief for counsel — <product>, <date>
Product and users · Flows (link) · Vendors (link) · Jurisdictions considered and deciding facts ·
Open discrepancies · Founder decisions · Drafts attached (each marked DRAFT — REQUIRES LEGAL REVIEW)
· Questions for counsel.
```
