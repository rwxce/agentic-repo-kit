# Sagas and compensating actions

**Origin: external.** Established practice from the canonical source below; not yet proven in the project this kit came from. Treat its checks as a proposal to validate.

## Problem

A business operation spans several services or providers (charge, reserve, publish). There is no distributed transaction, so a failure in step three leaves steps one and two applied.

## Principle

Model the operation as a sequence of local steps, each with a compensating action that undoes its effect. A durable coordinator runs the steps, records progress, and runs compensations in reverse on failure.

## When it applies

- Multi-step flows across external providers or services where partial completion is harmful.

## When it doesn't

- Steps inside one database: use a transaction.
- Effects that cannot be undone (an email sent): order them last or accept them.

## Typical mistakes

- Compensations that are not idempotent or that assume the forward step completed.
- Coordinator state kept in memory, lost on restart.
- No record of which compensations still failed.

## The check that verifies it

Tests that fail each step in turn and assert the compensations ran; a durable ledger of failed compensations reviewed by a person or a reconcile job.

## Canonical source

- [microservices.io, Pattern: Saga](https://microservices.io/patterns/data/saga.html)

## Variants per stack

- **Durable workflow engines:** Temporal, `@convex-dev/workflow`, AWS Step Functions, Trigger.dev, Inngest.
- **Message-based:** choreography through events, each service owning its compensation.

## Related

[durable-jobs](durable-jobs.md) · [transactional-outbox](transactional-outbox.md) · [dead-letter-queue](dead-letter-queue.md)
