# Feature flags and progressive delivery

**Origin: external.** Established practice from the canonical source below; not yet proven in the project this kit came from. Treat its checks as a proposal to validate.

## Problem

Shipping a risky change to everyone at once makes every bug an outage, and long-lived branches to hide unfinished work cause painful merges.

## Principle

Separate deploy from release: ship code behind a flag, turn it on for a small cohort, watch the signals, widen or roll back without a deploy. Every flag has an owner and a removal date.

## When it applies

- Risky or user-visible changes in apps with real traffic; trunk-based development.

## When it doesn't

- Tiny apps where a revert deploy is just as fast.
- Permission or plan gating, which belongs to entitlements, not release flags.

## Typical mistakes

- Flags that are never removed, multiplying code paths.
- Evaluating flags only on the client for security-relevant behaviour.
- Testing only the "on" state.

## The check that verifies it

A registry of flags with owner and expiry, and a CI check or scheduled job that flags expired ones; tests for both states of each active flag.

## Canonical source

- [Pete Hodgson on martinfowler.com, Feature Toggles](https://martinfowler.com/articles/feature-toggles.html)
- [OpenFeature specification](https://openfeature.dev/)

## Variants per stack

- **Vendors:** PostHog, LaunchDarkly, Unleash, Flagsmith, GrowthBook (most with OpenFeature providers).
- **Mobile:** remote config with a safe default baked into the binary.

## Related

[billing-mirror-and-server-side-entitlements](billing-mirror-and-server-side-entitlements.md) · [slos-and-error-budgets](slos-and-error-budgets.md)
