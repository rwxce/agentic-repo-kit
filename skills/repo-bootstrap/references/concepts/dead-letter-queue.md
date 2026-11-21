# Dead-letter queue

**Origin: external.** Established practice from the canonical source below; not yet proven in the project this kit came from. Treat its checks as a proposal to validate.

## Problem

A message that always fails (a poison message) is retried forever, blocks the queue, or is dropped silently after the last retry.

## Principle

After a bounded number of attempts, move the message to a dead-letter store with the error and attempt count. Alert on it, inspect it, and replay it after the fix.

## When it applies

- Any queue or job system with retries.

## When it doesn't

- Work that is safe to drop and is regenerated on the next run.

## Typical mistakes

- A dead-letter store nobody watches.
- No replay tool, so fixed messages are re-created by hand.
- Losing the original payload or error when moving the message.

## The check that verifies it

A test that a message failing N times lands in the dead-letter store with its error; an alert on dead-letter count above zero.

## Canonical source

- [Amazon SQS Developer Guide: Using dead-letter queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html)

## Variants per stack

- **Managed queues:** SQS redrive policy, Pub/Sub dead-letter topics, RabbitMQ dead-letter exchanges.
- **Job libraries:** BullMQ failed set, Sidekiq dead set, Celery with a failure table.
- **Convex / workflow engines:** a failed-runs table (durable ledger) plus a replay mutation.

## Related

[durable-jobs](durable-jobs.md) · [saga-compensation](saga-compensation.md)
