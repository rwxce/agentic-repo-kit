# Timeouts, retries and backoff with jitter

**Origin: external.** Established practice from the canonical source below; not yet proven in the project this kit came from. Treat its checks as a proposal to validate.

## Problem

A call without a timeout hangs a worker forever; immediate retries from many clients turn a provider blip into an outage (retry storm).

## Principle

Every remote call has a timeout. Retry only idempotent operations and only transient errors, a bounded number of times, with exponential backoff and jitter, and cap retries at one layer of the stack.

## When it applies

- Every outbound network call: databases, provider APIs, internal services.

## When it doesn't

- Non-idempotent calls without an idempotency key.
- Errors that will not change on retry (validation, 4xx other than 408/429).

## Typical mistakes

- Library defaults with no timeout (or a very long one).
- Retries at every layer, multiplying the load.
- Fixed-interval retries without jitter, so clients synchronise.
- Ignoring `Retry-After`.

## The check that verifies it

Code review or lint that every client is constructed with a timeout; tests with a fake server that returns 503 and asserts the retry count and spacing.

## Canonical source

- [AWS Builders' Library: Timeouts, retries, and backoff with jitter](https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter)

## Variants per stack

- **JS:** `AbortSignal.timeout(ms)` on `fetch`; `p-retry`.
- **Python:** `httpx` timeouts; `tenacity`.
- **Go:** `context.WithTimeout`; `http.Client{Timeout}`.
- **JVM:** Resilience4j `Retry` and `TimeLimiter`.
- **Mobile:** `URLSession` / OkHttp timeouts; WorkManager / BGTaskScheduler backoff policies.

## Related

[circuit-breaker](circuit-breaker.md) · [idempotent-api-requests](idempotent-api-requests.md) · [durable-jobs](durable-jobs.md)
