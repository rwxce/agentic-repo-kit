# Guardrail catalog

Every row is a pattern proven in a production project, generalized. Columns: what it is · what it
prevents · the repo signal that justifies it · blocking (B) / ask (Q) / advisory (A) · template ·
**when not** (the repo situation where the row costs more than it saves: leave it out and say so)
· **origin** (the concept card in `concepts/` that explains the pattern, its check and its limits;
"no card" means it comes from the same project but has no card yet).
Templates are in `templates/` (see `templates/README.md`).

## 1. Hooks

| Hook | Event | Prevents | Signal | B/Q/A | Template | When not | Origin |
|---|---|---|---|---|---|---|---|
| Outward-writes blocker | PreToolUse Bash | agent approving PRs, mutating `gh api`/GraphQL, curl writes to review/comment endpoints | GitHub PR workflow | **B**, fail-closed | `hooks/block-outward-writes.mjs` | the agent has no GitHub credentials at all | [review-lanes](concepts/review-lanes.md) |
| Protected-branch guard | PreToolUse Bash | a parallel agent's cleanup step deleting, renaming, force-pushing or resetting a long-lived branch or removing its worktree; history rewrites while sitting on a base branch | parallel agents / worktrees; long-lived branches | **B** | `hooks/protect-branches.mjs` | one checkout, no parallel agents, no long-lived branches besides the default | [agent-guardrail-hooks](concepts/agent-guardrail-hooks.md) |
| Dangerous-command gate | PreToolUse Bash | recursive delete, force push, push to protected branches, reset --hard, rebase, deploys, secrets CLIs, raw-disk writes, `curl \| sh`, SQL DROP/DELETE without WHERE | always (deploy and secrets-CLI lists ship empty: fill them from the repo) | **Q** with preview of what would change | `hooks/guard-dangerous-commands.mjs` | never skipped; trim the lists so read-only commands stay unprompted | [agent-guardrail-hooks](concepts/agent-guardrail-hooks.md) |
| Feature-intent router | UserPromptSubmit | feature work starting without the planning protocol | plan-feature skill proposed (patterns per language; English on by default) | A | `hooks/detect-feature-intent.mjs` | no plan-feature skill; repos with one small domain | [planning-gate](concepts/planning-gate.md) |
| Correction capture | UserPromptSubmit | the same correction repeating across sessions | always | A | `hooks/detect-correction.mjs` | hosts without prompt hooks (use the root-rule section instead) | [corrections-become-rules](concepts/corrections-become-rules.md) |
| Session status | SessionStart | planning skipped on fresh branches; stale/missing code index (index path and install hint are config) | always | A | `hooks/session-start-status.mjs` | short one-off sessions with no plans and no index | [planning-gate](concepts/planning-gate.md) |
| Index reminder | PreToolUse Grep/Glob | agents re-reading code instead of querying the index | a code index exists | A, once per session | `hooks/index-reminder.mjs` | no code index, or a repo small enough that search is complete | [code-graph-navigation](concepts/code-graph-navigation.md) |
| Index refresh | Stop | a code index going stale after edits, so agents trust an outdated map | a code index exists | A | `hooks/index-refresh.mjs` | no code index | [code-graph-navigation](concepts/code-graph-navigation.md) |
| Session hand off | Stop + PreCompact / SessionStart | a new chat or a compacted session losing branch state, the active plan and pending items, then redoing or contradicting earlier work | long sessions; work resumed across chats or worktrees | A | `hooks/save-handoff.mjs`, `hooks/load-handoff.mjs` | short sessions that never resume | [session-handoff](concepts/session-handoff.md) |
| Lint if changed | Stop | lint errors left at end of turn | linter configured | A | `hooks/lint-if-changed.mjs` | no linter, or lint slower than a turn (run it in CI only) | [layer-boundaries-as-lint](concepts/layer-boundaries-as-lint.md) |
| Env-docs parity | Stop | new env var with no documentation | env registry doc | A | `hooks/check-env-docs.mjs` | no env registry doc yet (write the doc first) | [change-completeness-preflight](concepts/change-completeness-preflight.md) |
| Compliance tripwire | Stop | silent new tracking, cookies/storage, outbound calls, consent bypass | personal data / legal pages | A | `hooks/compliance-tripwire.mjs` | no personal data, no analytics, no published legal texts | [compliance-by-evidence](concepts/compliance-by-evidence.md) |
| Branch-policy tripwire | Stop | local commits on protected branches | protected branches | A | `hooks/branch-policy.mjs` | single-branch workflow with direct commits by design | [gated-release-pipeline](concepts/gated-release-pipeline.md) |
| PR preflight | Stop (A) / CI (B) | committed `.env*`, `.env` dropped from .gitignore, heavy binaries; (A only) a flow-sensitive diff with no fresh independent-review seal | always | A / **B** | `hooks/pr-preflight.mjs` | never skipped (cheap); the review-seal warning only applies with review lanes | [change-completeness-preflight](concepts/change-completeness-preflight.md) |
| Process cleanup | SessionEnd | orphan dev servers exhausting the machine | parallel worktrees / dev servers | — | inline command | no long-running dev servers | no card |
| Precheck seal (CLI) | used by skills | the same scope precheck re-run on an unchanged diff, or skipped after the diff changed | pr-scope skill | — | `hooks/pr-precheck-seal.mjs` | no pr-scope skill | [review-lanes](concepts/review-lanes.md) |
| Independent-review seal (CLI) | used by skills | a flow-sensitive PR opened with only the author session's self-check, or reviewed on a diff that changed afterwards | review lanes with a fresh-context reviewer | — | `hooks/review-seal.mjs` | a human reviewer reviews every flow-sensitive PR | [review-lanes](concepts/review-lanes.md) |

