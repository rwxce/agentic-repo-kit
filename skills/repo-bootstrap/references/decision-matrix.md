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
| Clarifications section on questioned plans | always |
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
| PR workflow | `pr-review` (diff-based, security/regressions first, no nits) and a PR-creation command |
| Auth + UI | a test-login skill (throwaway test user, reach states without the human) |
| Repeated multi-step workflow found in docs/scripts (release, seed, data fix) | a project skill for it |

## Hooks, tests, lint, CI, automations, permissions, registries
Pick from `guardrail-catalog.md`; each catalog row lists its signal.

## MCP servers
From Lens 4: one row per external service with an **official** MCP. See `mcp-discovery.md`.
