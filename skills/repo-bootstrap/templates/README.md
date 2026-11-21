# Templates index

Each template starts with a header comment: what it is, the repo signal that justifies it, and what
to fill. Strip that header when writing the real file (frontmatter must be the first thing in agent
and skill files). Fill every `<placeholder>`; delete optional sections whose signal is absent.

| Dir | Contents | Lands in the target repo as |
|---|---|---|
| `rules/` | `root.md` — root rules (plan + go, Clarifications + decision log, evidence before architecture, spikes, plan folders, use-case table, docs first, verification, git/review policy, agents roles, trim with audit…) | `.rulesync/rules/` or `CLAUDE.md`/`AGENTS.md` |
| `agents/` | `implementer.md`, `diff-reviewer.md`, `plan-reviewer.md`, `api-reference.md` | `.rulesync/subagents/` or `.claude/agents/` |
| `skills/` | `plan-feature/` (+ sweep and handoff briefs, loop roadmap, plan folder, evidence and spikes, diagram/method pickers, plan readability), `verify-integration/`, `reflect/`, `debugging/`, `pr-review/`, `pr-scope/` (+ scope and adversarial-review references), `interview-me/` | `.rulesync/skills/` or `.claude/skills/` |
| `commands/` | `pr-triage.md` — classify each review comment as in scope or deferred against the frozen scope | `.rulesync/commands/` or `.claude/commands/` |
| `registries/` | `side-effect-registry.md`, `blueprint.md`, `environment-variables.md`, `use-case-matrix.md`, `ui-surfaces.md` | `docs/` |
| `rulesync/` | `rulesync.jsonc`, `permissions.jsonc`, `mcp.json` | repo root and `.rulesync/` |
| `hooks/` | 15 hook scripts + 2 seal CLIs (`pr-precheck-seal`, `review-seal`) + the machine-wide Unicode firewall and its installer, `node:test` suites, `hooks.rulesync.json`, `settings.hooks.json`, README | `scripts/` + hook wiring (the firewall: `<config>/hooks/` via its installer) |
| `arch-tests/` | directory↔registry parity, route registry, content assets, unique codes, i18n parity, UI surfaces inventory | next to the code they guard |
| `test-guards/` | `job-leak-guard.mjs` (+ test): fails the test that leaves scheduled jobs pending | test setup files |
| `lint/` | `eslint.local-rules.mjs` (+ tests), `eslint.config.snippet.mjs`, `lint-restrictions.lint.test.mjs` (the restrictions still fire) | `eslint.config.*` |
| `ci/` | `ci.yml`, `list-guard-tests.mjs`, `branch-policy-guard.yml`, `migration-contract-gate.yml`, `contract-issue.yml`, `mark-ready-contracts.mjs`, `smoke-deploy.yml`, `check-deploy-artifact.mjs`, `prune-stale-branches.yml`, `plan-folder/` (close check + gate + stale workflows), `review-routing/`, PR template, CODEOWNERS | `.github/` |
| `automations/` | `workspace-setup.sh`, `release-flow.md`, `check-vendored.mjs`, `check-skills.mjs`, `check-dependency-families.mjs`, `smoke-deploy.mjs`, `skill-routing.cases.json` (each + test) | `scripts/`, `.github/workflows/` |

Run every zero-dependency test in this folder with:

```bash
node --test skills/repo-bootstrap/templates/**/*.test.mjs
```