**Lesson learned:** resolve hook scripts with `${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}`.
`git rev-parse` alone breaks inside nested repos or submodules, and a fail-closed hook that cannot
find its script blocks every shell call. Only the outward-writes hook should be fail-closed.
Every hook ships with tests; hooks run in CI tests like any other code.

## 2. Architecture tests

| Test | Prevents | Signal | Template | When not | Origin |
|---|---|---|---|---|---|
| Directory ↔ registry parity | a new protected page/handler/module not registered (e.g. auth middleware prefixes) | a registry that must list every dir of a kind | `arch-tests/dir-registry-parity.test.ts` | the framework derives the registry from the file system itself | [default-deny-routes](concepts/default-deny-routes.md) |
| Registry ↔ filesystem | registered routes/paths pointing nowhere | central routes/paths file | `arch-tests/route-registry-exists.test.ts` | typed routes generated from the file tree | [route-registry](concepts/route-registry.md) |
| Content ↔ assets | posts/demos referencing missing images, feeds missing entries | content collections | `arch-tests/content-assets-exist.test.ts` | content lives in a CMS that validates its own references | no card |
| Unique codes | duplicate error/event codes across groups | error-code or event catalogs | `arch-tests/unique-codes.test.ts` | one enum or union per vocabulary where the compiler already rejects duplicates | [typed-errors](concepts/typed-errors.md) |
| i18n key parity | locales drifting from the source locale | >1 locale | `arch-tests/i18n-parity.mjs` | a single locale | no card |
| Review-routing policy | sensitive paths reviewed in the light lane; unknown authors passing | review lanes | `ci/review-routing/` | every PR gets the same full review by choice | [review-lanes](concepts/review-lanes.md) |

## 3. Custom lint

| Rule | Prevents | Signal | Template | When not | Origin |
|---|---|---|---|---|---|
| Layer boundaries (default disallow) | imports that break the architecture | identifiable layers | `lint/eslint.config.snippet.mjs` | a single-module codebase | [layer-boundaries-as-lint](concepts/layer-boundaries-as-lint.md) |
| No import cycles | cycles that break bundling/initialization | medium+ codebase | snippet | tiny codebases; generated code | [layer-boundaries-as-lint](concepts/layer-boundaries-as-lint.md) |
| SDK gateway (`no-restricted-imports`) | analytics/AI/monitoring SDKs used outside their consent-aware or wrapped module | wrappers exist | snippet | no wrapper exists yet (write the wrapper first) | [every-catch-reports](concepts/every-catch-reports.md) |
| `import-only-from` (follows barrels) | native/heavy deps reaching bundles that cannot load them | native deps + serverless/edge | `lint/eslint.local-rules.mjs` | a long-running server on a known OS and architecture | [native-binaries-in-workers](concepts/native-binaries-in-workers.md) |
| `require-test-file` | key layers without colocated tests | tests colocated by convention | local rules | layers covered by integration tests elsewhere; it checks that a file exists, not coverage | [layer-boundaries-as-lint](concepts/layer-boundaries-as-lint.md) |
| `catch-must-report` | swallowed errors | error monitoring configured | local rules | no error monitoring configured | [every-catch-reports](concepts/every-catch-reports.md) |
| `must-use-wrapper` | raw API calls bypassing the house wrapper | house wrapper exists | local rules | no house wrapper | [single-client-read-gateway](concepts/single-client-read-gateway.md) |
| `registry-path-exists` | registry entries pointing to missing files | registries in code | local rules | registries generated from the file system | [route-registry](concepts/route-registry.md) |
| No literal UI strings / no console | untranslated UI, logs bypassing the logger | i18n / logger modules | snippet | single-locale internal tools; CLIs whose console output is the product | no card |

