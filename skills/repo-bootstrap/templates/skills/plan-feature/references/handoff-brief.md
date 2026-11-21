<!--
TEMPLATE: Handoff brief (loaded on demand by plan-feature step 9). Generated with plan-feature.
Fill: the verification commands line with the repo's real lint/typecheck/test commands.
-->
# Handoff brief (template)

The orchestrator appends one brief per implementer subagent to the approved plan and passes it
verbatim. The implementer starts from the brief, runs the code-graph query (if any) before any
broad search, and follows its own `## Build rules`.

```markdown
## Handoff brief — <agent> — <theme / PR title>

**Goal:** <one sentence: after this, X happens / stops happening>

**Files and graph results:**
- <path> — <what changes>
- Graph / sweep rows that matter: <file:line | reader | broken assumption>

**Decisions already taken (don't reopen):**
- <decision> — <why, one line>
- Docs checked: <url> — <yes / no / partial>

**Rate limit rows (if any public entry point):** <the decided rows from the plan>

**Invariants (each must hold; each maps to a test or a verify-integration step):**
1. <invariant> → <test name / verification step>

**Do not touch:**
- <files, tables, behaviours outside this theme>

**Verification:**
- `<lint>`, `<typecheck>`, `<test>` (+ specific tests)
- <verify-integration steps / screenshots at 1440 and 375 px for UI>

**If the plan doesn't fit the code** (a file, helper or contract is not what the plan assumes):
stop, don't improvise, and report back what you found and where (file:line).
```

When several implementers run in parallel, give each an exclusive **FILE SCOPE** ("edit ONLY these
files; other agents edit other files in parallel"), forbid committing, and have the orchestrator
review the full `git diff` before any commit.
