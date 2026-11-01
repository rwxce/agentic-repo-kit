# Changelog

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
