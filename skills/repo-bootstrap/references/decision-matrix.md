# Phase 4 — decision matrix: repo signal → artifact

Rule zero: **no signal, no artifact.** Put "would be nice" items under *Later* with the signal that
would justify them. When two rows conflict, prefer the deterministic artifact (hook, lint, test)
over prose — prose is for judgment, code is for rules.

## Where a rule should live

| The rule… | Put it in | Why |
|---|---|---|
| is needed in almost every task (plan before code, git policy, verification bar) | root rules | always loaded; keep it short |
| is needed only for one kind of task (planning a feature, verifying an integration) | a skill | body loads only when used |
| is "how we build X here" for one domain | the domain agent's **Build rules** | read by planner and implementer |
| can be checked mechanically (import boundaries, required test file, banned API) | custom lint rule | deterministic, CI-enforced |
| is structural drift between a registry and the filesystem | architecture test | fails the build, no judgment needed |
| must stop an action before it happens (destructive, outward, secrets) | PreToolUse hook + permissions | the agent cannot forget it |
| should nudge but not block (lint on stop, env docs, compliance patterns) | advisory Stop hook | cheap, visible, non-blocking |
| is a fact about the system (envs, side effects, inventory) | a registry doc | one source agents read |

## Root rules — sections and their signals

| Section | Include when |
|---|---|
| Plan before code + wait for "go" | always |
| Clarifications section on questioned plans + decision log (`decisions.md` / `## Decisions`) | always |
| Evidence before architecture; feasibility spikes need an OK per spike id | always (cheap); critical for integrations and unfamiliar tech |
| Plan folders for multi-PR initiatives (written in the user's language, closed by the last PR) | initiatives regularly span several PRs |
| Use-case table from `docs/use-case-matrix.md` (states + transitions; review findings checked against named product rules) | behaviour depends on user state (plan tier, feature toggles, record lifecycle) |
| Docs first + package before custom (reliability checklist, exact pins ≥5 days) | always |
| Plan covers only the current ask | always |
| Feature requests → plan-feature (size small/normal/big) | repo has >1 domain or any sensitive domain |
| Rate-limit block for new public entry points | public API/routes/server actions with external cost |
| Compliance stop-check | personal data, analytics, cookies, legal pages, consent |
| Review lanes (demonstrable vs flow-sensitive) + solo-founder variant | PR workflow exists |
| Verification: full circle + UI screenshot matrix + missing-tools gate | external services or UI |
| Kill dev processes you start | long-running dev servers; parallel worktrees |
| Agents roles + Handoff brief | ≥1 implementer agent proposed |
| Trim with audit | AI config exists or is expected to grow |
| Corrections → reflect | always (cheap) |
| Response length, language | always |

## Agents

| Signal | Proposal |
|---|---|
| Domain with ≥5 project-specific build rules (helpers, conventions, gotchas) found in discovery, or planners lacked them in the benchmark | **Implementer** for that domain, cheaper model (e.g. Sonnet), Build rules section, starts from a Handoff brief, stops and reports when the plan doesn't fit |
| Sensitive area (auth, money, data, security) with a PR workflow | **Diff reviewer**, strongest model, read-only tools, fresh context, mandatory for flow-sensitive PRs |
| Features regularly span several domains, or benchmark showed misses | **Plan reviewer**, read-only, fed the plan + sweep tables, ≤15 verified bullets, tool-call budget |
| Complex framework with API pitfalls models get wrong | **Reference agent** (consulted, never an entry point) |
| Domain with <5 specific rules | **No agent** — the main session handles it; revisit later |

Models by role: orchestrator (main session) = strongest; implementers = cheaper; reviewers =
strongest for diffs. Allow a one-call upgrade of an implementer for big creative work.

## Skills

| Signal | Skill |
|---|---|
| Any feature work | `plan-feature` (size → concept inventory → consumer sweep → docs first → registry walk → plan → invariants → fresh review when big) |
| External services, webhooks, jobs or UI | `verify-integration` with one recipe row per detected service |
| Always | `reflect` (corrections → proposed rule/memory, written only after a yes) |
| Non-trivial codebase | `debugging` (reproduce → localize → reduce → fix root cause → regression test) |
| PR workflow | `pr-review` (diff-based, security/regressions first, no nits, `Type: independent \| self-check` + review seal) and a PR-creation command |
| Review-heavy PRs that keep growing | `pr-scope` (freeze scope, route out-of-scope findings to follow-up PRs) + `pr-triage` command |
| Asks often arrive underspecified | `interview-me` (one question at a time, each with a guess, before any plan) |
| Auth + UI | a test-login skill (throwaway test user, reach states without the human) — template `skills/test-login/` (dev-env module) |
| Repeated multi-step workflow found in docs/scripts (release, seed, data fix) | a project skill for it |

## Hooks, tests, lint, CI, automations, permissions, registries
Pick from `guardrail-catalog.md`; each catalog row lists its signal.

## Project signal → concepts

Open only the cards a signal points to (`concept-catalog.md`, cards in `concepts/`). A concept
enters the proposal with the signal (`file:line`), the card and the check it adds; if the card's
"when it doesn't" matches the repo, leave it out and say why. External cards are proposals to
validate, not proven practice.

| Signal found in discovery | Concepts to read |
|---|---|
| Authenticated pages and public pages under one router | `default-deny-routes`, `route-registry`, `guard-tests` |
| Multi-tenant data (workspace, team, org ids in the schema) | `authorization-at-the-data-boundary`, `input-validation-at-the-boundary` |
| Route handlers or workers calling the data API without a user session | `shared-secret-bridges`, `secrets-management` |
| Public entry points (API routes, server actions, functions, forms) | `input-validation-at-the-boundary`, `typed-errors`, `rate-limit-by-cost` |
| Paid work behind an entry point (LLM, email, SMS, renders) | `rate-limit-by-cost`, `durable-jobs`, `circuit-breaker` |
| Server fetches a user-supplied URL | `outbound-fetch-ssrf-guard` |
| "Connect your account" OAuth flows | `signed-oauth-state` |
| Incoming webhooks | `webhook-verify-dedupe-reread`, `reconciliation-and-retention-crons`, `transactional-outbox` |
| Web app serving HTML with third-party scripts or user content | `security-headers-and-csp` |
| `.env*` files, secrets in CI variables, several deploy targets | `secrets-management`, `change-completeness-preflight` |
| Relational database reached from serverless or autoscaled code | `connection-pooling`, `transaction-isolation-levels` |
| Money, quotas, inventory or seats (read-decide-write) | `transaction-isolation-levels`, `optimistic-concurrency-control`, `idempotent-api-requests` |
| Records edited by several users or clients | `optimistic-concurrency-control` |
| Schema migrations, mobile clients on older versions | `expand-migrate-contract`, `backup-and-tested-restore` |
| Production data that cannot be regenerated | `backup-and-tested-restore` |
| A state change followed by an event, email or call elsewhere | `transactional-outbox`, `durable-jobs` |
| Multi-step flows across providers (charge → reserve → publish) | `saga-compensation`, `durable-jobs`, `dead-letter-queue` |
| Billing provider, plans, quotas | `billing-mirror-and-server-side-entitlements`, `reconciliation-and-retention-crons` |
| Published retention periods or privacy terms | `reconciliation-and-retention-crons`, `compliance-by-evidence` |
| Background jobs or queues with retries | `durable-jobs`, `dead-letter-queue`, `timeouts-retries-backoff` |
| Public API that creates resources; mobile clients on flaky networks | `idempotent-api-requests`, `timeouts-retries-backoff` |
| Synchronous calls to a provider whose outage would exhaust capacity | `circuit-breaker`, `timeouts-retries-backoff` |
| Several classes of background work, at least one with a deadline | `separate-work-queues` |
| User uploads of images, video or documents | `presigned-upload-to-worker`, `native-binaries-in-workers` |
| Native-binary packages plus serverless or edge deploys | `native-binaries-in-workers`, `layer-boundaries-as-lint` |
| Client-rendered app with authenticated reactive data | `single-client-read-gateway` |
| LLM calls in product features | `llm-boundary`, `rate-limit-by-cost`, `compliance-by-evidence` |
| Error monitoring SDK configured | `every-catch-reports`, `typed-errors` |
| Identifiable layers or modules, several contributors | `layer-boundaries-as-lint`, `guard-tests` |
| Responsive UI, several locales, many dialogs | `layout-guard-and-ui-inventory`, `route-registry` |
| Risky user-visible changes on real traffic; trunk-based work | `feature-flags` |
| Production services with more than one component | `observability-logs-metrics-traces`, `health-checks` |
| Long-running services behind a load balancer or orchestrator | `health-checks` |
| Paying users or contractual uptime | `slos-and-error-budgets`, `backup-and-tested-restore` |
| More than one deployed environment | `gated-release-pipeline`, `health-checks` |
| Third-party dependencies (always) | `supply-chain-hygiene` |
| Published packages, images or mobile binaries; customers asking for an SBOM | `sbom-and-provenance` |
| PR workflow, solo maintainer or agents reviewing | `review-lanes`, `change-completeness-preflight` |
| Personal data, analytics, cookies, legal pages | `compliance-by-evidence`, `every-catch-reports` |
| Agents run shell commands in the repo | `agent-guardrail-hooks`, `planning-gate` |
| More than one agent tool in use | `generated-agent-config` |
| Daily agent use; long sessions resumed across chats | `corrections-become-rules`, `session-handoff` |
| Medium or large codebase explored by agents | `code-graph-navigation` |

## Project signal → product modules

Opt-in, one level above the families (`product-modules.md`). Offer a module only on its signal;
propose only the pieces whose own signal is present. No signal → no module ("a CLI gets none").

| Signal found in the scan or discovery | Module · first pieces to propose |
|---|---|
| User-facing UI that agents design for | Design · `PRODUCT.md`, `DESIGN.md`, `ui-surfaces.md` + guard |
| A theme, Tailwind config or token file | Design · DTCG `tokens.tokens.json` + `check-tokens.mjs` (with `--css` for web) |
| Vendored design skills installed (≥1) and a UI domain with ≥5 build rules | Design · `skill-overrides.md` + `agents/ui-router.md` |
| Team explores in a design tool (exports, artifact links in PRs) | Design · `design-flow.md` |
| Personal data, analytics/replay SDKs, cookies or local storage, payments, uploads, published legal pages | Legal · `legal-compliance` skill (+ root `## Compliance` section and tripwire hook) |
| Blog, guides or comparison pages on the product site | Content · `content-registry.ts` + test, `content-writing` skill |
| Public "what's new" page | Content · `changelog-entry` skill, changelog in the registry |
| Marketing site or onboarding copy | Copy · `positioning.md`, `tone.md` |
| 2+ locale files | Copy · `glossary.json` + `check-glossary.mjs`, `i18n-parity.mjs` |
| LLM calls in product code | Product AI · `model-ids.ts`, `strict-json-schema.mjs`, prompt version, cost log |
| A model choice or prompt that changes over time | Product AI · `eval.md` |
| Billing SDK, plans, quotas, trials | Growth · `plans.ts` + test, `check-hardcoded-prices.mjs` |
| App URL vars pointing to a tunnel/shared host; parallel worktrees | Dev env · `dev-local.mjs`, local-vs-tunnel table |
| Auth plus UI behind it | Dev env · `test-login` skill |
| A secrets store synced to several runtimes | Dev env · secrets folder per provider (env registry) |

## MCP servers
From Lens 4: one row per external service with an **official** MCP. See `mcp-discovery.md`.
