# Phase 0 — options menu

Present every option, one line each: what it is, rough cost, and a recommendation derived from the
light scan ("Recommended because …"). Never pre-decide silently. Two rounds of `AskUserQuestion`
(max 4 questions each); in tools without it, a numbered list the user answers in one message.

## Round 1

**1. Goal**
- *Build from scratch* — no agent config yet, or the user wants to start over. Recommended when the
  scan finds no `CLAUDE.md`/`AGENTS.md`/`.rulesync/`.
- *Audit and improve* — config exists; find conflicts, stale facts, bloat and gaps, then fill gaps.
  Recommended when config exists and is older than a few weeks or larger than ~10 KB.
- *Only one family* — e.g. "just hooks" or "just architecture tests". Skips everything else.

**2. Mode** (pre-selected from the scan, the user confirms)
- *New / clean project* — little or no source code; the setup comes from an interview + templates.
- *Existing project* — source code to analyse; every proposal cites `file:line`.

**3. Families** (multi-select; default = all that have a signal)
- *Root rules* — `CLAUDE.md`/`AGENTS.md`: plan-before-code, docs first, verification, git policy.
- *Agents* — orchestrator/implementer/reviewer roles, per-domain implementers with Build rules.
- *Skills* — plan-feature, verify-integration, reflect, debugging, pr-review, and repo-specific ones.
- *Hooks* — deterministic guards: dangerous commands, outward writes, intent routing, stop checks.
- *Architecture tests* — tests that fail when structure drifts (registry ↔ filesystem parity…).
- *Custom lint* — layer boundaries, SDK gateways, required tests, no swallowed errors.
- *CI* — config-sync check, lint/typecheck/tests, parity checks, branch policy, review routing.
- *Automations* — workspace setup, release promotion, contract issues, vendored-skill updates.
- *Permissions* — deny / ask / allow layers for shell, secrets and outward actions.
- *Registries* — side-effect registry, blueprint (inventory), environment variables.
- *MCP servers* — official MCPs for the services the repo uses (proposed, never auto-installed).

## Round 2

**4. Tools and rulesync**
- Which agent tools does the team use? (Claude Code, Cursor, Codex CLI, OpenCode, Copilot, Gemini
  CLI, other.)
- *rulesync as single source* (recommended when 2+ tools, or likely to be) — one `.rulesync/`
  directory generates every tool's files; CI checks they stay in sync.
- *Native files only* — fine for a single tool forever; cheaper to start, harder to migrate later.

**5. Code style** (existing project only)
- *Follow the existing style* — codify it in formatter/lint + Build rules, touch no code.
- *Behavior-preserving refactor* — separate plan: characterization tests, mechanical format PR,
  small per-module refactors with identical behavior proven.
- *Leave it alone.*

**6. Depth**
- *Quick* — no benchmark; proposal from discovery + catalog. ~60-120k tokens.
- *Full* — adds the big-feature benchmark in fresh contexts; seeds the side-effect registry and
  calibrates which agents are worth it. ~200-300k tokens more. Recommended for repos with money,
  auth or personal data.

**7. Output**
- *Proposal only* — stop after Phase 4.
- *Proposal, then generate after "go"* — and how many PRs (one per family is the default PR map).

**8. Language**
- Chat: the user's language (default). Artifacts: English (default) or another.

Save answers to `.context/repo-bootstrap/choices.md` as a short list; quote it in the proposal.
