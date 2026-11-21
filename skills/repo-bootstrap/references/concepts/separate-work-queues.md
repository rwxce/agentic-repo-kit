# Separate queues for work with different deadlines (bulkhead)

**Origin: proven.** Enforced in the production project this kit was distilled from (generalized, project names removed).

## Problem

When slow, bursty work (AI generation) and time-sensitive work (publishing at a scheduled slot) share one queue, urgent jobs wait behind slow ones and miss their deadline. Heavy jobs sharing a pool also starve each other.

## Principle

Give each class of work its own queue with its own parallelism, sized by the deadline and the cost of one job. Size the machine per task, not per application.

## When it applies

- Background systems with more than one class of work and at least one deadline.
- Database pools shared by fast requests and slow reports.

## When it doesn't

- One class of work and no deadlines: one queue is simpler.

## Typical mistakes

- One worker pool for everything.
- Concurrency limits copied from defaults instead of sized from provider limits and job cost.

## The check that verifies it

Mostly configuration read in review; a load test that floods the slow queue and asserts the urgent queue still meets its deadline.

## Canonical source

- [Azure Architecture Center: Bulkhead pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/bulkhead)

## Variants per stack

- **Convex:** a second `@convex-dev/workflow` or workpool instance with its own `maxParallelism`.
- **Trigger.dev / Inngest:** per-task `queue` and `concurrencyLimit`, per-task machine size.
- **BullMQ / Sidekiq / Celery:** named queues with dedicated workers.
- **Databases:** separate pools (or read replicas) for API traffic and reports.

## Related

[connection-pooling](connection-pooling.md) · [durable-jobs](durable-jobs.md) · [circuit-breaker](circuit-breaker.md)
