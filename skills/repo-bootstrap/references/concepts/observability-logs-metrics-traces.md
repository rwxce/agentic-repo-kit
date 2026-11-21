# Observability: structured logs, metrics and traces

**Origin: external.** Established practice from the canonical source below; not yet proven in the project this kit came from. Treat its checks as a proposal to validate.

## Problem

When something breaks in production, free-text logs on one service cannot answer "which requests, since when, where in the chain". Teams debug by guessing and redeploying.

## Principle

Emit structured logs, metrics and traces with shared context (request id, trace id, tenant), from every service and job. Instrument with an open standard so the backend can change.

## When it applies

- Production services with more than one component (web, workers, providers).

## When it doesn't

- Local tools and scripts.

## Typical mistakes

- Logging personal data or secrets.
- High-cardinality labels (user ids) on metrics.
- Traces that stop at the queue, so background work is invisible.

## The check that verifies it

A smoke test that a request produces a trace spanning web and worker; a log-scrubbing test; dashboards and alerts reviewed when an SLO is defined.

## Canonical source

- [OpenTelemetry: Signals](https://opentelemetry.io/docs/concepts/signals/)

## Variants per stack

- **OpenTelemetry SDKs** for Node, Python, Go, JVM, .NET; exporters to Grafana, Honeycomb, Datadog, Sentry.
- **Node:** `pino` structured logs. **Python:** `structlog`. **Go:** `log/slog`.
- **Mobile:** crash and performance SDKs with a trace id propagated to the backend.

## Related

[every-catch-reports](every-catch-reports.md) · [slos-and-error-budgets](slos-and-error-budgets.md) · [health-checks](health-checks.md)
