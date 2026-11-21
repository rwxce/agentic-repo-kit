# Transaction isolation levels

**Origin: external.** Established practice from the canonical source below; not yet proven in the project this kit came from. Treat its checks as a proposal to validate.

## Problem

Two concurrent requests read the same row, both decide, both write: a balance goes negative, a seat is sold twice, a quota is exceeded. The default isolation level of most databases allows it.

## Principle

Know the default isolation level of your database and which anomalies it permits. For read-decide-write logic, use a stronger level, an explicit row lock, or an atomic conditional update, and retry on serialization failures.

## When it applies

- Money, quotas, inventory, uniqueness that is not covered by a constraint, any read-then-write invariant.

## When it doesn't

- Single-statement writes guarded by a constraint or an atomic update (`UPDATE ... SET n = n - 1 WHERE n > 0`).
- Backends that already run every mutation serializably.

## Typical mistakes

- Assuming the database default (often Read Committed) prevents lost updates.
- Raising the level without retrying on serialization errors.
- Holding a transaction open across an external API call.

## The check that verifies it

A concurrency test that runs the same operation in parallel and asserts the invariant; review of every read-decide-write path in money and quota code.

## Canonical source

- [PostgreSQL documentation: Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)

## Variants per stack

- **Postgres:** `SERIALIZABLE` with retry on `40001`, or `SELECT ... FOR UPDATE`.
- **MySQL InnoDB:** default `REPEATABLE READ`; use locking reads for read-decide-write.
- **Django:** `transaction.atomic()` plus `select_for_update()`.
- **Convex:** mutations are serializable transactions with automatic retry; keep external calls in actions.
- **Firestore:** transactions retry on contention.

## Related

[optimistic-concurrency-control](optimistic-concurrency-control.md) · [connection-pooling](connection-pooling.md)
