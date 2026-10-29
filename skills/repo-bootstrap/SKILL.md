---
name: repo-bootstrap
description: Analyze the current repository and set up (or audit and improve) a production-grade AI coding-agent workflow — root rules, agents, skills, hooks, architecture tests, custom lint, CI, permissions, registries, MCP servers and rulesync. Always starts by asking the user what they want, then proposes with evidence from the repo, and generates nothing before an explicit "go". Use when the user says "bootstrap this repo for agents", "set up agents/skills/hooks", "audit my CLAUDE.md / agents", "make this repo agent-ready", "/repo-bootstrap".
when_to_use: New repo with no agent config, an existing repo that grew its config organically, or a repo whose agents keep missing side effects. Not for a single one-off rule or a single hook — just write that.
argument-hint: "[quick|full] [audit]"
---

# repo-bootstrap

Turn any repository into one where AI coding agents plan before coding, check official docs first,
catch cross-cutting side effects, verify the full circle, and are fenced by deterministic guardrails.
Everything here was distilled from a real project where each piece was added after a concrete
failure; the "why" of each piece lives in `references/guardrail-catalog.md`.

## Non-negotiables

1. **Ask first.** Phase 0 runs before any deep analysis. The user's choices scope everything after.
2. **Nothing is written before an explicit "go".** Analysis and the proposal are read-only. Scratch
   output goes to `.context/repo-bootstrap/` (create it and git-ignore it) or is kept in chat.
3. **Minimalism: no artifact without a repo signal.** Every proposed agent, skill, hook, test, lint
   rule, workflow and MCP cites the evidence (`file:line`, config, dependency) that justifies it.
   "Nice to have" without a signal goes to a "Later" list, not into the proposal.
4. **Docs first.** Before proposing any tool, MCP, package, hook format or rulesync config, read the
   current official docs. State `Docs checked: <url> — already does it? yes/no/partial`.
5. **Exact pins, ≥5 days old.** Every dependency or tool version proposed is exact and was published
   at least 5 days ago (check with `npm view <pkg> time --json` or the registry). Compute it at run
   time; never copy a version from this skill.
6. **Never install, authenticate or connect anything outward** (MCP servers, OAuth, CLIs that log in,
   publishing, pushing) without the user's OK for that specific action.
7. **Trim with audit.** In an existing repo, never delete or shorten agent/skill/rule content by
   title. Read each block, fill `block | keep/remove/rewrite | why`, keep when in doubt, show the
   table before writing.
8. **Talk in the user's language; write artifacts in English** unless the user chose otherwise.

## Phase 0 — Light scan + options menu (mandatory)

**Light scan (≤10 tool calls, read-only):** root files and manifests (package.json/pyproject/go.mod/
Cargo.toml…), lockfile → package manager, `git log --oneline | head` and commit count, amount of
source code, existing AI config (`CLAUDE.md`, `AGENTS.md`, `.claude/`, `.cursor/`, `.rulesync/`,
`.codex/`, `.opencode/`), CI (`.github/workflows/`, others), test runner, linter/formatter configs.

**Then present the whole menu** — every option with one line on what it is, rough cost, and your
recommendation based on the scan. Use `AskUserQuestion` when available (max 4 questions per call,
two rounds); otherwise a numbered list in chat. Full option texts: `references/options-menu.md`.

