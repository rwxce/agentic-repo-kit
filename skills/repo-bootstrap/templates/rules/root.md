<!--
TEMPLATE: root rule (source of CLAUDE.md / AGENTS.md). Always generated; every repo gets it.
Fill every <placeholder> from the repo analysis (stack, commands, branches). Delete sections
whose `optional` marker does not match a signal found in the repo. Keep the result under ~250 lines;
move long procedures into skills/docs and leave a pointer.
-->
---
root: true
targets:
  - '*'
globs:
  - '**/*'
---
# <Project name>

<!-- optional: include if the repo uses rulesync (a `.rulesync/` dir or rulesync in package.json) -->
> **AI editor config is managed by [rulesync](https://github.com/dyoshikawa/rulesync).**
> The single source of truth is `.rulesync/`. All editor configs (`.claude/`, `.cursor/`,
> `.codex/`, `AGENTS.md`, …) are GENERATED. Edit only `.rulesync/`, then run `<rulesync command>`.
> Never hand-edit generated files. CI enforces this with `<rulesync check command>`.

<one-sentence product summary>. Built with <framework/runtime>, <database/backend>,
<auth provider>, <billing provider>. <!-- fill with: what the repo is, from README + manifests -->

See `## Response length` for chat message length preferences.

## Language

Always reply in the language of the user's latest message — never force a default, and follow a
switch mid-thread. Plans and their Clarifications follow the same rule. Everything that is a repo
artifact stays in <artifact language, usually English> regardless of the conversation: code,
code comments, identifiers, commit messages, PR bodies, and every file under `.rulesync/`
(skills, agents and commands included).

## Plan before code

Before any code change, present a written plan with: (1) files to modify, (2) approach,
(3) tradeoffs considered. Wait for the user's explicit "go" before editing.

A plan for a change that crosses a boundary (external service, webhook/job, data contract,
user-visible UI) also carries an **Impact and expected responses** block and a list of the tools
needed to verify it — see the `verify-integration` skill and `## Verification`.

A plan covers **only the current ask**. Do not carry over, repeat or re-list work from earlier
plans or already-done steps; if earlier context matters, reference it in one line.

**Clarifications.** When the user questions or corrects a plan, add (or update) a final
`## Clarifications` section: one entry per doubt with the question, a complete and detailed
answer (the why, concrete data and examples, and a Mermaid diagram when there is a flow, roles
or a before/after) and what changes in the plan. When the user approves a point, remove it from
the section in the next reply, leaving one line "already approved: …". This section is exempt
from the response-length limit.

**Every feature request goes through the `plan-feature` skill.** Step 0 sizes the work
(small / normal / big — when in doubt, the bigger one) and the plan's first line states the size
and why; the user can say "big mode" / "quick mode". Normal and big features get a consumer
sweep, docs first, the `docs/side-effect-registry.md` walk and an Invariants list; big ones
(flow-sensitive, more than one domain, or new public entry points) also get the `plan-reviewer`
agent in a fresh context. One-off fixes, copy tweaks and questions skip all of this.
<!-- optional: include if the tool supports prompt hooks (Claude Code `UserPromptSubmit`):
     "A hook (`<path to detect-feature-intent script>`) flags feature intent so the skill
     triggers without a slash command." -->

## Docs first

Before integrating any technology — or whenever there is doubt about how one works — read the
official docs (the provider's MCP server when there is one: <list the repo's providers with an
MCP>; otherwise the official site) and check whether the platform, an official SDK or an existing
component already does it. A plan that integrates something states
`Docs checked: <url> — already does it? yes/no/partial`.

Prefer the package over custom engineering **only after a reliability check**: official or
well-maintained, recent releases, compatible with our versions, covers our real case, **exact
pin published ≥5 days ago** (no ranges; verify the publish date with `<registry view command>`,
e.g. `npm view <pkg> time`). A two-line import usually beats a bespoke subsystem.

## Git & Commits

<!-- fill with: branches from `git branch -r` and CI triggers; default PR base; release flow -->
- Do not commit without authorization. An explicit request to create a PR authorizes the full
  task-scoped flow: write the title/body, commit and push the task changes if needed, and create
  the PR without another confirmation. Do not include unrelated changes; ask only if task
  ownership cannot be determined.
- Read-only `gh` commands (`view`/`list`/`status`/`checks`/`diff`/`log`, `gh api` GET) are always
  allowed.
- Other GitHub mutations (`pr merge`, `pr edit`, labels, …) and pushes outside the authorized
  PR-creation flow require explicit permission for that operation.
- Posting PR comments or reviews needs the user's explicit authorization for that publication;
  approving a PR is never done by an agent.
- PRs from normal work go to `<default branch>`. <release/hotfix branch rules, if any>.
- Never commit a hotfix directly to a release branch without landing it on `<default branch>` too.

## Pull Request Review Policy

Every PR selects one lane; any sensitive file, or a missing/ambiguous lane, makes it
flow-sensitive.

- **Demonstrable** (isolated UI, copy, prompts, jobs with no shared contract/effect changes): the
  author self-approves on screenshots/video/representative output plus green CI.
- **Flow-sensitive** (data, shared backend, integrations, auth, billing, security, routing,
  compliance, external effects): `/pr-review` or `<diff-reviewer agent>` on <strongest model> in a
  fresh context, then human verification.

<!-- optional: include if the repo has a single maintainer (one contributor in `git shortlog -sn`) -->
This project has a single maintainer, so there is no second developer to approve. The independent
look comes from an agent review in a fresh context (it has not seen the implementation
reasoning), verified by the maintainer before merge.

Review feedback is limited to material correctness, flow, architecture, security/data/integration
risk, or consequential UX — no nits, style, adjacent refactors or generic "more tests". Agents
return reviews in the conversation; they publish GitHub comments or reviews only with the user's
explicit authorization for that publication, never approve a PR, and never use mutating
`gh api` calls. Sensitive paths for this repo (they force the flow-sensitive lane):
<globs: schema/migrations, auth, billing, api routes, CI, dependency manifests, …>.

## Compliance

<!-- optional: include if the repo has a privacy policy / legal pages / consent banner, a
     `compliance/` or `legal/` folder, or sends user data to third parties (analytics, monitoring) -->
Published legal texts (<path>) make concrete promises to users. Code that contradicts them is a
transparency breach. **Stop and do a compliance check BEFORE implementing** when a change:
1. Sends user data to a third party (analytics, monitoring, any external API).
2. Writes a cookie, `localStorage`, or `sessionStorage` on the user's device.
3. Persists a new field about a person.
4. Adds a new vendor, provider, or subprocessor.
5. Touches consent, telemetry gating, retention, or deletion.
6. Bypasses, weakens, or short-circuits an existing consent gate.

The check: read `<compliance inventory path>`, confirm the change matches what the published
texts say, and if it does not, record the mismatch in `<discrepancies path>` **before**
continuing and raise it with the user — a lawful basis is their decision, not yours.

## Rate limit for public entry points

<!-- optional: include if the repo exposes public entry points an anonymous or authenticated
     caller can hit repeatedly: HTTP route handlers, RPC/mutation endpoints, server actions,
     webhooks, queue-triggered tasks, and any of them reaches a paid external service -->
If a plan adds or changes a **public entry point** (<list the kinds in this repo>), it must
include a **Rate limit** block, one row per entry point, and wait for the decision:

| Function | Who triggers it (UI button / cron / webhook / task) | External cost (provider, job, email) | Proposal (kind, value, key) | User decision |
|---|---|---|---|---|

"No limit" is a valid proposal when the row says why (internal-only, secret-gated, already capped
by a quota). The limit lives in `<rate limiter module>` and is consumed with `<helper>`; the
implementer agents refuse to implement an entry point whose row is missing.

## Verification

- After refactors, run `<lint>`, `<typecheck>` and `<test>` before declaring done.
- When setting up CI/workflows, check the runtime version against the lockfile/engines first.
- **Full circle.** For any change that touches an external service or integration (<list: error
  monitoring, analytics, payments, auth, email, queues, webhooks…>), a webhook/job, or a data
  contract, invoke the `verify-integration` skill. Static checks and mocked tests are not
  verification: trigger the real path in dev/sandbox and confirm the effect on the other side,
  including the failure path.
- **UI.** Before declaring a user-visible change done, check it in the running app and show
  screenshots (desktop 1440 and mobile 375 px at minimum; tablet ~768, each locale and the relevant
  states — empty, loading, error, roles, free vs paid — where reachable). Passing tests alone are
  not verification. If you cannot (no dev server, login blocked, backend not deployed to dev), say
  so explicitly: what was not verified, why, and what only the tests cover. Never imply it was seen.
  <!-- fill with: how to log into the app as a test user (a `local-test-login`-style skill) -->
- **Think ahead.** Before implementing, map what the change affects and how each piece should
  respond (including later steps such as retries, back, plan changes, old data), then compare
  expected vs observed. List in the plan the tools needed to verify; **ask the user for any that
  are missing before implementing**. If they cannot be provided, proceed only with the user's
  explicit OK as an exception and report what went unverified.
- If you add or remove an agent, skill, hook, custom lint rule, CI workflow, test kind or
  architectural rule, update `docs/blueprint.md` in the same change.

### Kill dev processes you start

If a task involves starting a long-running process (`<dev server>`, watchers, a live-preview
server), stop it before considering the task done — the tool's own stop mechanism when one
exists, otherwise `kill`/Ctrl-C. Several parallel workspaces each leaving a dev server running
exhausts the machine.

<!-- optional: include if the repo has secrets in a manager (Infisical, Doppler, 1Password CLI, Vault) -->
### Secrets manager

NEVER run any `<secrets CLI>` command — including read-only ones — without explicit permission
first. State exactly which command and why, and wait for confirmation. It is a shared store and
the user wants visibility into every touch.

## Agents

Three roles. The **orchestrator** (the main session, on <strongest model>) analyses, plans and
decides — it reads the `## Build rules` of each domain agent while planning. **Implementers**
(domain agents, on <mid model>) execute an approved plan from a **Handoff brief**; if the plan
does not fit the code they stop and report instead of redesigning. **Reviewers** (fresh context)
look for what breaks: `plan-reviewer` on the plan, `<diff-reviewer>` / `/pr-review` on the diff —
mandatory for flow-sensitive PRs.

| Agent | Role | Domain |
|---|---|---|
| `<implementer>` | implementer (entry point for <domain>) | <paths/technologies it owns> |
| `<api-reference>` | reference, never an entry point | <framework API syntax questions> |
| `<diff-reviewer>` | reviewer (strongest model) | security/authz/validation review of a diff |
| `plan-reviewer` | reviewer (fresh context) | adversarial review of a big feature's plan before "go" |

**Handoff brief** (what the orchestrator gives an implementer): goal; files and the graph/sweep
results that matter; decisions already taken; rate-limit rows; invariants; what NOT to touch; how
it will be verified. Template: `plan-feature` skill, `references/handoff-brief.md`.

**For any <backend/domain> work you MUST delegate to the `<implementer>` agent — never implement
inline.** <!-- fill with: one such line per domain agent -->

<!-- optional: include if the repo has a schema/database with migrations -->
**Schema deprecations are expand / migrate / contract, and the contract is mandatory:** a plan or
PR that stops using a table or column must open a `Contract: <name>` issue before merge and link it
in the PR body.

## Trim with audit

Before removing content from an agent, skill or rule, read each block's **content** (never decide
by its title) and fill a table — block, keep/remove/rewrite, why. When in doubt, keep. Show the
table before committing, and list every removed block in the PR body. Safe to remove: pasted
vendor docs (docs-first covers them), rules repeated elsewhere (leave a pointer), examples that
use helpers that do not exist.