Roll out as `warn`, flip to `error` once clean.

## 4. CI

| Job | Prevents | Signal | Template | When not | Origin |
|---|---|---|---|---|---|
| AI-config sync (`rulesync:check`) | hand-edited generated agent files drifting from source | rulesync | `ci/ci.yml` | one agent tool with native files only | [generated-agent-config](concepts/generated-agent-config.md) |
| Lint + typecheck + tests (changed on PR, full on push) | regressions | always | `ci/ci.yml` | never skipped; scale to changed-only for speed | [guard-tests](concepts/guard-tests.md) |
| Parity checks (i18n, env docs) | registry drift | the registries exist | `ci/ci.yml` | the registries do not exist | [change-completeness-preflight](concepts/change-completeness-preflight.md) |
| PR preflight strict | secrets and heavy binaries merged | always | `ci/ci.yml` | never skipped (cheap) | [change-completeness-preflight](concepts/change-completeness-preflight.md) |
| Branch-policy guard (`pull_request_target`) | PRs into release branches from the wrong source | release branches | `ci/branch-policy-guard.yml` | single-branch deploys | [gated-release-pipeline](concepts/gated-release-pipeline.md) |
| Migration contract gate | schema removals without a tracked contract step | schema migrations | `ci/migration-contract-gate.yml` | no persisted schema, or no live data yet | [expand-migrate-contract](concepts/expand-migrate-contract.md) |
| Contract issue on merge | a merged expand/migrate step whose contract (drop the old field) is never scheduled, so dead schema lives forever | schema migrations | `ci/contract-issue.yml` | no persisted schema, or no live data yet | [expand-migrate-contract](concepts/expand-migrate-contract.md) |
| Plan-folder gate + stale check | multi-PR plan folders left behind after the initiative ships, or closed without promoting what must outlive them | `docs/plans/` initiatives | `ci/plan-folder/` | initiatives fit in one PR | [planning-gate](concepts/planning-gate.md) |
| Post-deploy smoke | a deploy that builds green but fails at runtime, shipped without anyone hitting it | deployed environments | `ci/smoke-deploy.yml` + `automations/smoke-deploy.mjs` | nothing is deployed (libraries, CLIs) | [gated-release-pipeline](concepts/gated-release-pipeline.md) |
| Skill lint | skills with no description (never routed to) or oversized ones that cost context every session | own skills | `automations/check-skills.mjs` | no own skills | [generated-agent-config](concepts/generated-agent-config.md) |
| Skill-routing pack | a prompt-router regex or a skill description edit silently breaking which skill a request reaches | routing hooks + own skills | `automations/skill-routing.*` | no prompt-routing hooks | [planning-gate](concepts/planning-gate.md) |
| Dependency families | packages of one family drifting to mismatched versions that break at runtime | multi-package SDKs | `automations/check-dependency-families.mjs` | no multi-package SDKs | [supply-chain-hygiene](concepts/supply-chain-hygiene.md) |
| Review routing + PR template lane | flow-sensitive changes reviewed lightly | PR workflow | `ci/review-routing/`, `ci/pull_request_template.md` | every PR gets the same full review by choice | [review-lanes](concepts/review-lanes.md) |

## 5. Automations

| Automation | Prevents | Signal | Template | When not | Origin |
|---|---|---|---|---|---|
| Workspace setup script (deps, codegen, index in background, copy index from main checkout) | agents working without the index or generated code | worktree-based workflow | `automations/workspace-setup.sh` | one checkout, no worktrees | [code-graph-navigation](concepts/code-graph-navigation.md) |
| Release promotion (dev → stage → main, fast-forward, smoke test, deployed-commit check) | hotfixes lost, wrong commit deployed | multi-environment deploys | `automations/release-flow.md` | one environment | [gated-release-pipeline](concepts/gated-release-pipeline.md) |
| Contract issue on migration merge | expand/migrate/contract never contracted | schema migrations | `ci/contract-issue.yml` + `automations/release-flow.md` | no persisted schema, or no live data yet | [expand-migrate-contract](concepts/expand-migrate-contract.md) |
| Vendored-skill version check | stale or unpinned vendored skills | vendored skills | `automations/check-vendored.mjs` | no vendored skills | [supply-chain-hygiene](concepts/supply-chain-hygiene.md) |
| Code-index refresh on stop | stale index | code index | `hooks/index-refresh.mjs` | no code index | [code-graph-navigation](concepts/code-graph-navigation.md) |

## 6. Permissions (layered)

