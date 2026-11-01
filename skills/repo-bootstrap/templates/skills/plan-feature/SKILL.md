<!--
TEMPLATE: plan-feature skill (planning protocol). Always generated for repos with more than one
module or any flow-sensitive area. Fill: the Step-0 flow-sensitive list, the agent names in Step 4,
the registries/commands the repo actually has. Remove steps whose root-rule counterpart was dropped.
Strip this comment when writing the file (frontmatter must be the first thing in SKILL.md).
-->
---
name: plan-feature
description: >-
  Planning protocol for any new feature in this repo, run before the written plan and before any
  code: classify the size, sweep who reads the touched concepts, check official docs and
  components first, draft the plan against the side-effect registry and root-rule requirements,
  review it with fresh context when big, and end with invariants and a handoff brief. Use whenever
  the user asks for a new feature or capability ("I want to build/add/implement…", "add a feature",
  "new feature", "let users…") and when the user runs /pr-plan. Skip for questions, one-off fixes
  and copy tweaks.
targets: ["*"]
---

# Plan a feature

The orchestrator (main session) runs this before presenting the plan the root rule requires. It
plans; it does not implement. Nothing here writes repo files, opens branches or commits. Reply in
the user's language; the plan's artifacts (file paths, identifiers) stay in English.

## Step 0 — classify the size (~1k tokens, always)

Pick the size from the request plus a quick look (`<code-graph query>` or `rg`) at what it touches:

