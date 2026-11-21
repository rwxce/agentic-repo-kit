# Rate limits sized by cost

**Origin: proven.** Enforced in the production project this kit was distilled from (generalized, project names removed).

## Problem

A public entry point that triggers paid work (an LLM call, a render, an email) can be looped by one caller into a large bill or an outage for everyone else.

## Principle

Every public entry point gets a limit, or a written reason why it has none. The limit is sized by what one call costs, keyed by the identity hardest to fake, and floods are cut at the edge before they wake the application.

## When it applies

- Public APIs, server actions or functions with an external cost (AI, email, SMS, renders).
- Anonymous forms (contact, sign-up, unsubscribe).

## When it doesn't

- Internal-only, secret-gated or already quota-capped entry points, with the reason written down.

## Typical mistakes

- Keying anonymous limits by a client-controlled header such as `x-forwarded-for` without a trusted proxy.
- Consuming the limit inside a transaction that rolls back when the handler later throws.
- One global number for endpoints with very different costs.

## The check that verifies it

A plan-time table (entry point · trigger · external cost · limit · decision) that agents must fill before implementing; tests for the wired limits; optionally a test that every public function consumes a limit.

## Canonical source

- [OWASP API Security Top 10 2023, API4 Unrestricted Resource Consumption](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/)

## Variants per stack

- **Convex:** `@convex-dev/rate-limiter`, one declaration per limit with its cost comment.
- **Redis:** token bucket or sliding window (`@upstash/ratelimit`, `rate-limiter-flexible`).
- **Edge:** CDN or edge-function limits by the platform-set client IP header.
- **Django / Rails:** `django-ratelimit`, `rack-attack`.

## Related

[circuit-breaker](circuit-breaker.md) · [timeouts-retries-backoff](timeouts-retries-backoff.md)