| # | Question | Options |
|---|---|---|
| 1 | Goal | build from scratch · audit and improve what exists · only one family |
| 2 | Mode | new/clean project · existing project (pre-selected from the scan; user confirms) |
| 3 | Families (multi) | root rules · agents · skills · hooks · architecture tests · custom lint · CI · automations · permissions · registries · MCP servers |
| 4 | Tools and rulesync | which agent tools are used (Claude Code, Cursor, Codex CLI, OpenCode, Copilot, Gemini CLI…); rulesync as single source (recommended) or native files only |
| 5 | Code style | follow the existing style · behavior-preserving refactor plan · leave it alone |
| 6 | Depth | quick (no benchmark) · full (benchmark with a big feature, ~200-300k tokens) |
| 7 | Output | proposal only · proposal then generation after "go" · how many PRs |
| 8 | Language | chat language (default: the user's) · artifacts language (default: English) |

Record the answers in `.context/repo-bootstrap/choices.md`. From here on, only the chosen families
are analysed and proposed. If the user picks "only one family", skip straight to that family's part
of Phase 2/3.

## Phase 1 — Understand the repo

### New / clean project
Short interview (one question at a time, each with your guess attached) until you can predict the
next three answers: product and users, stack (or candidates), sensitive domains (money, auth,
personal data, external publishing, legal promises), team size and review model, tools used,
deploy target, environments (dev/stage/prod, sandboxes). Then go to Phase 3 using templates.

### Existing project
Launch the discovery lenses **in parallel**, each a read-only subagent returning only a compact
table with `file:line` (prompts in `references/discovery.md`):

1. Stack and infrastructure.
2. Sensitive domains and flows.
3. Dev workflow (CI, tests, scripts, branching/release, Node/runtime versions).
4. External services and their tooling (SDK, CLI, sandbox, official MCP?).
5. Code and architecture: real layers and dependencies, conventions, implicit registries, style.
6. (Only if AI config exists) Config audit: conflicts, stale facts verified against code, bloat,
   descriptions — format *Problem · Solution · Why*.

Use a code index first if one exists (graph tool, ctags, LSP) and plain `rg` otherwise. Keep your own
context small: synthesize tables, do not re-read what a lens already returned.

## Phase 2 — Code style decision (existing project, if chosen in Phase 0)

Follow `references/code-style.md`: measure the real convention (configured formatter/linter,
dominant style by sampling, inconsistencies with counts and `file:line`), then ask:

- **(a) Follow the existing style** → encode it in formatter/lint config and in the agents' Build
  rules; no source changes.
- **(b) Behavior-preserving refactor** → produce a *separate* refactor plan (never mixed with the
  bootstrap PRs): characterization tests first, mechanical formatting in its own PR, then small
  per-module refactors, each proving identical behavior.
- **(c) Leave it alone.**

## Phase 3 — Benchmark (full depth only)

Follow `references/benchmark.md`. Invent one **big cross-cutting feature** that this repo could
plausibly need (touches data + auth + money/external service + UI + copy/legal). Run 2-3 planners in
**fresh contexts**, read-only, each required to list "Side effects / things that would break" with
`file:line`. Merge every effect found into a master list and verify each in the code. That list:

- seeds `side-effect-registry.md` (one row per class of effect, with the search to run);
- tells you which domains need an implementer agent (where planners lacked build knowledge);
- shows whether planners checked official docs (if not, docs-first must be a protocol step).

## Phase 4 — Proposal (the deliverable before "go")

Map signals to artifacts with `references/decision-matrix.md` and pick concrete pieces from
`references/guardrail-catalog.md`, `references/mcp-discovery.md` and `references/rulesync.md`.
Write the proposal to `.context/repo-bootstrap/proposal.md` and summarize it in chat.

Format — one table per chosen family, one row per artifact:

| Artifact | Signal in this repo (`file:line`) | What it prevents | Cost (context / time / CI) | Blocking · ask · advisory | Template |
|---|---|---|---|---|---|

Then:
- **Root rules**: the sections that will go in the root rule file, each with its justification.
- **Agents table**: role (orchestrator / implementer / reviewer / reference), domain, model, effort,
  why — and which domains deliberately get *no* agent yet.
- **MCP table**: service · official MCP (url) · maintainer · auth · scopes · prod/sandbox · install
  command — marked "needs your OK".
- **Later**: things considered and deferred, with the signal that would justify them.
- **PR map**: e.g. (1) rulesync + root rules + registries, (2) hooks + permissions, (3) agents +
  skills, (4) architecture tests + lint (as `warn`), (5) CI, (6) refactor plan if chosen.
- **Verification plan** (Phase 6) and the tools it needs; ask for missing tools now.
- **Clarifications**: when the user questions a point, add a final `## Clarifications` section — the
  question, a complete answer (why, concrete data, a Mermaid diagram for flows/roles/before-after)
  and what changes. Remove an entry once the user approves it ("already approved: …").

Stop and wait for "go". Adjust and re-present on any correction.

## Phase 5 — Generate

- Work PR by PR from the PR map. Start from a branch off the default branch; never push to protected
  branches. Commit only with the user's authorization.
- With rulesync: write sources under `.rulesync/`, run the generator, never hand-edit generated
  files, add the sync check to CI (`references/rulesync.md`).
- Parallelize by family with one subagent per family and an **exclusive file scope** in its prompt
  ("edit ONLY these paths; other agents edit other files in parallel; do not commit; do not run the
  generator"). Brief each one with a Handoff brief: goal, files, decisions taken, invariants, what not
  to touch, how it will be verified. After they finish, review the full `git diff` yourself.
- Templates live in `templates/` next to this file. Fill every `<placeholder>`; delete optional
  sections whose signal is absent; keep each template's header comment out of the final file.
- New lint rules and architecture tests start as `warn` (or skipped with a tracking note) when the
  code does not comply yet; flip to `error` once clean.
- Update the repo's `blueprint.md` (inventory of agents, skills, hooks, lint rules, CI, test kinds)
  in the same PR as each addition.

## Phase 6 — Verify

- Config: generator check passes, YAML frontmatter parses, every referenced path exists.
- Hooks: their tests pass; trigger each one once for real (a harmless command that should be asked,
  a prompt that should route to plan-feature) and show the observed output.
- Architecture tests and lint: run them; report violations found in the current code as the
  baseline instead of hiding them.
- CI: run the workflow on the PR and link the run.
- Re-run the Phase 3 benchmark with the new protocol (full depth): report effects found before vs
  after, and tokens.
- Adversarial review of the config diff in a fresh context: instructions that could hit production,
  send real emails/posts, leak secrets, bypass consent, or contradict each other.
- Report honestly what was not verified and why.

## Audit mode (existing AI config)

When the repo already has agent config, Phase 1 adds the config-audit lens and the proposal adds a
**Changes** table: `file:block | problem | solution | why`. Typical findings: one concern owned by
several agents, stale stack facts, pasted vendor docs, rules repeated in several files, examples that
use helpers that do not exist, skills that contradict the stack, descriptions that never trigger.
Migrating loose config into rulesync is an import with an audit table — nothing is dropped silently.

## Reference files

| File | Load when |
|---|---|
| `references/options-menu.md` | Phase 0, to present the menu |
| `references/discovery.md` | Phase 1, existing project |
| `references/code-style.md` | Phase 2 |
| `references/benchmark.md` | Phase 3 |
| `references/decision-matrix.md` | Phase 4, mapping signals to artifacts |
| `references/guardrail-catalog.md` | Phase 4, choosing concrete guardrails |
| `references/mcp-discovery.md` | Phase 4, MCP family |
| `references/rulesync.md` | Phase 4/5, when rulesync is chosen |
| `templates/README.md` | Phase 5, index of every template |
