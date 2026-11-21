# Changelog

## Unreleased

Templates brought up to date with the reference repo they were distilled from.

### Added
- `ci/list-guard-tests.mjs` (+ test): finds tests that read the repo from disk, which changed-only
  test runs never select; `ci.yml` runs them on every PR.
- `skills/pr-review/references/pr-review.md`: the canonical review procedure (lane detection,
  block table, standards to load, severity, finding format, final output). SKILL.md points to it.
- `skills/reflect/references/checks.md`: the check ladder, red first, shrink-only baselines,
  expiring exceptions and prune mode.

### Changed
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
