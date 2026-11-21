# Health checks: liveness and readiness

**Origin: external.** Established practice from the canonical source below; not yet proven in the project this kit came from. Treat its checks as a proposal to validate.

## Problem

A load balancer keeps sending traffic to an instance that started but cannot reach its database, or restarts a healthy instance because one dependency is slow.

## Principle

Expose a liveness check (the process works; restart if not) separate from a readiness check (it can serve now; stop routing if not). Keep liveness free of dependencies; readiness checks only what the instance needs to serve.

## When it applies

- Long-running services behind an orchestrator or load balancer.

## When it doesn't

- Serverless functions and BaaS backends, where the platform owns instance health; use a post-deploy smoke test instead.

## Typical mistakes

- Liveness that checks the database, so a database blip restarts every instance.
- Health endpoints that are public and leak versions or internals.
- No startup allowance, so slow boots are killed in a loop.

## The check that verifies it

Tests for both endpoints with the dependency up and down; deploy config that wires them to the orchestrator probes.

## Canonical source

- [Kubernetes documentation: Liveness, Readiness, and Startup Probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/)

## Variants per stack

- **Kubernetes:** `livenessProbe`, `readinessProbe`, `startupProbe`.
- **Spring Boot:** Actuator health groups. **ASP.NET:** `MapHealthChecks`.
- **Serverless:** a post-deploy smoke script against the real URL.

## Related

[gated-release-pipeline](gated-release-pipeline.md) · [observability-logs-metrics-traces](observability-logs-metrics-traces.md)