| Layer | Contents | When not | Origin |
|---|---|---|---|
| deny | approving PRs; mutating `gh api` flags (`-f/-F/--field/--input/-X POST…`); reading `.env*`, keys, certificates; build/vendor dirs | never skipped; trim to what the repo has | [agent-guardrail-hooks](concepts/agent-guardrail-hooks.md) |
| ask | destructive git, recursive delete, deploys, secrets CLIs, publishing, merging, force-kill, sudo, comments/reviews | never skipped; keep reversible read-only commands out of it | [agent-guardrail-hooks](concepts/agent-guardrail-hooks.md) |
| allow | read-only `gh`, tests, lint, typecheck, formatter check | never skipped | [agent-guardrail-hooks](concepts/agent-guardrail-hooks.md) |

Permissions are the first layer; the hooks are the second (they catch shapes globs miss).
Template: `rulesync/permissions.jsonc`.

## 7. Registries

| Registry | Read by | Template | When not | Origin |
|---|---|---|---|---|
| `side-effect-registry.md` (trigger + search per row; grows by one row per escaped bug) | plan-feature, plan reviewer | `registries/side-effect-registry.md` | one small domain with no cross-cutting effects yet | [planning-gate](concepts/planning-gate.md) |
| `blueprint.md` (inventory of agents, skills, hooks, lint, CI, test kinds; updated in the same PR) | everyone | `registries/blueprint.md` | fewer than a handful of agent artifacts | [generated-agent-config](concepts/generated-agent-config.md) |
| `environment-variables.md` (every var, where consumed, per environment) | env-docs hook | `registries/environment-variables.md` | no environment variables beyond framework defaults | [change-completeness-preflight](concepts/change-completeness-preflight.md) |
| `use-case-matrix.md` (state axes, transitions, named product rules; review findings are checked against the rules) | plan-feature, pr-triage, reviewers | `registries/use-case-matrix.md` | behaviour does not depend on user state | [planning-gate](concepts/planning-gate.md) |
| Compliance inventory (data, vendors, retention vs published legal texts) | compliance check | write per project | no personal data | [compliance-by-evidence](concepts/compliance-by-evidence.md) |

## 8. Planning and review protocol

| Piece | Prevents | Signal | Template | When not | Origin |
|---|---|---|---|---|---|
| Decision log for Clarifications | approved points re-litigated or silently lost when a plan is revised | plans discussed over several turns | `rules/root.md`, `skills/plan-feature/` | plans approved in one turn | [planning-gate](concepts/planning-gate.md) |
| Evidence before architecture (verified / read / assumed / refuted / accepted) | schemas and roadmaps built on a doc claim nobody checked | integrations, unfamiliar tech | `skills/plan-feature/references/evidence-and-spikes.md` | changes inside well-known code with no new technology | [planning-gate](concepts/planning-gate.md) |
| Feasibility spikes gated per spike id, confined to `.context/spike/<id>/` | "quick experiments" that install, connect or spend without consent | any plan with an unresolved critical hypothesis | `rules/root.md`, `evidence-and-spikes.md` | no unresolved critical hypothesis | [planning-gate](concepts/planning-gate.md) |
| Plan folders for multi-PR initiatives | context scattered across PRs; plans that outlive the work | initiatives spanning several PRs | `skills/plan-feature/references/plan-folder.md`, `ci/plan-folder/` | initiatives fit in one PR | [planning-gate](concepts/planning-gate.md) |
| Diagram / method / readability pickers | walls of text nobody reviews; the wrong analysis method for the question | big plans | `skills/plan-feature/references/` | small and normal plans | no card |
| Use-case table per plan | behaviour that depends on user state changed for one state and broken for another, or across a transition | state-dependent features | `registries/use-case-matrix.md` | behaviour does not depend on user state | [planning-gate](concepts/planning-gate.md) |
| Scope freeze + follow-up routing | a PR growing to absorb every review finding until it is unreviewable | review-heavy PR flow | `skills/pr-scope/`, `commands/pr-triage.md` | small PRs that rarely get review findings | no card |
| Requirements interview | a plan built on silently invented requirements | underspecified asks | `skills/interview-me/` | asks that already state who, why, success and the binding constraint | no card |
| Review type `independent \| self-check` + seal | the author session's own review passed off as the independent look | flow-sensitive lane | `skills/pr-review/`, `hooks/review-seal.mjs` | a human reviewer reviews every flow-sensitive PR | [review-lanes](concepts/review-lanes.md) |
| Evidence-stamped final message (sha, clean/dirty, passed/failed/blocked/not run) | "verified" claims about a different commit, or evidence reused after the code changed | verify-integration in use | `skills/verify-integration/` | no verify-integration skill | no card |
| Hazard search + "mitigation is not root cause" | a symptom patched while the same hazard stays live elsewhere | debugging skill in use | `skills/debugging/` | no debugging skill | no card |
