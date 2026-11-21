# Durable jobs: natural idempotency keys, a job registry, bounded retries

**Origin: proven.** Enforced in the production project this kit was distilled from (generalized, project names removed).

## Problem

Background work fails halfway, gets retried or runs twice. Without a stable key a retry repeats an external effect (a second post, a second charge); without a record nobody can tell what is running, stuck or failed.

## Principle

Derive every idempotency key from a natural id of the thing being processed, persist it and send it to the provider. Record each run with its phase. Retry a bounded number of times with backoff, keep a durable ledger of what still failed, and recover runs that went silent.

## When it applies

- Any background job with external effects: publishing, charging, emailing, file processing.

## When it doesn't

- A quick, side-effect-free action needs none of this.

## Typical mistakes

- A key derived from the payload, which collapses two legitimately distinct requests.
- A new random key per retry, which defeats idempotency.
- Unbounded retries that hammer a failing provider.
- No sweeper for runs stuck in an intermediate phase.

## The check that verifies it

Tests that run a job twice and assert one effect; a test harness that fails when a test leaves scheduled work pending; a stuck-run sweeper with its own test.

## Canonical source

- [Stripe API reference: Idempotent requests](https://docs.stripe.com/api/idempotent_requests)

## Variants per stack

- **Convex:** `@convex-dev/workflow` for multi-step pipelines, `@convex-dev/action-retrier` for single idempotent actions, a job-runs table.
- **Node:** BullMQ with `jobId` set to the natural key.
- **Python:** Celery with `acks_late` and an idempotency table.
- **Ruby:** Sidekiq with unique jobs.
- **Workflow engines:** Temporal, Trigger.dev, Inngest (idempotency keys built in).

## Related

[idempotent-api-requests](idempotent-api-requests.md) · [dead-letter-queue](dead-letter-queue.md) · [timeouts-retries-backoff](timeouts-retries-backoff.md) · [saga-compensation](saga-compensation.md)
