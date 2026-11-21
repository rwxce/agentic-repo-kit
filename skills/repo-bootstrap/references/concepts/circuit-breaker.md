# Circuit breaker

**Origin: external.** Established practice from the canonical source below; not yet proven in the project this kit came from. Treat its checks as a proposal to validate.

## Problem

When a dependency is down, every request still waits for its timeout, threads pile up and the failure spreads to unrelated features.

## Principle

Wrap calls to a remote dependency in a breaker that counts failures. After a threshold it opens and fails fast for a cool-down, then lets a few trial calls through and closes when they succeed. Callers handle the open state with a fallback.

## When it applies

- Synchronous calls to dependencies whose outage would otherwise exhaust your capacity.

## When it doesn't

- Background jobs, where retries with backoff and a dead-letter queue already isolate the failure.
- Low-traffic apps where the timeout alone is acceptable.

## Typical mistakes

- One breaker for all endpoints of a provider when only one is failing.
- No fallback, so "fail fast" is just a faster error page.
- Counting client errors (4xx) as dependency failures.

## The check that verifies it

A test with a fake dependency that fails N times and asserts the breaker opens, fails fast and recovers; a metric on breaker state.

## Canonical source

- [Martin Fowler, Circuit Breaker](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Azure Architecture Center: Circuit Breaker pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker)

## Variants per stack

- **Node:** `opossum`. **JVM:** Resilience4j `CircuitBreaker`. **.NET:** Polly. **Go:** `sony/gobreaker`.
- **Service mesh:** outlier detection in Envoy / Istio.

## Related

[timeouts-retries-backoff](timeouts-retries-backoff.md) · [separate-work-queues](separate-work-queues.md)
