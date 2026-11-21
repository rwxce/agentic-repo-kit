# Transactional outbox

**Origin: external.** Established practice from the canonical source below; not yet proven in the project this kit came from. Treat its checks as a proposal to validate.

## Problem

Code writes to the database and then publishes an event or calls another service. If the process dies between the two, the database and the outside world disagree forever.

## Principle

Write the outgoing message to an outbox table in the same transaction as the state change. A separate relay reads the outbox and delivers each message at least once; consumers are idempotent.

## When it applies

- A state change that must be followed by an event, email, webhook or call to another service.

## When it doesn't

- Platforms where a mutation can schedule follow-up work atomically (the scheduler is the outbox).
- Effects that are fine to lose.

## Typical mistakes

- Publishing inside the transaction (the message is sent even if the transaction rolls back).
- Consumers that are not idempotent, so at-least-once delivery doubles effects.
- An outbox that is never pruned.

## The check that verifies it

A test that fails the process between commit and delivery and asserts the message is still delivered once; a metric on outbox age.

## Canonical source

- [microservices.io, Pattern: Transactional outbox](https://microservices.io/patterns/data/transactional-outbox.html)

## Variants per stack

- **Postgres:** outbox table plus a poller, or change data capture (Debezium).
- **Convex:** `ctx.scheduler.runAfter` inside a mutation is committed atomically with the write.
- **Rails / Django:** enqueue after commit (`after_commit`, `transaction.on_commit`) — closer, but a crash after commit still loses the job unless the queue is in the same database.

## Related

[durable-jobs](durable-jobs.md) · [saga-compensation](saga-compensation.md) · [webhook-verify-dedupe-reread](webhook-verify-dedupe-reread.md)
