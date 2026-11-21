# Compliance by evidence

**Origin: proven.** Enforced in the production project this kit was distilled from (generalized, project names removed).

## Problem

Published legal texts make concrete promises (what is collected, who receives it, how long it is kept). Code that contradicts them is a transparency breach, and the easiest kind to prove, because the company signed the text.

## Principle

Keep an inventory of data flows built from the code, not from memory. Before a change that touches personal data, device storage, vendors, consent or retention, compare it with the published text and record any mismatch before continuing. The lawful basis is a human decision.

## When it applies

- Products with personal data, analytics, cookies or published privacy terms.

## When it doesn't

- Tools that process no personal data. It produces an inventory and mismatches, not legal text: final wording needs a lawyer.

## Typical mistakes

- An inventory written from memory instead of from the code.
- Adding an analytics or monitoring vendor without updating the subprocessor list.
- Retention periods in policy that no job enforces.

## The check that verifies it

An advisory Stop hook that scans added lines for outbound hosts, device storage, consent bypasses and new persisted personal fields; a root-rule list of triggers that require the check.

## Canonical source

- [Regulation (EU) 2016/679 (GDPR), EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj)

## Variants per stack

- **EU / UK:** GDPR records of processing (Art. 30), transparency (Arts. 13-14), ePrivacy for cookies.
- **US:** CCPA/CPRA notices; state privacy laws.
- **Mobile:** App Store privacy nutrition labels and Google Play data safety form, kept in sync with the inventory.

## Related

[every-catch-reports](every-catch-reports.md) · [llm-boundary](llm-boundary.md) · [reconciliation-and-retention-crons](reconciliation-and-retention-crons.md)
