# SLOs and error budgets

**Origin: external.** Established practice from the canonical source below; not yet proven in the project this kit came from. Treat its checks as a proposal to validate.

## Problem

Without an agreed reliability target, every incident is either ignored or a crisis, and the trade-off between shipping features and fixing reliability is argued from opinion.

## Principle

Pick a few user-facing indicators (availability, latency of key journeys), set an objective for each, and track the error budget it leaves. When the budget is spent, reliability work takes priority over features, by a policy agreed in advance.

## When it applies

- Products with paying users or contractual expectations, and enough traffic to measure.

## When it doesn't

- Pre-launch products with no real traffic: measure first, set objectives later.

## Typical mistakes

- Objectives on internal metrics (CPU) instead of user journeys.
- 100% targets, which leave no room to ship.
- An error budget with no policy, so nothing changes when it is spent.

## The check that verifies it

SLO definitions in the repo, alerts on budget burn rate, and an error-budget policy document referenced by the release process.

## Canonical source

- [Google SRE book: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
- [Google SRE workbook: Error Budget Policy](https://sre.google/workbook/error-budget-policy/)

## Variants per stack

- **Tooling:** Sloth or OpenSLO definitions; Grafana, Datadog, Honeycomb or Nobl9 SLO features.
- **Small teams:** one availability SLO from an uptime checker plus one latency SLO from the APM.

## Related

[observability-logs-metrics-traces](observability-logs-metrics-traces.md) · [gated-release-pipeline](gated-release-pipeline.md) · [feature-flags](feature-flags.md)
