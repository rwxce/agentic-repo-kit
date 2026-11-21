# Idempotent API requests

**Origin: external.** Established practice from the canonical source below; not yet proven in the project this kit came from. Treat its checks as a proposal to validate.

## Problem

A client times out and retries a POST. Without idempotency the server creates the order, charge or message twice.

## Principle

Non-idempotent endpoints accept an idempotency key chosen by the client. The server stores the key with the first result and returns that same result for every repeat within a retention window; a repeat with a different payload is rejected.

## When it applies

- Public or partner APIs that create resources or move money; mobile clients on flaky networks.

## When it doesn't

- Naturally idempotent operations (PUT of a full resource, DELETE by id).
- Internal calls already deduplicated by a job key.

## Typical mistakes

- Storing the key after the effect, so a crash in between allows a duplicate.
- Accepting the same key with a different body.
- Keys that never expire, or expire before clients stop retrying.

## The check that verifies it

Tests that send the same request twice (and concurrently) and assert one effect and identical responses; a test that a reused key with a different body is rejected.

## Canonical source

- [IETF draft: The Idempotency-Key HTTP Header Field](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/)
- [Stripe API reference: Idempotent requests](https://docs.stripe.com/api/idempotent_requests)

## Variants per stack

- **HTTP:** `Idempotency-Key` request header; a keys table with a unique constraint.
- **Mobile:** generate the key once per user action and reuse it across retries.

## Related

[durable-jobs](durable-jobs.md) · [timeouts-retries-backoff](timeouts-retries-backoff.md)
