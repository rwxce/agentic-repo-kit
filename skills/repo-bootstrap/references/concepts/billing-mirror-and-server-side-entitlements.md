# Billing: a read mirror of the provider, entitlements enforced on the server

**Origin: proven.** Enforced in the production project this kit was distilled from (generalized, project names removed).

## Problem

The billing provider is the truth for what a customer pays, but calling it on every request is slow and fragile, and hiding a paid feature in the client is not a paywall.

## Principle

Mirror the provider data for reading, keep your own entitlements derived from it, and check every limit on the server at the moment the paid work starts. Limits come from the provider product metadata, not from constants scattered in the UI.

## When it applies

- Apps with paid plans, quotas or feature gates.

## When it doesn't

- A single paid plan with no quotas: a "has active subscription" check is enough.

## Typical mistakes

- Gating only in the UI.
- Plan limits hardcoded in several places that drift from the provider.
- Accounts left without any subscription record, so code paths branch on "missing".

## The check that verifies it

Tests for each limit at the boundary (at limit, over limit, plan change mid-period); a document mapping each limit to the function that enforces it; a reconcile job that repairs accounts without a subscription.

## Canonical source

- [Stripe documentation: Entitlements](https://docs.stripe.com/billing/entitlements)

## Variants per stack

- **Stripe:** Entitlements API plus webhooks into your own table.
- **Polar:** `@convex-dev/polar` component, or webhooks into your own tables; a free tier as a 0-price product.
- **Paddle / Lemon Squeezy:** webhooks into a local subscriptions table.
- **Mobile stores:** RevenueCat or server-side receipt validation; never trust the client purchase state alone.

## Related

[reconciliation-and-retention-crons](reconciliation-and-retention-crons.md) · [webhook-verify-dedupe-reread](webhook-verify-dedupe-reread.md) · [rate-limit-by-cost](rate-limit-by-cost.md)
