# Concept catalog

One card per engineering concept a repo may need, loaded on demand. Do not read the cards up
front: map the repo's signals to concepts with the "Project signal → concepts" table in
`decision-matrix.md`, then open only the cards that matched.

Every card has the same fields: **problem · principle · when it applies · when it doesn't ·
typical mistakes · the check that verifies it · canonical source · variants per stack**.

**Origin.** *Proven* cards come from a production project where the code and its check exist.
*External* cards are established practice added for coverage, not yet proven there; propose
their checks as something to validate, never as "already works". A card whose source field says
"None found" has no official or primary reference: none was invented.

**How to use a card in a proposal.** Cite the repo signal (`file:line`), the card, and the check
you will add. If the card's "when it doesn't" matches the repo, drop the concept and say why.
A concept is not an artifact: it becomes one only through a row in `guardrail-catalog.md` or a
project-specific check.

## Identity and the public boundary

| Concept | Principle in one line | Origin |
|---|---|---|
| [Default-deny route protection](concepts/default-deny-routes.md) | Classify every route explicitly as public or protected. | proven |
| [Authorization at the data boundary](concepts/authorization-at-the-data-boundary.md) | Authentication and authorization are separate steps, and both run where the data lives. | proven |
| [Shared-secret bridges for internal callers](concepts/shared-secret-bridges.md) | A call from a trusted server process carries a secret only servers hold, checked first in constant time, with one secret per caller. | proven |
| [Input validation at the boundary](concepts/input-validation-at-the-boundary.md) | Parse every input once at the trust boundary into a typed value with an allow-list schema (type, length, range, format), reject what does not fit, and pass only the parsed value inward. | external |
| [Typed domain errors](concepts/typed-errors.md) | Errors that cross a boundary are a closed set of codes. | proven |
| [Rate limits sized by cost](concepts/rate-limit-by-cost.md) | Every public entry point gets a limit, or a written reason why it has none. | proven |
| [SSRF guard on server-side fetches](concepts/outbound-fetch-ssrf-guard.md) | Before every request, and again on every redirect hop, resolve the host and allow only public unicast addresses over http(s). | proven |
| [Signed OAuth state](concepts/signed-oauth-state.md) | The state that leaves for the provider is signed and short-lived, and it binds the tenant and the intent. | proven |
| [Webhooks: verify, deduplicate, re-read](concepts/webhook-verify-dedupe-reread.md) | Verify the signature on the raw body before parsing. | proven |
| [Security headers and Content Security Policy](concepts/security-headers-and-csp.md) | Send a baseline of security headers on every response, and a Content Security Policy that allows only the origins the app needs. | external |
| [Secrets management](concepts/secrets-management.md) | Keep each secret once in a secrets store, inject it at run time per environment, give each runtime only the keys it reads, document every variable, and rotate on a schedule and on every suspected leak. | external |

## Data and consistency

| Concept | Principle in one line | Origin |
|---|---|---|
| [Connection pooling](concepts/connection-pooling.md) | Share a bounded pool of connections per process, and put a pooler in front of the database when the number of processes is unbounded. | external |
| [Transaction isolation levels](concepts/transaction-isolation-levels.md) | Know the default isolation level of your database and which anomalies it permits. | external |
| [Optimistic concurrency control](concepts/optimistic-concurrency-control.md) | Give each record a version. | external |
| [Schema changes: expand, migrate, contract](concepts/expand-migrate-contract.md) | Change a schema in three steps, each its own deploy: add the new shape, migrate the data, remove the old shape. | proven |
| [Transactional outbox](concepts/transactional-outbox.md) | Write the outgoing message to an outbox table in the same transaction as the state change. | external |
| [Sagas and compensating actions](concepts/saga-compensation.md) | Model the operation as a sequence of local steps, each with a compensating action that undoes its effect. | external |
| [Backups with a tested restore](concepts/backup-and-tested-restore.md) | Define the recovery point and recovery time you need, back up to match them, and restore on a schedule into a scratch environment, measuring the time and checking the data. | external |
| [Billing: a read mirror of the provider, entitlements enforced on the server](concepts/billing-mirror-and-server-side-entitlements.md) | Mirror the provider data for reading, keep your own entitlements derived from it, and check every limit on the server at the moment the paid work starts. | proven |
| [Reconciliation and retention crons](concepts/reconciliation-and-retention-crons.md) | For every state that depends on an event, run a periodic job that compares with the source and repairs. | proven |

## Background work and resilience

