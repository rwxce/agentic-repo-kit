# Every catch reports, with a closed code and scrubbed data

**Origin: proven.** Enforced in the production project this kit was distilled from (generalized, project names removed).

## Problem

Catch blocks turn real failures into a toast or a silent return, and nothing reaches monitoring. When they do report, free-text messages cannot be grouped, and events can carry personal data.

## Principle

Every catch reports to error monitoring with a code from a closed list, unless a comment says why the failure is intentionally not reported. Events are scrubbed before they leave, and client telemetry respects the published consent rules.

## When it applies

- Any app with error monitoring configured.

## When it doesn't

- Expected control flow (a "not found" that is a normal branch) — say so in a comment.

## Typical mistakes

- Monitoring SDKs imported directly in UI code, bypassing the consent-aware wrapper.
- Free-text messages as the grouping key.
- Sending request bodies, emails or tokens in events.

## The check that verifies it

A `catch-must-report` lint rule in UI folders; `no-restricted-imports` for monitoring SDKs outside the wrapper; tests for the scrubber.

## Canonical source

- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)

## Variants per stack

- **Sentry (any SDK):** a `beforeSend` scrubber, `sendDefaultPii: false`, replay masking.
- **Python:** `logging` with a filter that scrubs, plus `sentry_sdk` `before_send`.
- **Mobile:** Crashlytics or Sentry with PII off; non-fatal reports for caught errors.

## Related

[typed-errors](typed-errors.md) · [observability-logs-metrics-traces](observability-logs-metrics-traces.md) · [compliance-by-evidence](compliance-by-evidence.md)
