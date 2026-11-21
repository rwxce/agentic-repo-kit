# Optimistic concurrency control

**Origin: external.** Established practice from the canonical source below; not yet proven in the project this kit came from. Treat its checks as a proposal to validate.

## Problem

Two users edit the same record; the second save silently overwrites the first. Holding locks while a person types does not scale.

## Principle

Give each record a version. A write states the version it read and succeeds only if it is still current; otherwise the caller reloads, merges or asks the user.

## When it applies

- Collaborative editing of forms, settings or documents; APIs where clients read then update.

## When it doesn't

- Append-only data, or fields where last-write-wins is acceptable and documented.
- Real-time co-editing, which needs CRDTs or OT instead.

## Typical mistakes

- Checking the version in application code and then writing in a separate statement (race window).
- Not surfacing the conflict, so the client retries blindly and overwrites anyway.

## The check that verifies it

A test that performs two updates from the same read and expects the second to fail with a conflict code.

## Canonical source

- [Martin Fowler, Optimistic Offline Lock (PoEAA)](https://martinfowler.com/eaaCatalog/optimisticOfflineLock.html)

## Variants per stack

- **SQL:** `UPDATE ... SET version = version + 1 WHERE id = ? AND version = ?` and check affected rows.
- **HTTP:** `ETag` plus `If-Match`, answering `412 Precondition Failed`.
- **JPA:** `@Version`. **Rails:** `lock_version`. **Django:** a version field with a conditional `update()`.

## Related

[transaction-isolation-levels](transaction-isolation-levels.md) · [typed-errors](typed-errors.md)
