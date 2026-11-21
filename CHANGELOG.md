# Changelog

## 0.6.0 — 2026-11-21

System design phase, a concept catalog with 51 cards, opt-in product modules, recommended tools and language adapters, eleven new mechanisms, templates caught up with the reference repository, an MIT license with contributor docs, CI for the kit itself and an updated site.

### Added
- Concept catalog: `references/concept-catalog.md` indexes 51 concept cards under
  `references/concepts/`, loaded on demand. Each card has problem, principle, when it applies,
  when it doesn't, typical mistakes, the check that verifies it, canonical source and variants per
  stack. 33 are generalized from the production project the kit came from; 18 are external
  practice marked as not yet proven there (connection pooling, isolation levels, optimistic
  concurrency, outbox, sagas, circuit breaker, dead-letter queues, timeouts and retries,
  idempotent APIs, backups with a tested restore, SLOs and error budgets, SBOM and provenance,
  secrets management, input validation, security headers, feature flags, observability, health
  checks). Every source URL was checked; cards with no primary source say "None found".
- `decision-matrix.md`: a "Project signal → concepts" table.
- `guardrail-catalog.md`: "When not" and "Origin" columns on every table.
- Product modules, opt-in and proposed only on a repo signal (`references/product-modules.md`,
  Phase 0 question 9, a "Project signal → product modules" table in `decision-matrix.md`):
  - Design: `PRODUCT.md` and `DESIGN.md` templates, DTCG 2025.10 tokens with `check-tokens.mjs`,
    a UI surfaces inventory with `check-ui-surfaces.mjs`, the design tool → artifact → real
    components flow, per-skill overrides and a `ui-router` agent.
  - Legal: a `legal-compliance` skill (inventory from the code, discrepancies, founder questions,
    LIA, processors, retention) with a jurisdiction → obligations → official source table; every
    URL opened on 2026-11-21. It never writes final legal text.
  - Content: a typed content registry with a guard that also fails stale third-party facts, a
    `content-writing` skill for posts and comparison pages, and a generic `changelog-entry` skill.
  - Copy: positioning and tone templates, a translation glossary with `check-glossary.mjs`.
  - Product AI: model ids per environment, a strict structured-output schema converter, prompt
    version and cost-per-feature patterns, a blind-judge eval procedure.
  - Growth: plans as data with server-side checks and a limit → feature table, a price-literal check.
  - Dev environment: a local launcher (free port, app URLs on localhost), a `test-login` skill with
    a triple guard, and the secrets-folder-per-provider pattern.
- `tests/concept-catalog.test.mjs`: guard test that fails when a card loses a field, is missing
  from the index or the signal table, or has a broken relative link (`node --test tests/*.test.mjs`).
