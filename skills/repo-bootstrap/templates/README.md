# Templates index

Each template starts with a header comment: what it is, the repo signal that justifies it, and what
to fill. Strip that header when writing the real file (frontmatter must be the first thing in agent
and skill files). Fill every `<placeholder>`; delete optional sections whose signal is absent.

| Dir | Contents | Lands in the target repo as |
|---|---|---|
| `rules/` | `root.md` — root rules (plan + go, Clarifications, docs first, verification, git/review policy, agents roles, trim with audit…) | `.rulesync/rules/` or `CLAUDE.md`/`AGENTS.md` |
| `agents/` | `implementer.md`, `diff-reviewer.md`, `plan-reviewer.md`, `api-reference.md` | `.rulesync/subagents/` or `.claude/agents/` |
| `skills/` | `plan-feature/` (+ sweep and handoff briefs, loop roadmap), `verify-integration/`, `reflect/`, `debugging/`, `pr-review/` | `.rulesync/skills/` or `.claude/skills/` |
| `registries/` | `side-effect-registry.md`, `blueprint.md`, `environment-variables.md` | `docs/` |
| `rulesync/` | `rulesync.jsonc`, `permissions.jsonc`, `mcp.json` | repo root and `.rulesync/` |
| `hooks/` | 11 hook scripts + `node:test` suites, `hooks.rulesync.json`, `settings.hooks.json`, README | `scripts/` + hook wiring |
| `arch-tests/` | directory↔registry parity, route registry, content assets, unique codes, i18n parity | next to the code they guard |
| `lint/` | `eslint.local-rules.mjs` (+ tests), `eslint.config.snippet.mjs` | `eslint.config.*` |
| `ci/` | `ci.yml`, `branch-policy-guard.yml`, `migration-contract-gate.yml`, `review-routing/`, PR template, CODEOWNERS | `.github/` |
| `automations/` | `workspace-setup.sh`, `release-flow.md`, `check-vendored.mjs` (+ test) | `scripts/`, `.github/workflows/` |

Run every zero-dependency test in this folder with:

```bash
node --test skills/repo-bootstrap/templates/**/*.test.mjs
```
