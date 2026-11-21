# Backups with a tested restore

**Origin: external.** Established practice from the canonical source below; not yet proven in the project this kit came from. Treat its checks as a proposal to validate.

## Problem

Backups that were never restored are a hope, not a plan. Teams discover during an incident that backups are missing, incomplete, too slow to restore or encrypted with a lost key.

## Principle

Define the recovery point and recovery time you need, back up to match them, and restore on a schedule into a scratch environment, measuring the time and checking the data.

## When it applies

- Any production data you cannot regenerate.

## When it doesn't

- Derived data that can be rebuilt from a source of truth (caches, search indexes), as long as the rebuild is documented and timed.

## Typical mistakes

- Trusting the provider backup without ever restoring it.
- Backups in the same account or region as production, deleted by the same mistake.
- Forgetting object storage, secrets and configuration.
- No runbook, so the restore depends on one person.

## The check that verifies it

A scheduled restore drill (automated where possible) that restores the latest backup into an isolated environment, runs integrity queries and records the duration against the target.

## Canonical source

- [Google SRE book, Data Integrity](https://sre.google/sre-book/data-integrity/)
- [PostgreSQL documentation: Continuous Archiving and PITR](https://www.postgresql.org/docs/current/continuous-archiving.html)

## Variants per stack

- **Postgres:** WAL archiving and point-in-time recovery (pgBackRest, managed PITR).
- **Managed BaaS:** the platform export or snapshot, restored into a separate deployment.
- **Object storage:** versioning plus cross-account replication.
- **Mobile:** local data on device is covered by platform backup rules; decide what is excluded.

## Related

[expand-migrate-contract](expand-migrate-contract.md) · [slos-and-error-budgets](slos-and-error-budgets.md)
