# Guardrail catalog

Every row is a pattern proven in a production project, generalized. Columns: what it is · what it
prevents · the repo signal that justifies it · blocking (B) / ask (Q) / advisory (A) · template.
Templates are in `templates/` (see `templates/README.md`).

## 1. Hooks

| Hook | Event | Prevents | Signal | B/Q/A | Template |
|---|---|---|---|---|---|
| Outward-writes blocker | PreToolUse Bash | agent approving PRs, mutating `gh api`/GraphQL, curl writes to review/comment endpoints | GitHub PR workflow | **B**, fail-closed | `hooks/block-outward-writes.mjs` |
| Protected-branch guard | PreToolUse Bash | a parallel agent's cleanup step deleting, renaming, force-pushing or resetting a long-lived branch or removing its worktree; history rewrites while sitting on a base branch | parallel agents / worktrees; long-lived branches | **B** | `hooks/protect-branches.mjs` |
| Dangerous-command gate | PreToolUse Bash | recursive delete, force push, push to protected branches, reset --hard, rebase, deploys, secrets CLIs, raw-disk writes, `curl | sh`, SQL DROP/DELETE without WHERE | always (deploy and secrets-CLI lists ship empty: fill them from the repo) | **Q** with preview of what would change | `hooks/guard-dangerous-commands.mjs` |
| Feature-intent router | UserPromptSubmit | feature work starting without the planning protocol | plan-feature skill proposed (patterns per language; English on by default) | A | `hooks/detect-feature-intent.mjs` |
| Correction capture | UserPromptSubmit | the same correction repeating across sessions | always | A | `hooks/detect-correction.mjs` |
| Session status | SessionStart | planning skipped on fresh branches; stale/missing code index (index path and install hint are config) | always | A | `hooks/session-start-status.mjs` |
| Index reminder | PreToolUse Grep/Glob | agents re-reading code instead of querying the index | a code index exists | A, once per session | `hooks/index-reminder.mjs` |
| Index refresh | Stop | a code index going stale after edits, so agents trust an outdated map | a code index exists | A | `hooks/index-refresh.mjs` |
| Session hand off | Stop + PreCompact / SessionStart | a new chat or a compacted session losing branch state, the active plan and pending items, then redoing or contradicting earlier work | long sessions; work resumed across chats or worktrees | A | `hooks/save-handoff.mjs`, `hooks/load-handoff.mjs` |
| Lint if changed | Stop | lint errors left at end of turn | linter configured | A | `hooks/lint-if-changed.mjs` |
| Env-docs parity | Stop | new env var with no documentation | env registry doc | A | `hooks/check-env-docs.mjs` |
| Compliance tripwire | Stop | silent new tracking, cookies/storage, outbound calls, consent bypass | personal data / legal pages | A | `hooks/compliance-tripwire.mjs` |
| Branch-policy tripwire | Stop | local commits on protected branches | protected branches | A | `hooks/branch-policy.mjs` |
| PR preflight | Stop (A) / CI (B) | committed `.env*`, `.env` dropped from .gitignore, heavy binaries; (A only) a flow-sensitive diff with no fresh independent-review seal | always | A / **B** | `hooks/pr-preflight.mjs` |
| Unicode firewall (machine-wide) | UserPromptSubmit + PostToolUse / PostToolUseFailure `*` | prompt injection hidden in invisible characters (Unicode Tags, bidi controls, zero-width) inside tool output or a pasted prompt; look-alike Latin words (warn) | agents read untrusted text: web, issues, MCP output, third-party skills | **B** on prompts with Tags/bidi; strips tool output; A otherwise; fails open | `hooks/unicode-firewall.mjs` + `hooks/install-unicode-firewall.mjs` |
| Process cleanup | SessionEnd | orphan dev servers exhausting the machine | parallel worktrees / dev servers | — | inline command |
| Precheck seal (CLI) | used by skills | the same scope precheck re-run on an unchanged diff, or skipped after the diff changed | pr-scope skill | — | `hooks/pr-precheck-seal.mjs` |
| Independent-review seal (CLI) | used by skills | a flow-sensitive PR opened with only the author session's self-check, or reviewed on a diff that changed afterwards | review lanes with a fresh-context reviewer | — | `hooks/review-seal.mjs` |

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
| Guard tests on every PR (`list-guard-tests`) | a guard test that reads files from disk never selected by changed-only runs, so the PR it should fail goes green | changed-only tests on PRs | `ci/ci.yml`, `ci/list-guard-tests.mjs` |
| Parity checks (i18n, env docs) | registry drift | the registries exist | `ci/ci.yml` |
| PR preflight strict | secrets and heavy binaries merged | always | `ci/ci.yml` |
| Branch-policy guard (`pull_request_target`) | PRs into release branches from the wrong source | release branches | `ci/branch-policy-guard.yml` |
| Migration contract gate | schema removals without a tracked contract step | schema migrations | `ci/migration-contract-gate.yml` |
| Contract issue on merge | a merged expand/migrate step whose contract (drop the old field) is never scheduled, so dead schema lives forever | schema migrations | `ci/contract-issue.yml` |
| Plan-folder gate + stale check | multi-PR plan folders left behind after the initiative ships, or closed without promoting what must outlive them | `docs/plans/` initiatives | `ci/plan-folder/` |
| Post-deploy smoke | a deploy that builds green but fails at runtime, shipped without anyone hitting it | deployed environments | `ci/smoke-deploy.yml` + `automations/smoke-deploy.mjs` |
| Skill lint | skills with no description (never routed to) or oversized ones that cost context every session | own skills | `automations/check-skills.mjs` |
| Skill-routing pack | a prompt-router regex or a skill description edit silently breaking which skill a request reaches | routing hooks + own skills | `automations/skill-routing.*` |
| Dependency families | packages of one family drifting to mismatched versions that break at runtime | multi-package SDKs | `automations/check-dependency-families.mjs` |
| Review routing + PR template lane | flow-sensitive changes reviewed lightly | PR workflow | `ci/review-routing/`, `ci/pull_request_template.md` |

