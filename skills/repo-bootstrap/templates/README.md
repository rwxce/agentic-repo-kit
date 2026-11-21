# Templates index

Each template starts with a header comment: what it is, the repo signal that justifies it, and what
to fill. Strip that header when writing the real file (frontmatter must be the first thing in agent
and skill files). Attribution comments (`<!-- Adapted from … -->`, `<!-- … draw on ideas from … -->`)
are not part of that header: keep them in the generated file. Sources and licenses are listed in
[`../THIRD_PARTY.md`](../THIRD_PARTY.md), which travels with the skill when it is installed.
Fill every `<placeholder>`; delete optional sections whose signal is absent.

| Dir or file | Contents | Lands in the target repo as |
|---|---|---|
| `system-design.md` | one-page system design: brief, observable requirements, trust boundaries, risks, decisions each linked to its check | `docs/architecture/system-design.md` (standard or deep depth only) |
| `adr.md` | one decision: alternatives on checkable criteria, the decision, **Enforced by** | `docs/adr/NNNN-<slug>.md` |
| `rules/` | `root.md` — root rules (plan + go, Clarifications + decision log, evidence before architecture, spikes, plan folders, use-case table, docs first, verification, git/review policy, agents roles, trim with audit…) | `.rulesync/rules/` or `CLAUDE.md`/`AGENTS.md` |
| `agents/` | `implementer.md`, `diff-reviewer.md`, `plan-reviewer.md`, `api-reference.md`, `ui-router.md` (design module) | `.rulesync/subagents/` or `.claude/agents/` |
| `skills/` | `plan-feature/` (+ sweep and handoff briefs, loop roadmap, plan folder, evidence and spikes, diagram/method pickers, plan readability), `verify-integration/`, `reflect/`, `debugging/`, `pr-review/`, `pr-scope/` (+ scope and adversarial-review references), `interview-me/`; product modules: `legal-compliance/`, `content-writing/`, `changelog-entry/`, `test-login/` | `.rulesync/skills/` or `.claude/skills/` |
| `commands/` | `pr-triage.md` — classify each review comment as in scope or deferred against the frozen scope; `pr-make.md` — commit, push and open the PR in one request (precheck gate, review-seal warning, lane, mandatory diagram, base guards); `sync-dev.md` — merge the integration branch in with a tagged stash and per-file conflict rules; `git-clean.md` — delete unprotected branches and worktrees after one go, with a SHA backup | `.rulesync/commands/` or `.claude/commands/` |
| `registries/` | `side-effect-registry.md`, `blueprint.md`, `environment-variables.md`, `use-case-matrix.md`, `ui-surfaces.md` | `docs/` |
| `rulesync/` | `rulesync.jsonc`, `permissions.jsonc`, `mcp.json` | repo root and `.rulesync/` |
| `hooks/` | 15 hook scripts + 2 seal CLIs (`pr-precheck-seal`, `review-seal`) + the machine-wide Unicode firewall and its installer, `opencode/` plugin shims (ask-guards, hand off), `node:test` suites, `hooks.rulesync.json`, `settings.hooks.json`, README | `scripts/` + hook wiring (the firewall: `<config>/hooks/` via its installer) |
| `arch-tests/` | directory↔registry parity, route registry, content assets, unique codes, i18n parity, UI surfaces inventory | next to the code they guard |
| `test-guards/` | `job-leak-guard.mjs` (+ test): fails the test that leaves scheduled jobs pending; `layout/`: Playwright overflow guard at fixed widths plus a width sweep (+ test of the scan) | test setup files; `e2e/` |
| `lint/` | `eslint.local-rules.mjs` (+ tests), `eslint.config.snippet.mjs`, `lint-restrictions.lint.test.mjs` (the restrictions still fire) | `eslint.config.*` |
| `ci/` | `ci.yml`, `list-guard-tests.mjs`, `branch-policy-guard.yml`, `migration-contract-gate.yml`, `contract-issue.yml`, `mark-ready-contracts.mjs`, `smoke-deploy.yml`, `check-deploy-artifact.mjs`, `prune-stale-branches.yml`, `plan-folder/` (close check + gate + stale workflows), `review-routing/`, PR template, CODEOWNERS | `.github/` |
| `product/` | opt-in product modules, each with a README and zero-dependency checks: `design/` (PRODUCT.md, DESIGN.md, DTCG tokens + check, UI surfaces inventory + guard, design flow, skill overrides), `legal/`, `content/` (typed registry + guard), `copy/` (positioning, tone, glossary + check), `ai/` (model ids, strict schema, eval), `growth/` (plans + test, price-literal check), `dev-env/` (local launcher). Proposed only on a signal (`../references/product-modules.md`) | `docs/`, `scripts/`, `lib/`, repo root |
| `automations/` | `workspace-setup.sh`, `release-flow.md`, `check-vendored.mjs`, `check-skills.mjs`, `check-dependency-families.mjs`, `smoke-deploy.mjs`, `check-release-age.mjs`, `skill-routing.cases.json` (each + test), `renovate.json5`, `pnpm-workspace.snippet.yaml` | `scripts/`, `.github/workflows/`, repo root (Renovate, pnpm workspace) |

Run every zero-dependency test in this folder with:

```bash
node --test "skills/repo-bootstrap/templates/**/*.test.mjs"   # Node >= 22.18 (the product .ts templates are type-stripped)
```