| Size | When | Protocol |
|---|---|---|
| **Big** | Touches any flow-sensitive area (<list from the root rule's review policy: data/schema, shared backend, integrations, auth, billing, security, routing, compliance, external effects, dependencies>), **or** spans more than one domain, **or** adds new public entry points | Steps 1-11, sweep with 2-3 parallel subagents, `plan-reviewer` at step 6. Budget ~200-250k tokens |
| **Normal** | Changes contracts or data that other code reads | Steps 1-5, 7-11 with one sweep subagent. Budget ~100-120k tokens |
| **Small** | Everything else | Straight to the plan (steps 5, 8-11 only; no sweep) |

- When in doubt between two sizes, **pick the bigger one** — a hole in auth or billing costs more
  than 100k tokens.
- State the size and why on the **first line of the plan**, e.g.
  `Size: big — touches billing (flow-sensitive) and adds 2 public endpoints.`
- The user can override at any time ("big mode" / "quick mode") → redo with that size.
- An underspecified ask (missing who, why, success or the binding constraint) is clarified with
  the user (one question at a time, with a guess attached) before step 1.

## Step 1 — concept inventory

List the domain concepts the feature creates or changes (tables, fields, statuses, roles, plan
entitlements, routes, events, emails, external objects). One line each: concept → what changes.
This list is the input to the sweep.

## Step 2 — consumer sweep (normal and big)

Find **who already reads or writes** each concept, and which of their assumptions the feature
breaks.

- Use the code-graph query first when a graph exists, then confirm; otherwise `rg`. Verify every
  hit in the source.
- **Normal:** one read-only exploration subagent (mid model).
  **Big:** 2-3 in parallel, split by concept group or domain.
- Each subagent gets the concept list and the graph results for its slice, and returns **only**
  this table, at most 40 rows, no prose:

  | file:line | reader | broken assumption |
  |---|---|---|

- Brief template: `references/sweep-brief.md`.

## Step 3 — docs first (normal and big)

Before designing anything that touches a provider or a known capability, read the official docs
(the provider's MCP server, or its official site) and check whether the platform, an official SDK
or an existing component already does it. Record one line per capability in the plan:

`Docs checked: <url> — already does it? yes / no / partial (<what's missing>)`

Prefer a package over custom code only after the reliability check in the root rule (maintained,
recent releases, compatible, covers the real case, exact pin published ≥5 days ago).

## Step 4 — read the build rules (normal and big)

Read the `## Build rules` section of each domain agent the plan will hand work to
(`.rulesync/subagents/<agent>.md`: <list the repo's implementers>). The plan must not ask an
implementer to break its own rules.

## Step 5 — draft the plan

Write the plan the root rule requires (files to modify, approach, tradeoffs) and walk:

- **`docs/side-effect-registry.md`** (normal and big): read it in full and, for each row whose
  trigger matches, run its search and say in the plan what happens to that surface.
- **Root-rule requirements:**
  - **PR map** — if the workspace is fresh (no commits ahead of the base branch) and the work can
    exceed one PR, open the plan with how it splits into PRs; one line if it fits in one.
  - **Rate limit block** — one row per new or changed public entry point. <!-- optional -->
  - **Compliance check** — if any compliance trigger applies, read the inventory and record
    mismatches before continuing. <!-- optional -->
  - **Schema** — expand/migrate/contract, with a `Contract:` issue for anything that stops being
    used. <!-- optional -->
  - **Copy** — the positioning/tone docs for any user-facing string. <!-- optional -->
- **Verification** — plan the `verify-integration` steps (real code path + effect on the other
  side + screenshots) while writing, not after.

## Step 6 — fresh-context review (big only)

Spawn the `plan-reviewer` agent with: the user's request (verbatim), the draft plan, the sweep
tables and `docs/side-effect-registry.md`. It returns at most 15 verified bullets of what the plan
breaks or misses.

## Step 7 — merge

Fold each confirmed finding into the plan (or reject it with a one-line reason). If a finding
reveals a surface the registry did not list, propose a new registry row.

## Step 8 — invariants

End the plan with an **Invariants** list: statements that must stay true after the change (e.g. "a
non-owner never reaches billing actions", "an ambiguous publish failure keeps the row active").
Each one becomes a test or a `verify-integration` step — say which.

## Step 9 — handoff brief

Append the brief each implementer subagent will receive (`references/handoff-brief.md`): goal,
files and graph results, decisions taken, invariants, do-not-touch list, verification. The
implementer **stops and reports back if the plan does not fit the code** instead of improvising.

## Step 10 — loop roadmap (every size)

Turn the plan into a roadmap the loop can execute without the user: one row per item (id,
content, domain agent, lane, branch/base, depends on, done criterion, verification, stops the
loop?). Small work gets a 1-2 row roadmap in the same format. Template and loop protocol:
`references/loop-roadmap.md`.

## Step 11 — pre-loop questions (every size, mandatory before "go")

Walk each roadmap item and list everything that would stop the loop: product or copy decisions,
rate-limit rows, compliance, dashboard or secret work only the user can do, missing tools or MCPs
pointing at the wrong environment, dev server mode, push/PR permissions, checks only a human can
do (real browsers, devices). Ask them with the question tool (max 4 per round, as many rounds as
needed), each with a recommendation that becomes the default. Unanswered → "default applied,
decide at the end" in the roadmap. A question with no reasonable default blocks only its item.
No step 11, no "go". End the plan with a **Pending for you (outside code)** list.

Then present the plan and wait for the user's explicit "go". After the "go", start the loop as
`references/loop-roadmap.md` describes.

## Clarifications

When the user questions or corrects the plan, add (or update) a final `## Clarifications` section,
one entry per doubt: the question; a **complete, detailed answer** (the why, concrete data and
examples from the code, a Mermaid diagram whenever there is a flow, roles or a before/after); and
what changes in the plan. When the user approves an entry, remove it in the next answer and keep a
single line `Already approved: …`. Exempt from the chat length limit.

## Output

The plan, in the conversation (or the plan file in plan mode): size line → PR map (if fresh
workspace) → files / approach / tradeoffs → Docs checked → side-effect registry walk → Rate limit
block → compliance → Invariants → Handoff brief → Loop roadmap → Pre-loop questions (with the
defaults) → Pending for you (outside code) → Clarifications (if any).