| Concept | Principle in one line | Origin |
|---|---|---|
| [Durable jobs: natural idempotency keys, a job registry, bounded retries](concepts/durable-jobs.md) | Derive every idempotency key from a natural id of the thing being processed, persist it and send it to the provider. | proven |
| [Idempotent API requests](concepts/idempotent-api-requests.md) | Non-idempotent endpoints accept an idempotency key chosen by the client. | external |
| [Timeouts, retries and backoff with jitter](concepts/timeouts-retries-backoff.md) | Every remote call has a timeout. | external |
| [Circuit breaker](concepts/circuit-breaker.md) | Wrap calls to a remote dependency in a breaker that counts failures. | external |
| [Dead-letter queue](concepts/dead-letter-queue.md) | After a bounded number of attempts, move the message to a dead-letter store with the error and attempt count. | external |
| [Separate queues for work with different deadlines (bulkhead)](concepts/separate-work-queues.md) | Give each class of work its own queue with its own parallelism, sized by the deadline and the cost of one job. | proven |
| [Presigned uploads processed by a worker](concepts/presigned-upload-to-worker.md) | The client uploads straight to object storage with a short-lived presigned URL under a per-tenant prefix. | proven |
| [Native and heavy work only in workers](concepts/native-binaries-in-workers.md) | Native and heavy work runs in a separate worker runtime. | proven |

## Application code

| Concept | Principle in one line | Origin |
|---|---|---|
| [One gateway for client data reads](concepts/single-client-read-gateway.md) | All reactive reads in the UI go through one wrapper that waits for auth, keeps a cache across navigation and returns an explicit status. | proven |
| [The LLM boundary: configured models, safe schemas, measured quality](concepts/llm-boundary.md) | Resolve model ids from per-environment config with no default and an allow list of providers. | proven |
| [Every catch reports, with a closed code and scrubbed data](concepts/every-catch-reports.md) | Every catch reports to error monitoring with a code from a closed list, unless a comment says why the failure is intentionally not reported. | proven |
| [Layer boundaries as lint rules](concepts/layer-boundaries-as-lint.md) | Encode the allowed dependencies as lint rules that fail the build (default disallow), each with a message that says what to do instead. | proven |
| [One route registry](concepts/route-registry.md) | Every app path is declared once, with an un-prefixed form for links and a prefixed form for redirects. | proven |
| [Layout guard and UI inventory](concepts/layout-guard-and-ui-inventory.md) | Keep an inventory of every page and floating surface, guarded by a test so it cannot fall behind. | proven |
| [Feature flags and progressive delivery](concepts/feature-flags.md) | Separate deploy from release: ship code behind a flag, turn it on for a small cohort, watch the signals, widen or roll back without a deploy. | external |

## Operations

| Concept | Principle in one line | Origin |
|---|---|---|
| [Observability: structured logs, metrics and traces](concepts/observability-logs-metrics-traces.md) | Emit structured logs, metrics and traces with shared context (request id, trace id, tenant), from every service and job. | external |
| [Health checks: liveness and readiness](concepts/health-checks.md) | Expose a liveness check (the process works; restart if not) separate from a readiness check (it can serve now; stop routing if not). | external |
| [SLOs and error budgets](concepts/slos-and-error-budgets.md) | Pick a few user-facing indicators (availability, latency of key journeys), set an objective for each, and track the error budget it leaves. | external |

## Delivery and supply chain

| Concept | Principle in one line | Origin |
|---|---|---|
| [Guard tests: tests that read the repo](concepts/guard-tests.md) | Write repo-wide invariants as tests that read the file system and compare it with an inventory. | proven |
| [Gated release pipeline](concepts/gated-release-pipeline.md) | Code moves in one direction through fixed branches, by buttons, not by hand. | proven |
| [Supply-chain hygiene](concepts/supply-chain-hygiene.md) | Pin exact versions and refuse releases younger than a few days. | proven |
| [SBOM and build provenance](concepts/sbom-and-provenance.md) | Generate a software bill of materials for every release artifact and keep it with the release. | external |
| [Review lanes and an independent-review seal](concepts/review-lanes.md) | Classify each PR into a lane by the files it touches: demonstrable changes are approved on evidence; flow-sensitive ones need a review in a fresh context, verified by a human. | proven |
| [Preflight for incomplete changes](concepts/change-completeness-preflight.md) | Check the diff against its base for completions it must carry, not for extensions. | proven |
| [Compliance by evidence](concepts/compliance-by-evidence.md) | Keep an inventory of data flows built from the code, not from memory. | proven |

## Working with agents

| Concept | Principle in one line | Origin |
|---|---|---|
| [A planning gate before code](concepts/planning-gate.md) | A feature request is detected and routed to a planning protocol before any edit: size the work, sweep who reads what will change, check the official docs, separate evidence from assumptions, and wait for an explicit "go". | proven |
| [Guardrail hooks for agent tool calls](concepts/agent-guardrail-hooks.md) | Put irreversible actions behind hooks that run before the tool call: block what must never happen, ask for what needs a human, and show what the command would change. | proven |
| [One source for agent configuration](concepts/generated-agent-config.md) | Write rules, agents, skills, hooks and permissions once and generate every editor file from that source. | proven |
| [Corrections become rules](concepts/corrections-become-rules.md) | Detect corrections when they happen, log them, and at the second occurrence of a class turn it into a lasting rule or memory. | proven |
| [Automatic session handoff](concepts/session-handoff.md) | At the end of every turn and before compaction, write a short handoff file from the repo state and the agent's last "pending" block. | proven |
| [A local code graph as the first step of analysis](concepts/code-graph-navigation.md) | Keep a local, offline graph of the code and query it before broad text search. | proven |

51 concepts: 33 proven, 18 external.
