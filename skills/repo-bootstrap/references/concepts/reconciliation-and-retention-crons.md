# Reconciliation and retention crons

**Origin: proven.** Enforced in the production project this kit was distilled from (generalized, project names removed).

## Problem

Webhooks get lost, scheduled runs die, providers change data in their own dashboards, and tables grow forever. Event-driven code alone drifts from reality and keeps data longer than promised.

## Principle

For every state that depends on an event, run a periodic job that compares with the source and repairs. For every table with a retention promise, run a batched prune. Each cron is internal, idempotent and documented next to its schedule.

## When it applies

- Integrations driven by webhooks or polling; any table with a published retention period.

## When it doesn't

- Anything that must be exact at the moment (charging) still needs the event path; a cron repairs late.

## Typical mistakes

- Prune jobs that delete everything in one transaction and time out.
- Retention periods in code that differ from the published privacy policy.
- Crons with no test and no alert when they stop running.

## The check that verifies it

A test per job; the retention periods compared with the published texts by the compliance check; a heartbeat or "last run" metric with an alert.

## Canonical source

- [Kubernetes documentation: Controllers (reconcile loops)](https://kubernetes.io/docs/concepts/architecture/controller/)

## Variants per stack

- **Convex:** `crons.ts` with self-rescheduling batches.
- **Postgres:** `pg_cron`, or a scheduled worker; delete in batches by indexed timestamp.
- **Cloud:** Cloud Scheduler / EventBridge Scheduler triggering an internal endpoint with a secret.
- **Kubernetes:** `CronJob` with `concurrencyPolicy: Forbid`.

## Related

[webhook-verify-dedupe-reread](webhook-verify-dedupe-reread.md) · [compliance-by-evidence](compliance-by-evidence.md) · [durable-jobs](durable-jobs.md)
