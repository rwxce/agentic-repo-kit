# Shared-secret bridges for internal callers

**Origin: proven.** Enforced in the production project this kit was distilled from (generalized, project names removed).

## Problem

Server code outside the data runtime (route handlers, background workers) must call it without a user session. Exposing those calls as ordinary public functions lets anyone call them.

## Principle

A call from a trusted server process carries a secret only servers hold, checked first in constant time, with one secret per caller. The bridge is a narrow, named surface, not a generic "run anything" door.

## When it applies

- A backend-as-a-service or data API called from your own route handlers or workers.
- Webhook handlers that must write after verifying the provider signature.

## When it doesn't

- Callers that have a user session: use the user token and the normal guards.
- Platforms with native service identities (cloud IAM, mTLS) that already authenticate the caller.

## Typical mistakes

- One secret shared by every caller and every environment.
- A generic bridge that runs any function by name.
- Comparing the secret with `===` instead of a constant-time comparison.
- Leaving the secret readable from client bundles (public env prefixes).

## The check that verifies it

Tests for a missing and a wrong secret on every bridge function; a lint boundary that keeps app code from importing internals, so the bridge is the only door.

## Canonical source

- None found. No official or primary source describes this exact pattern; the principle above is the reference.

## Variants per stack

- **Convex:** public functions that call `requireServerBridgeSecret(args.secret)` first, one secret per caller (web, worker).
- **Node:** `crypto.timingSafeEqual` on equal-length buffers.
- **Python:** `hmac.compare_digest`.
- **Cloud:** prefer workload identity (GCP service accounts, AWS IAM roles, OIDC tokens) when the platform offers it.

## Related

[authorization-at-the-data-boundary](authorization-at-the-data-boundary.md) · [secrets-management](secrets-management.md) · [webhook-verify-dedupe-reread](webhook-verify-dedupe-reread.md)
