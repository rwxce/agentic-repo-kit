# Guardrail catalog

Every row is a pattern proven in a production project, generalized. Columns: what it is · what it
prevents · the repo signal that justifies it · blocking (B) / ask (Q) / advisory (A) · template.
Templates are in `templates/` (see `templates/README.md`).

## 1. Hooks

| Hook | Event | Prevents | Signal | B/Q/A | Template |
|---|---|---|---|---|---|
| Outward-writes blocker | PreToolUse Bash | agent approving PRs, mutating `gh api`/GraphQL, curl writes to review/comment endpoints | GitHub PR workflow | **B**, fail-closed | `hooks/block-outward-writes.mjs` |
| Dangerous-command gate | PreToolUse Bash | recursive delete, force push, push to protected branches, reset --hard, rebase, deploys, secrets CLIs, raw-disk writes, `curl | sh`, SQL DROP/DELETE without WHERE | always | **Q** with preview of what would change | `hooks/guard-dangerous-commands.mjs` |
| Feature-intent router | UserPromptSubmit | feature work starting without the planning protocol | plan-feature skill proposed | A | `hooks/detect-feature-intent.mjs` |
| Correction capture | UserPromptSubmit | the same correction repeating across sessions | always | A | `hooks/detect-correction.mjs` |
| Session status | SessionStart | planning skipped on fresh branches; stale/missing code index | always | A | `hooks/session-start-status.mjs` |
| Index reminder | PreToolUse Grep/Glob | agents re-reading code instead of querying the index | a code index exists | A, once per session | `hooks/index-reminder.mjs` |
| Lint if changed | Stop | lint errors left at end of turn | linter configured | A | `hooks/lint-if-changed.mjs` |
| Env-docs parity | Stop | new env var with no documentation | env registry doc | A | `hooks/check-env-docs.mjs` |
| Compliance tripwire | Stop | silent new tracking, cookies/storage, outbound calls, consent bypass | personal data / legal pages | A | `hooks/compliance-tripwire.mjs` |
| Branch-policy tripwire | Stop | local commits on protected branches | protected branches | A | `hooks/branch-policy.mjs` |
| PR preflight | Stop (A) / CI (B) | committed `.env*`, `.env` dropped from .gitignore, heavy binaries | always | A / **B** | `hooks/pr-preflight.mjs` |
| Process cleanup | SessionEnd | orphan dev servers exhausting the machine | parallel worktrees / dev servers | — | inline command |

**Lesson learned:** resolve hook scripts with `${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}`.
`git rev-parse` alone breaks inside nested repos or submodules, and a fail-closed hook that cannot
find its script blocks every shell call. Only the outward-writes hook should be fail-closed.
Every hook ships with tests; hooks run in CI tests like any other code.

## 2. Architecture tests

| Test | Prevents | Signal | Template |
|---|---|---|---|
| Directory ↔ registry parity | a new protected page/handler/module not registered (e.g. auth middleware prefixes) | a registry that must list every dir of a kind | `arch-tests/dir-registry-parity.test.ts` |
| Registry ↔ filesystem | registered routes/paths pointing nowhere | central routes/paths file | `arch-tests/route-registry-exists.test.ts` |
| Content ↔ assets | posts/demos referencing missing images, feeds missing entries | content collections | `arch-tests/content-assets-exist.test.ts` |
| Unique codes | duplicate error/event codes across groups | error-code or event catalogs | `arch-tests/unique-codes.test.ts` |
| i18n key parity | locales drifting from the source locale | >1 locale | `arch-tests/i18n-parity.mjs` |
| Review-routing policy | sensitive paths reviewed in the light lane; unknown authors passing | review lanes | `ci/review-routing/` |

## 3. Custom lint

| Rule | Prevents | Signal | Template |
|---|---|---|---|
| Layer boundaries (default disallow) | imports that break the architecture | identifiable layers | `lint/eslint.config.snippet.mjs` |
| No import cycles | cycles that break bundling/initialization | medium+ codebase | snippet |
| SDK gateway (`no-restricted-imports`) | analytics/AI/monitoring SDKs used outside their consent-aware or wrapped module | wrappers exist | snippet |
| `import-only-from` (follows barrels) | native/heavy deps reaching bundles that cannot load them | native deps + serverless/edge | `lint/eslint.local-rules.mjs` |
| `require-test-file` | key layers without colocated tests | tests colocated by convention | local rules |
| `catch-must-report` | swallowed errors | error monitoring configured | local rules |
| `must-use-wrapper` | raw API calls bypassing the house wrapper | house wrapper exists | local rules |
| `registry-path-exists` | registry entries pointing to missing files | registries in code | local rules |
| No literal UI strings / no console | untranslated UI, logs bypassing the logger | i18n / logger modules | snippet |

Roll out as `warn`, flip to `error` once clean.

## 4. CI

| Job | Prevents | Signal | Template |
|---|---|---|---|
| AI-config sync (`rulesync:check`) | hand-edited generated agent files drifting from source | rulesync | `ci/ci.yml` |
| Lint + typecheck + tests (changed on PR, full on push) | regressions | always | `ci/ci.yml` |
| Parity checks (i18n, env docs) | registry drift | the registries exist | `ci/ci.yml` |
| PR preflight strict | secrets and heavy binaries merged | always | `ci/ci.yml` |
| Branch-policy guard (`pull_request_target`) | PRs into release branches from the wrong source | release branches | `ci/branch-policy-guard.yml` |
| Migration contract gate | schema removals without a tracked contract step | schema migrations | `ci/migration-contract-gate.yml` |
| Review routing + PR template lane | flow-sensitive changes reviewed lightly | PR workflow | `ci/review-routing/`, `ci/pull_request_template.md` |

## 5. Automations

| Automation | Prevents | Signal | Template |
|---|---|---|---|
| Workspace setup script (deps, codegen, index in background, copy index from main checkout) | agents working without the index or generated code | worktree-based workflow | `automations/workspace-setup.sh` |
| Release promotion (dev → stage → main, fast-forward, smoke test, deployed-commit check) | hotfixes lost, wrong commit deployed | multi-environment deploys | `automations/release-flow.md` |
| Contract issue on migration merge | expand/migrate/contract never contracted | schema migrations | `ci/` + `automations/release-flow.md` |
| Vendored-skill version check | stale or unpinned vendored skills | vendored skills | `automations/check-vendored.mjs` |
| Code-index refresh on stop | stale index | code index | hook |

## 6. Permissions (layered)

| Layer | Contents |
|---|---|
| deny | approving PRs; mutating `gh api` flags (`-f/-F/--field/--input/-X POST…`); reading `.env*`, keys, certificates; build/vendor dirs |
| ask | destructive git, recursive delete, deploys, secrets CLIs, publishing, merging, force-kill, sudo, comments/reviews |
| allow | read-only `gh`, tests, lint, typecheck, formatter check |

Permissions are the first layer; the hooks are the second (they catch shapes globs miss).
Template: `rulesync/permissions.jsonc`.

## 7. Registries

| Registry | Read by | Template |
|---|---|---|
| `side-effect-registry.md` (trigger + search per row; grows by one row per escaped bug) | plan-feature, plan reviewer | `registries/side-effect-registry.md` |
| `blueprint.md` (inventory of agents, skills, hooks, lint, CI, test kinds; updated in the same PR) | everyone | `registries/blueprint.md` |
| `environment-variables.md` (every var, where consumed, per environment) | env-docs hook | `registries/environment-variables.md` |
| Compliance inventory (data, vendors, retention vs published legal texts) | compliance check | write per project |
