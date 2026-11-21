# Webhooks: verify, deduplicate, re-read

**Origin: proven.** Enforced in the production project this kit was distilled from (generalized, project names removed).

## Problem

Webhooks arrive forged, duplicated, out of order and replayed. Parsing before verifying runs attacker input; applying a delivery twice double-charges; trusting the payload applies stale state.

## Principle

Verify the signature on the raw body before parsing. Deduplicate on a key that identifies the event, committed in the same transaction as the effect, so a failed attempt is retried. When the payload is only a hint, re-read the current state from the provider.

## When it applies

- Any incoming webhook: billing, auth provider, scheduling, publishing, version control.

## When it doesn't

- A provider with idempotent effects and no money involved may skip the dedup table.

## Typical mistakes

- Verifying the parsed-and-reserialised JSON instead of the raw bytes.
- Recording the dedup key before the effect, so a crash loses the event forever.
- Applying an old event after a newer one (no ordering or timestamp check).

## The check that verifies it

Tests with a forged, a duplicated and a retried delivery; a real signed delivery sent twice in a sandbox produces one row and one effect.

## Canonical source

- [Standard Webhooks specification](https://www.standardwebhooks.com/)

## Variants per stack

- **Standard Webhooks providers:** verify `webhook-id`/`webhook-timestamp`/`webhook-signature`; dedupe on `webhook-id`.
- **Svix-based providers:** the `svix` library verifies, then idempotent upserts.
- **Body-only signatures:** derive the key from the event itself (type + object id + timestamp).
- **Convex:** an HTTP action verifies, then one mutation stores the key and applies the effect atomically.

## Related

[durable-jobs](durable-jobs.md) · [reconciliation-and-retention-crons](reconciliation-and-retention-crons.md) · [transactional-outbox](transactional-outbox.md)