## 5. Automations

| Automation | Prevents | Signal | Template |
|---|---|---|---|
| Workspace setup script (deps, codegen, index in background, copy index from main checkout) | agents working without the index or generated code | worktree-based workflow | `automations/workspace-setup.sh` |
| Release promotion (dev → stage → main, fast-forward, smoke test, deployed-commit check) | hotfixes lost, wrong commit deployed | multi-environment deploys | `automations/release-flow.md` |
| Contract issue on migration merge | expand/migrate/contract never contracted | schema migrations | `ci/contract-issue.yml` + `automations/release-flow.md` |
| Vendored-skill version check | stale or unpinned vendored skills | vendored skills | `automations/check-vendored.mjs` |
| Code-index refresh on stop | stale index | code index | `hooks/index-refresh.mjs` |

## 6. Permissions (layered)

| Layer | Contents |
|---|---|
| deny | approving PRs; mutating `gh api` flags (`-f/-F/--field/--input/-X POST…`); reading `.env*`, keys, certificates; build/vendor dirs |
| ask | destructive git, recursive delete, deploys, secrets CLIs, publishing, merging, force-kill, sudo, comments/reviews, third-party installs (`git clone`, MCP/plugin/skill adds, `pip`/`uv tool install`) so they go through quarantine first |
| allow | read-only `gh`, tests, lint, typecheck, formatter check |

Permissions are the first layer; the hooks are the second (they catch shapes globs miss).
Template: `rulesync/permissions.jsonc`.

## 7. Registries

| Registry | Read by | Template |
|---|---|---|
| `side-effect-registry.md` (trigger + search per row; grows by one row per escaped bug) | plan-feature, plan reviewer | `registries/side-effect-registry.md` |
| `blueprint.md` (inventory of agents, skills, hooks, lint, CI, test kinds; updated in the same PR) | everyone | `registries/blueprint.md` |
| `environment-variables.md` (every var, where consumed, per environment) | env-docs hook | `registries/environment-variables.md` |
| `use-case-matrix.md` (state axes, transitions, named product rules; review findings are checked against the rules) | plan-feature, pr-triage, reviewers | `registries/use-case-matrix.md` |
| Compliance inventory (data, vendors, retention vs published legal texts) | compliance check | write per project |

## 8. Planning and review protocol

| Piece | Prevents | Signal | Template |
|---|---|---|---|
| Decision log for Clarifications | approved points re-litigated or silently lost when a plan is revised | plans discussed over several turns | `rules/root.md`, `skills/plan-feature/` |
| Evidence before architecture (verified / read / assumed / refuted / accepted) | schemas and roadmaps built on a doc claim nobody checked | integrations, unfamiliar tech | `skills/plan-feature/references/evidence-and-spikes.md` |
| Feasibility spikes gated per spike id, confined to `.context/spike/<id>/` | "quick experiments" that install, connect or spend without consent | any plan with an unresolved critical hypothesis | `rules/root.md`, `evidence-and-spikes.md` |
| Plan folders for multi-PR initiatives | context scattered across PRs; plans that outlive the work | initiatives spanning several PRs | `skills/plan-feature/references/plan-folder.md`, `ci/plan-folder/` |
| Diagram / method / readability pickers | walls of text nobody reviews; the wrong analysis method for the question | big plans | `skills/plan-feature/references/` |
| Use-case table per plan | behaviour that depends on user state changed for one state and broken for another, or across a transition | state-dependent features | `registries/use-case-matrix.md` |
| Scope freeze + follow-up routing | a PR growing to absorb every review finding until it is unreviewable | review-heavy PR flow | `skills/pr-scope/`, `commands/pr-triage.md` |
| Requirements interview | a plan built on silently invented requirements | underspecified asks | `skills/interview-me/` |
| Review type `independent \| self-check` + seal | the author session's own review passed off as the independent look | flow-sensitive lane | `skills/pr-review/`, `hooks/review-seal.mjs` |
| Evidence-stamped final message (sha, clean/dirty, passed/failed/blocked/not run) | "verified" claims about a different commit, or evidence reused after the code changed | verify-integration in use | `skills/verify-integration/` |
| Hazard search + "mitigation is not root cause" | a symptom patched while the same hazard stays live elsewhere | debugging skill in use | `skills/debugging/` |
| Per-step validation by use case (happy, failure, legacy data) | a step built on an earlier one that was never checked; everything found broken at the end | any implementation | `rules/root.md` |
| Findings recap at the end of every progress message | findings and pending decisions buried in earlier messages of a long run | loops, multi-step runs | `rules/root.md` |
| Third-party quarantine (read in `.context/quarantine/`, install is an `ask`) | a skill, MCP or repo installed with hooks or scripts nobody read | any third-party install | `rules/root.md`, `rulesync/permissions.jsonc` |
| Reflect escalates to a check (ladder, class-level on the second repeat, red first, shrink-only baseline, expiring exceptions, prune mode) | a correction written as prose that the next session ignores again | any repo with custom checks | `skills/reflect/`, `skills/reflect/references/checks.md` |
