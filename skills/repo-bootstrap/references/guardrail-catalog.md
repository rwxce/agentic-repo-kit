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
| Dangerous-command gate | PreToolUse Bash | recursive delete, force push, push to protected branches, reset --hard, rebase, deploys, secrets CLIs, raw-disk writes, `curl \| sh`, SQL DROP/DELETE without WHERE | always (deploy and secrets-CLI lists ship empty: fill them from the repo) | **Q** with preview of what would change | `hooks/guard-dangerous-commands.mjs` | Always applies; trim the lists so read-only commands stay unprompted | [agent-guardrail-hooks](concepts/agent-guardrail-hooks.md) |
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
| PR preflight | Stop (A) / CI (B) | committed `.env*`, `.env` dropped from .gitignore, heavy binaries; (A only) a flow-sensitive diff with no fresh independent-review seal | always | A / **B** | `hooks/pr-preflight.mjs` | Always applies (cheap); the review-seal warning only applies with review lanes | [change-completeness-preflight](concepts/change-completeness-preflight.md) |
| Unicode firewall (machine-wide) | UserPromptSubmit + PostToolUse / PostToolUseFailure `*` | prompt injection hidden in invisible characters (Unicode Tags, bidi controls, zero-width) inside tool output or a pasted prompt; look-alike Latin words (warn) | agents read untrusted text: web, issues, MCP output, third-party skills | **B** on prompts with Tags/bidi; strips tool output; A otherwise; fails open | `hooks/unicode-firewall.mjs` + `hooks/install-unicode-firewall.mjs` | agents never read untrusted text (no web, issues, MCP output or third-party skills) | [supply-chain-hygiene](concepts/supply-chain-hygiene.md) |
| OpenCode shims (plugins) | `tool.execute.before` / `session.idle` / compaction | on OpenCode, "ask" guards running unchallenged (a plugin cannot ask) and hand offs saved without the pending block or context warning | OpenCode among the agent tools | **B** (rejects) / A | `hooks/opencode/` | OpenCode is not among the agent tools | [agent-guardrail-hooks](concepts/agent-guardrail-hooks.md) |
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
| UI surfaces inventory | a new page or overlay missing from the inventory (responsive reviews start incomplete), or rows citing deleted files | many pages and overlays; responsive bugs on unchecked sizes | `arch-tests/ui-surfaces-inventory.mjs` + `registries/ui-surfaces.md` | a handful of pages and no overlays | [layout-guard-and-ui-inventory](concepts/layout-guard-and-ui-inventory.md) |
| i18n key parity | locales drifting from the source locale | >1 locale | `arch-tests/i18n-parity.mjs` | a single locale | no card |
| Job-leak guard (test setup) | a test leaving scheduled jobs pending, hidden by global fake timers or surfacing later as a flake in an unrelated file | in-memory test backends with a scheduler or queue; flakes that move between files | `test-guards/job-leak-guard.mjs` | no scheduler or queue in the test backend | [durable-jobs](concepts/durable-jobs.md) |
| Layout guard (Playwright: overflow at fixed widths + width sweep) | horizontal scroll, text off screen or clipped, colliding nav controls, items flickering while resizing; none visible to jsdom | responsive UI, translated strings, collapsing nav | `test-guards/layout/` | no responsive UI (APIs, CLIs, desktop-only internal tools) | [layout-guard-and-ui-inventory](concepts/layout-guard-and-ui-inventory.md) |
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
| Restrictions-still-fire test | a later flat-config block replacing a restriction list, an `ignores` glob or a renamed folder silently switching a gateway rule off while lint stays green | restriction rules acting as gateways, more than one config block per file | `lint/lint-restrictions.lint.test.mjs` | no restriction rules acting as gateways, or one config block per file | [single-client-read-gateway](concepts/single-client-read-gateway.md) |

Roll out as `warn`, flip to `error` once clean.

## 4. CI

