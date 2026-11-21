# Schema changes: expand, migrate, contract

**Origin: proven.** Enforced in the production project this kit was distilled from (generalized, project names removed).

## Problem

Renaming or removing a field in one deploy breaks old rows, in-flight jobs and the previous version of the code still running. The cleanup step is the one people forget, so dead fields pile up.

## Principle

Change a schema in three steps, each its own deploy: add the new shape, migrate the data, remove the old shape. Track the contract step from the moment the migration exists, and run migrations before anyone depends on them.

## When it applies

- Any persisted schema with live traffic, background jobs or clients on older versions (mobile apps).

## When it doesn't

- A brand-new table or a new optional field needs only the expand step.
- A prototype with no real data.

## Typical mistakes

- Renaming in place in one deploy.
- Migrating data in the same deploy that starts reading only the new shape.
- No tracked contract step, so the old field lives forever.

## The check that verifies it

A CI gate that fails a PR adding a migration without a linked "Contract: <name>" issue; the deploy runs migrations and waits for completion before promoting.

## Canonical source

- [Martin Fowler, Parallel Change](https://martinfowler.com/bliki/ParallelChange.html)

## Variants per stack

- **Convex:** `@convex-dev/migrations`, optional field first, `runAll` in the deploy.
- **SQL:** Flyway, Liquibase, Alembic, Django or Rails migrations; online schema tools (`gh-ost`, `pg-osc`) for large tables.
- **Mobile clients:** keep the old field until the minimum supported app version stops reading it.

## Related

[backup-and-tested-restore](backup-and-tested-restore.md) · [gated-release-pipeline](gated-release-pipeline.md)