- `LICENSE` (MIT), `SECURITY.md` (private reporting through GitHub security advisories, scope, no
  SLA), `CONTRIBUTING.md` (issue first for big changes, Conventional Commits, how to run the
  template tests and the skill lint, attribution rule, contributions under MIT without CLA or DCO)
  and `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1).
- `.github/`: bug report and feature request issue templates, issue `config.yml` (security link, blank
  issues off) and a pull request template.
- `THIRD_PARTY.md` (root, site assets) and `skills/repo-bootstrap/THIRD_PARTY.md` (adapted
  templates, with the license texts; it travels with every install).
- `ci/list-guard-tests.mjs` (+ test): finds tests that read the repo from disk, which changed-only
  test runs never select; `ci.yml` runs them on every PR.
- `skills/pr-review/references/pr-review.md`: the canonical review procedure (lane detection,
  block table, standards to load, severity, finding format, final output). SKILL.md points to it.
- `skills/reflect/references/checks.md`: the check ladder, red first, shrink-only baselines,
  expiring exceptions and prune mode.
- `hooks/unicode-firewall.mjs` + `install-unicode-firewall.mjs` (+ test): machine-wide Claude Code
  hook that strips Unicode Tags, bidi controls and stray zero-width characters from tool output,
  blocks pasted prompts carrying them and warns on look-alike Latin words.
- `ci/check-deploy-artifact.mjs` (+ test): builds the artifact the deploy ships with the deploy
  tool's own bundler and options, and optionally runs a smoke entry from the built output, so an
  import that only resolves after codegen or a package that breaks once bundled fails in CI.
- `lint/lint-restrictions.lint.test.mjs`: guard test that lints snippets through the repo's real
  ESLint config and fails when a restriction stops firing (a later block replaced the list, an
  `ignores` glob exempted a path) or fires where it must stay allowed.
- `test-guards/job-leak-guard.mjs` (+ test): test-setup safety net that fails the test leaving
  scheduled jobs pending, instead of hiding the leak under global fake timers or letting it flake
  an unrelated file later.
- `ci/prune-stale-branches.yml`: weekly prune of closed-PR and PR-less stale remote branches,
  never protected ones or ones with an open PR; lists only on manual runs unless `apply` is ticked.
- `ci/mark-ready-contracts.mjs` (+ test): after the production migrations finish, labels each open
  "Contract: <name>" issue whose migration succeeded `contract-ready` and comments once,
  completing gate -> issue -> ready.
- `arch-tests/ui-surfaces-inventory.mjs` (+ test) and `registries/ui-surfaces.md`: every page and
  floating surface must be cited in the UI inventory, and the inventory may not cite deleted files.
- `test-guards/layout/`: Playwright layout guard. `overflow.mjs` (+ test with a fake DOM) finds
  horizontal scroll, off-screen or clipped text and colliding controls; `layout-overflow.spec.ts`
  checks fixed widths x pages x locales, `layout-sweep.spec.ts` resizes 320 -> 1440 -> 320 in 20px
  steps with a monotonic check for collapsible items.
- `commands/pr-make.md`, `sync-dev.md`, `git-clean.md`: open a PR end to end (base guards,
  precheck gate, review-seal warning, lane, mandatory diagram); merge the integration branch in
  with a tagged stash and per-file conflict rules; delete unprotected branches and worktrees after
  one go on an inventory table, with a SHA backup.
- `automations/renovate.json5`, `pnpm-workspace.snippet.yaml` and `check-release-age.mjs` (+ test):
  Renovate with exact pins, a 5-day minimum release age and grouped families; the same age as
  pnpm's install-time gate; a CI check that fails when the two ages drift.
- `hooks/opencode/agent-bash-guards.js` and `agent-handoff.js` (+ test): OpenCode plugin shims
  that reject what the "ask" guards would ask about, and feed `save-handoff` the session's last
  message and context size. `save-handoff.mjs` exports `handoffInputFromOpencodeMessages`.
- `references/recommended-tools.md`: third-party skills, tools and MCP servers the kit proposes
  but does not bundle. Each row gives the need, origin repo, version tested, license and the repo
  overrides. It describes the quarantine step to follow before any install and flags MCP servers
  run at `@latest` or unpinned as a risk. It also adds language adapters (lint rule +
  architecture test) for Swift, Kotlin, Python, Go, Rust and Dart, with official links. Linked
  from `SKILL.md` Phase 4.
- Phase 1b, system design (`references/system-design.md`): sized by risk (light · standard ·
  deep) with a method picker, so a local CLI gets one page and a SaaS with payments gets threat
  modeling and FMEA. New projects go brief → observable requirements → context and trust
  boundaries → risks and hypothesis gate → 2-4 alternatives on checkable criteria (maintenance
  activity, license, CVEs of the exact version, breaking changes, modelled cost, lock-in; never
  stars or scores out of 10) → ADRs → "go". Existing projects document the real design from
  discovery lenses 1, 4 and 5, list risks, and migrate only with evidence.
- Official sources per project type (Android, iOS, Flutter, Kotlin Multiplatform, SaaS web,
  CLI/library), each URL checked to resolve.
- Templates `system-design.md` and `adr.md`: every decision names the check that enforces it,
  and those checks feed the Phase 4 proposal.
- Four system design scenarios in `benchmark.md`, including a CLI that must receive nothing
  superfluous.

### Changed
- Site (en, ca, es): the "Design and concepts" section adds a product modules card (opt-in,
  offered only on a repo signal; the legal module never writes final legal text); its cards sit in
  a two-by-two grid on wide screens.
- Site (en, ca, es) presents the new kit work: "How it works" follows the flow understand →
  design → choose concepts → design controls → generate → verify → learn; a new "Design and
  concepts" section covers the risk-sized system design, the concept catalog and the recommended
  third-party tools installed through quarantine; the families list adds the review seal, reflect
  with checks, guard tests, the hardened release, handoff, the Unicode firewall, the real build
  artifact, the layout guard, Renovate with a minimum release age, OpenCode shims and the language
  adapters; two new FAQ entries (other languages, license); the footer links CONTRIBUTING,
  SECURITY and LICENSE; meta and share descriptions follow the new pitch.
- `review-seal`: `fingerprint` saves the exact diff to review and prints its fingerprint;
  `write --expect <fp>` refuses when the diff changed during the review. Fixes a race where edits
  made while the review ran were sealed as reviewed. `pr-precheck-seal` exposes the shared
  snapshot helpers.
- `reflect`: proposes a check (type, lint rule, test, CI gate) before prose; class-level on the
  second repeat; the check must fail on the original mistake; `/reflect prune`.
- Root rule: validate each step by use case while building, findings recap in long runs,
  quarantine for third-party installs, loops only from an approved roadmap, width sweep, the
  dev-mode question, "keep implementing until the user reviews", corrections escalate to checks.
- `plan-feature`: orchestration branch (local, never pushed), spikes never get a default and stop
  the loop, multi-loop PR titles, closing the plan folder is the roadmap's last item.
- `save-handoff` / `load-handoff`: active plan from the repo only (`plan.md` of the newest
  initiative wins), pending block from the last heading-shaped line, input from hosts without a
  transcript, nested worktrees resolve their own checkout.
- Permissions: third-party installs (`git clone`, MCP/plugin/skill adds, pip/uv installs) are
  `ask`; more read-only `gh` allows.
- `release-flow.md`: hardened sketches (only from main, jobs split by secret, pinned environment
  secrets, no caches next to prod secrets, re-run currency check, `--match-head-commit` plus tree
  comparison, wait until staging serves the commit, `refs/gated` marker, one concurrency lock,
  exact-sha deploys, deploy-failure issue).
- `ci.yml`: guard tests on PRs, skill lint, dependency-family check.
- `plan-reviewer`: hunts unproven assumptions and uncovered use-case states and transitions.
- `verify-integration`: force use cases that do not happen on their own; width sweep.
- `smoke-deploy`: optional env-fed auth headers for hosts behind an access proxy.
- GitHub Actions bumped to Node 24 runtimes (checkout v5, setup-node v6, github-script v8).
- Flow: understand → design → propose → generate → verify → learn. `SKILL.md`, the README
  diagram and the templates index include the new phase.
- CI workflow (`ci.yml`): template tests, the kit's guard tests and the skill lint on every pull request and push to `dev`.

### Fixed
- Attribution restored where templates adapt someone else's work: `diagram-picker.md` ("Mermaid
  Studio" by Felipe Rodrigues / Tech Leads Club, CC BY 4.0, with the license link and the list of
  changes), `debugging` (addyosmani/agent-skills, MIT) and `evidence-and-spikes.md` (ideas from
  gsd-core, spec-kit and BMAD-METHOD). The templates index now says attribution comments stay in
  the generated file.
- Site (en, ca, es): the hero eyebrow stays on one line on phones, and content scrolling under the
  sticky pill navbar fades out instead of showing through the gap above it.
Templates brought up to date with the reference repo they were distilled from.

## 0.5.0 — 2026-11-21

First release on the new branch model: `dev` holds every commit, `main` one commit per release.

### Added
- Site in Catalan and Spanish, with a language switcher and per-language share preview images.
- Cover image at the top of the README.
- `BRANCHING.md` and a Release workflow: pull requests go to `dev`; a release squashes `dev` into
  one tagged commit on `main`, publishes the GitHub release and redeploys the site.

### Fixed
- Share preview image on the site; README back to the logo header.

## 0.4.0 — 2026-11-14

### Added
- `INSTALL.md`: install instructions written for AI agents. Paste one prompt into Claude Code,
  Codex, Cursor or OpenCode and the agent asks the scope, copies `skills/repo-bootstrap` and
  confirms.
- Logo (an "A" drawn as a git graph ending in a "go" commit) in the README, site navbar and
  favicon.
- Site: "Copy the prompt for your agent" as the main action. The install card centres on
  screen, and the manual git commands fold away.
- Site: smooth scroll (Lenis 1.3.26, vendored, off with reduced motion).

### Changed
- Site navbar: one compact row on mobile, sticky with a blurred background.
- README Install starts with the agent prompt; manual install folded below.

## 0.3.0 — 2026-11-14

### Added
- `plan-feature` references: `plan-folder.md`, `evidence-and-spikes.md`, `diagram-picker.md`,
  `method-picker.md`, `plan-readability.md`; the skill gains the use-case and method steps, the
  hypothesis gate, spikes per spike id, the decision log and the plan-folder flow.
- Skills `pr-scope` (+ scope and adversarial-review references) and `interview-me`; command
  `pr-triage` (new `templates/commands/`).
- Hooks: `protect-branches`, `index-refresh`, `save-handoff` + `load-handoff` (optional
  `HANDOFF_STATUS_CMD`), and the `pr-precheck-seal` / `review-seal` CLIs, each with a
  `node:test` suite and wired into `hooks.rulesync.json` / `settings.hooks.json`.
- CI: `plan-folder/` (close check + gate + stale workflows), `contract-issue.yml`,
  `smoke-deploy.yml`.
- Automations: `smoke-deploy.mjs`, `check-dependency-families.mjs`, `check-skills.mjs`, and the
  skill-routing case pack, each with tests.
- Registry: `use-case-matrix.md` (state axes, transitions, named product rules).
- Catalog section "Planning and review protocol"; site link in the README.

### Changed
- Root rule template: decision log for Clarifications, plan folders in the user's language,
  evidence before architecture, feasibility spikes gated per spike id, optional use-case rule,
  length exemption for plan-discussion replies.
- `verify-integration`: evidence-stamped final message (sha, clean/dirty,
  passed/failed/blocked/not run, reused-evidence rule) and a Hand off section. `pr-review`:
  `Type: independent | self-check` and the review seal. `debugging`: hazard search and
  "mitigation is not root cause".
- `pr-preflight`: advisory notice when a flow-sensitive diff has no fresh independent-review
  seal; sensitive paths are a config constant.
- Stop / SessionStart / PreCompact hook commands `cd` to the project root first.
- Templates no longer ship tool-specific defaults: the dangerous-command gate's secrets and
  deploy lists start empty; code-index path and install hint are config constants; prompt
  routers use a `PATTERNS` object keyed by language with English enabled by default; the
  workspace setup script refers to "your ADE".

## 0.2.0 — 2026-11-01

- `plan-feature` template: steps 10-11 for every size. The plan ends with a roadmap a `/loop`
  run can execute and the pre-loop questions, each with a recommended default; new
  `references/loop-roadmap.md` (state file deleted on close, per-iteration protocol, lessons
  learnt, final report).
- Root rule template: every implementation ends with a "Pending for you (outside code)" block.
- No longer distributed as a Claude Code plugin: `.claude-plugin/` removed; install by copying
  `skills/repo-bootstrap`.

## 0.1.0 — 2026-10-29

- First release: `/repo-bootstrap` skill with Phase 0 options menu, new/existing modes, discovery
  lenses, code-style decision (follow / behavior-preserving refactor), big-feature benchmark,
  evidence-based proposal, parallel generation and verification.
- References: options menu, discovery, code style, benchmark, decision matrix, guardrail catalog,
  MCP discovery, rulesync.
- Templates: root rules, agents, skills, registries, hooks with tests, architecture tests, lint,
  CI, automations.