| Job | Prevents | Signal | Template | When not | Origin |
|---|---|---|---|---|---|
| AI-config sync (`rulesync:check`) | hand-edited generated agent files drifting from source | rulesync | `ci/ci.yml` | one agent tool with native files only | [generated-agent-config](concepts/generated-agent-config.md) |
| Lint + typecheck + tests (changed on PR, full on push) | regressions | always | `ci/ci.yml` | Always applies; scale to changed-only for speed | [guard-tests](concepts/guard-tests.md) |
| Guard tests on every PR (`list-guard-tests`) | a guard test that reads files from disk never selected by changed-only runs, so the PR it should fail goes green | changed-only tests on PRs | `ci/ci.yml`, `ci/list-guard-tests.mjs` | CI already runs the full suite on every PR | [guard-tests](concepts/guard-tests.md) |
| Real deploy artifact (`check-deploy-artifact`) | a deploy that builds green and crashes on its first run: imports that only resolve after codegen, packages that read files next to their JS and break once bundled | a deploy that bundles code itself with no CI-usable dry run; native or file-reading packages | `ci/check-deploy-artifact.mjs`, `ci/ci.yml` | the deploy tool has a CI dry run that builds the real artifact | [native-binaries-in-workers](concepts/native-binaries-in-workers.md) |
| Parity checks (i18n, env docs) | registry drift | the registries exist | `ci/ci.yml` | the registries do not exist | [change-completeness-preflight](concepts/change-completeness-preflight.md) |
| PR preflight strict | secrets and heavy binaries merged | always | `ci/ci.yml` | Always applies (cheap) | [change-completeness-preflight](concepts/change-completeness-preflight.md) |
| Branch-policy guard (`pull_request_target`) | PRs into release branches from the wrong source | release branches | `ci/branch-policy-guard.yml` | single-branch deploys | [gated-release-pipeline](concepts/gated-release-pipeline.md) |
| Migration contract gate | schema removals without a tracked contract step | schema migrations | `ci/migration-contract-gate.yml` | no persisted schema, or no live data yet | [expand-migrate-contract](concepts/expand-migrate-contract.md) |
| Contract issue on merge | a merged expand/migrate step whose contract (drop the old field) is never scheduled, so dead schema lives forever | schema migrations | `ci/contract-issue.yml` | no persisted schema, or no live data yet | [expand-migrate-contract](concepts/expand-migrate-contract.md) |
| Contract ready after the prod migration | a contract issue left open long after its migration finished, or a destructive contract PR opened before the migration succeeded | schema migrations run by the production deploy | `ci/mark-ready-contracts.mjs` | no schema migrations run by the deploy | [expand-migrate-contract](concepts/expand-migrate-contract.md) |
| Plan-folder gate + stale check | multi-PR plan folders left behind after the initiative ships, or closed without promoting what must outlive them | `docs/plans/` initiatives | `ci/plan-folder/` | initiatives fit in one PR | [planning-gate](concepts/planning-gate.md) |
| Post-deploy smoke | a deploy that builds green but fails at runtime, shipped without anyone hitting it | deployed environments | `ci/smoke-deploy.yml` + `automations/smoke-deploy.mjs` | nothing is deployed (libraries, CLIs) | [gated-release-pipeline](concepts/gated-release-pipeline.md) |
| Prune stale branches (weekly) | dead remote branches piling up (closed-PR heads, PR-less pushes) so nobody can tell what is live | many short-lived agent branches | `ci/prune-stale-branches.yml` | few branches, deleted on merge by the host setting | [gated-release-pipeline](concepts/gated-release-pipeline.md) |
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
| Update bot with a release-age gate (Renovate + pnpm `minimumReleaseAge`, kept equal by `check-release-age`) | a compromised release reaching node_modules through a bot PR or an agent install before it is pulled; ranges moving the lockfile without review; bot PRs red because the install refuses their version | lockfile + agents running installs | `automations/renovate.json5`, `automations/pnpm-workspace.snippet.yaml`, `automations/check-release-age.mjs` | no lockfile and no third-party dependencies | [supply-chain-hygiene](concepts/supply-chain-hygiene.md) |
| Vendored-skill version check | stale or unpinned vendored skills | vendored skills | `automations/check-vendored.mjs` | no vendored skills | [supply-chain-hygiene](concepts/supply-chain-hygiene.md) |
| Code-index refresh on stop | stale index | code index | `hooks/index-refresh.mjs` | no code index | [code-graph-navigation](concepts/code-graph-navigation.md) |

## 6. Permissions (layered)

| Layer | Contents | When not | Origin |
|---|---|---|---|
| deny | approving PRs; mutating `gh api` flags (`-f/-F/--field/--input/-X POST…`); reading `.env*`, keys, certificates; build/vendor dirs | Always applies; trim to what the repo has | [agent-guardrail-hooks](concepts/agent-guardrail-hooks.md) |
| ask | destructive git, recursive delete, deploys, secrets CLIs, publishing, merging, force-kill, sudo, comments/reviews, third-party installs (`git clone`, MCP/plugin/skill adds, `pip`/`uv tool install`) so they go through quarantine first | Always applies; keep reversible read-only commands out of it | [agent-guardrail-hooks](concepts/agent-guardrail-hooks.md) |
| allow | read-only `gh`, tests, lint, typecheck, formatter check | Always applies | [agent-guardrail-hooks](concepts/agent-guardrail-hooks.md) |

