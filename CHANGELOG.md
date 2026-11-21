# Changelog

## Unreleased

### Added
- `LICENSE` (MIT), `SECURITY.md` (private reporting through GitHub security advisories, scope, no
  SLA), `CONTRIBUTING.md` (issue first for big changes, Conventional Commits, how to run the
  template tests and the skill lint, attribution rule, contributions under MIT without CLA or DCO)
  and `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1).
- `.github/`: bug report and feature request issue templates, issue `config.yml` (security link, blank
  issues off) and a pull request template.
- `THIRD_PARTY.md` (root, site assets) and `skills/repo-bootstrap/THIRD_PARTY.md` (adapted
  templates, with the license texts; it travels with every install).

### Changed
- Site (en, ca, es) presents the new kit work: "How it works" follows the flow understand →
  design → choose concepts → design controls → generate → verify → learn; a new "Design and
  concepts" section covers the risk-sized system design, the concept catalog and the recommended
  third-party tools installed through quarantine; the families list adds the review seal, reflect
  with checks, guard tests, the hardened release, handoff, the Unicode firewall, the real build
  artifact, the layout guard, Renovate with a minimum release age, OpenCode shims and the language
  adapters; two new FAQ entries (other languages, license); the footer links CONTRIBUTING,
  SECURITY and LICENSE; meta and share descriptions follow the new pitch.

### Fixed
- Attribution restored where templates adapt someone else's work: `diagram-picker.md` ("Mermaid
  Studio" by Felipe Rodrigues / Tech Leads Club, CC BY 4.0, with the license link and the list of
  changes), `debugging` (addyosmani/agent-skills, MIT) and `evidence-and-spikes.md` (ideas from
  gsd-core, spec-kit and BMAD-METHOD). The templates index now says attribution comments stay in
  the generated file.
- Site (en, ca, es): the hero eyebrow stays on one line on phones, and content scrolling under the
  sticky pill navbar fades out instead of showing through the gap above it.

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