## Corrections

When the user corrects you, fix it first, then apply the `reflect` skill in the same turn: it
checks whether the correction repeats or states a standing preference and proposes a rule in
`.rulesync/` (or the repo's rules home) or a memory, written only after a yes.
<!-- optional: "A hook (`<path>`) flags corrections" if the tool supports prompt hooks -->

## Codebase navigation

<!-- optional: include if a code-graph tool is set up (graphify, a language server index, ctags…) -->
A local code graph lives at `<path>`. When it exists, `<query command>` is the **first step** of
any non-trivial analysis (multi-module changes, auth/billing, data-flow tracing, unfamiliar areas,
bug hunts) and its result goes into the Handoff brief. The source code is authoritative; if graph
and code disagree, the graph is stale. Never load the whole graph file; pass subagents the
specific results.

## Project structure and commands

<!-- fill with: 5-8 lines of directory map from the real tree; one block of real commands -->
```bash
<dev command>      # start dev server
<build command>    # production build
<lint command>     # lint
<typecheck command> # typecheck
<test command>     # tests
```

<!-- optional: add one short section per project-specific hard rule that cost real time
     (e.g. a native-binary import restriction, a routing registry, a protected-route list).
     State the rule, the failure it prevents, and the enforcing lint/arch test. -->

## Response length

- Chat messages default to 3-5 lines: valuable and complete, but not long. If a fuller
  explanation seems useful, give the short version first and offer to expand.
- Does not apply to: the written plan and its Clarifications, or output formats a skill defines
  (for example `pr-review`, the `verify-integration` final message).
- Code/logic explanations: state the rule + one example, skip walking through every branch.
- Technical explanations: lead with a plain-language summary and a concrete example.
- Avoid fabricating data (ratings, non-existent file references). If unsure, ask or omit.
- When a task is done, end with at most 3 concrete next steps, one line each, only if real ones
  exist (no filler). They count inside the 3-5 lines.