Permissions are the first layer; the hooks are the second (they catch shapes globs miss).
Template: `rulesync/permissions.jsonc`.

## 7. Registries

| Registry | Read by | Template | When not | Origin |
|---|---|---|---|---|
| `side-effect-registry.md` (trigger + search per row; grows by one row per escaped bug) | plan-feature, plan reviewer | `registries/side-effect-registry.md` | one small domain with no cross-cutting effects yet | [planning-gate](concepts/planning-gate.md) |
| `blueprint.md` (inventory of agents, skills, hooks, lint, CI, test kinds; updated in the same PR) | everyone | `registries/blueprint.md` | fewer than a handful of agent artifacts | [generated-agent-config](concepts/generated-agent-config.md) |
| `environment-variables.md` (every var, where consumed, per environment) | env-docs hook | `registries/environment-variables.md` | no environment variables beyond framework defaults | [change-completeness-preflight](concepts/change-completeness-preflight.md) |
| `use-case-matrix.md` (state axes, transitions, named product rules; review findings are checked against the rules) | plan-feature, pr-triage, reviewers | `registries/use-case-matrix.md` | behaviour does not depend on user state | [planning-gate](concepts/planning-gate.md) |
| `ui-surfaces.md` (every page and overlay, behaviour per breakpoint, last verified; guarded by `arch-tests/ui-surfaces-inventory.mjs`) | UI implementer, reviewers, width sweeps | `registries/ui-surfaces.md` | a handful of pages and no overlays | [layout-guard-and-ui-inventory](concepts/layout-guard-and-ui-inventory.md) |
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
| PR creation command (`/pr-make`) | PRs opened against the wrong base, without the precheck, with unrelated commits, an empty diagram or invented evidence | agents open PRs | `commands/pr-make.md` | people open every PR by hand | [review-lanes](concepts/review-lanes.md) |
| Sync command (`/sync-dev`) | local work lost by a bare stash/pop shared across worktrees, upstream behaviour dropped to clear a conflict, a rebase of a pushed branch | long-lived branches, parallel worktrees | `commands/sync-dev.md` | one checkout, short-lived branches merged quickly | no card |
| Cleanup command (`/git-clean`) | branch and worktree sprawl cleaned by hand, deleting someone's active branch | many agent branches and worktrees | `commands/git-clean.md` + `hooks/protect-branches.mjs` | few branches and no extra worktrees | [agent-guardrail-hooks](concepts/agent-guardrail-hooks.md) |
| Requirements interview | a plan built on silently invented requirements | underspecified asks | `skills/interview-me/` | asks that already state who, why, success and the binding constraint | no card |
| Review type `independent \| self-check` + seal | the author session's own review passed off as the independent look | flow-sensitive lane | `skills/pr-review/`, `hooks/review-seal.mjs` | a human reviewer reviews every flow-sensitive PR | [review-lanes](concepts/review-lanes.md) |
| Evidence-stamped final message (sha, clean/dirty, passed/failed/blocked/not run) | "verified" claims about a different commit, or evidence reused after the code changed | verify-integration in use | `skills/verify-integration/` | no verify-integration skill | no card |
| Hazard search + "mitigation is not root cause" | a symptom patched while the same hazard stays live elsewhere | debugging skill in use | `skills/debugging/` | no debugging skill | no card |
| Per-step validation by use case (happy, failure, legacy data) | a step built on an earlier one that was never checked; everything found broken at the end | any implementation | `rules/root.md` | Always applies; scale the depth to the step | [planning-gate](concepts/planning-gate.md) |
| Findings recap at the end of every progress message | findings and pending decisions buried in earlier messages of a long run | loops, multi-step runs | `rules/root.md` | single-message tasks | no card |
| Third-party quarantine (read in `.context/quarantine/`, install is an `ask`) | a skill, MCP or repo installed with hooks or scripts nobody read | any third-party install | `rules/root.md`, `rulesync/permissions.jsonc` | Always applies when anything third-party is installed | [supply-chain-hygiene](concepts/supply-chain-hygiene.md) |
| Reflect escalates to a check (ladder, class-level on the second repeat, red first, shrink-only baseline, expiring exceptions, prune mode) | a correction written as prose that the next session ignores again | any repo with custom checks | `skills/reflect/`, `skills/reflect/references/checks.md` | no custom checks yet (start with prose rules) | [corrections-become-rules](concepts/corrections-become-rules.md) |
